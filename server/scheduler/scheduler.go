package scheduler

import (
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"github.com/arnodel/golua/runtime"
)

type EventID uint64

type Event struct {
	ID     EventID
	Values []runtime.Value
	Err    error
}

type Coroutine struct {
	ID        EventID
	Name      string
	Thread    *runtime.Thread
	Fn        runtime.Callable
	ThisTable *runtime.Table
}

type Scheduler struct {
	rt                *runtime.Runtime
	nextID            atomic.Uint64
	mu                sync.Mutex
	run_queue         chan *Coroutine
	waiting           map[EventID]*Coroutine
	events            chan Event
	stop              chan struct{}
	current_coroutine *Coroutine
}

func NewScheduler(rt *runtime.Runtime) *Scheduler {
	return &Scheduler{
		rt:        rt,
		run_queue: make(chan *Coroutine),
		waiting:   make(map[EventID]*Coroutine),
		events:    make(chan Event, 64),
		stop:      make(chan struct{}),
	}
}

func (s *Scheduler) Start() {
	log.Println("ligando scheduler")
	go s.run()
}

// func (s *Scheduler) handle_event(event Event) {
// 	s.mu.Lock()
// 	coro, ok := s.waiting[event.ID]
// 	if ok {
// 		delete(s.waiting, event.ID)
// 	}
// 	s.mu.Unlock()
// 	if !ok {
// 		log.Println("evento chegou depois que a corrotina foi removida")
// 		return
// 	}
// 	s.resume(coro, event)
// }

func (s *Scheduler) run_coroutine(coro *Coroutine) {
	s.current_coroutine = coro

	switch coro.Thread.Status() {
	case runtime.ThreadSuspended:
		coro.Thread.GlobalEnv().Set(
			runtime.StringValue("self"),
			runtime.TableValue(coro.ThisTable),
		)
		_, err := coro.Thread.Resume(s.rt.MainThread(), nil)
		if err != nil {
			fmt.Printf("script %s quebrou: %v\n", coro.Name, err)
			return
		}
	case runtime.ThreadDead:
		log.Printf("%s finalizada", coro.Name)
	default:
		log.Printf("%s em estado inesperado %v", coro.Name, coro.Thread.Status())
	}

}

// func (s *Scheduler) resume(coro *Coroutine, event Event) {
// 	s.current_corountine = coro
// 	values, err := coro.Thread.Resume(s.rt.MainThread(), event.Values)
// 	if err != nil {
// 		fmt.Printf("script %s quebrou: %v\n", coro.Name, err)
// 		return
// 	}
// 	_ = values
// 	switch coro.Thread.Status() {
// 	case runtime.ThreadSuspended:
// 		log.Println("corrotina esperando alguma coisa")
// 	case runtime.ThreadDead:
// 		log.Println("corrotina morta?")
// 	default:
// 		log.Println("nem sei, bicho")
// 	}
// }

// pausa uma corrotina e retorna o EventID que deve ser usado para
// resumi-la
func (s *Scheduler) wait(coro *Coroutine) EventID {
	id := s.new_event_id()
	coro.ID = id
	s.mu.Lock()
	s.waiting[id] = coro
	s.mu.Unlock()
	return id
}

func (s *Scheduler) Resolve(id EventID, values ...runtime.Value) {
	s.events <- Event{ID: id, Values: values}
}

func (s *Scheduler) Reject(id EventID, err error) {
	s.events <- Event{ID: id, Err: err}
}

// pausa a corrotina atual por x segundos.
// para ser usada dentro de um script
func (s *Scheduler) SleepCurrentCoroutine(duration float64) {
	if s.current_coroutine == nil {
		log.Println("tentando pausar sem uma coroutine")
		return
	}
	// log.Printf("yield %s  , status = %v\n", s.current_coroutine.Name, s.current_coroutine.Thread.Status())
	to_resume := s.current_coroutine

	// defer log.Printf("corrotina %s pausada. %d\n", s.current_coroutine.Name, to_resume.Thread.Status())
	time.AfterFunc(time.Duration(duration*float64(time.Second)), func() {
		// log.Println("mandando a corrotina para a fila de execução")
		//s.Resolve(id)
		s.run_queue <- to_resume
	})
	to_resume.Thread.Yield(nil)
}

// func (s *Scheduler) Sleep(coro *Coroutine, duration time.Duration) EventID {
// 	id := s.wait(coro)
// 	time.AfterFunc(duration, func() {
// 		s.Resolve(id)
// 	})
// 	return id
// }

// Cria uma corrotina a patir de um callable e coloca ela na fila do agendador
// ela pode ser suspensa caso tenha um sleep ou coisa assim
func (s *Scheduler) StartCoroutine(name string, fn runtime.Callable, this_table *runtime.Table) *Coroutine {
	thread := runtime.NewThread(s.rt)
	coro := &Coroutine{
		Name:      name,
		Thread:    thread,
		Fn:        fn,
		ThisTable: this_table,
	}
	thread.Start(fn)
	s.run_queue <- coro
	return coro
}

func (s *Scheduler) new_event_id() EventID {
	return EventID(s.nextID.Add(1))
}

func (s *Scheduler) run() {
	log.Println(s.rt.MainThread().Status())
	for {
		select {
		case coro := <-s.run_queue:

			s.run_coroutine(coro)
		// case event := <-s.events:
		// 	s.handle_event(event)
		case <-s.stop:
			return
		}
	}
}
