package lista

import "log"

// uma lista de PONTEIROS
// não tentar usar para colocar "valores primitivos" porque não vai dar certo
// a ideia é ter uma lista de links pré-alocados e utilizá-los como spots
// para as conexões dos jogadores

type Link[T any] struct {
	prev, next *Link[T]
	list       *List[T]
	Value      *T
}

func (l *Link[T]) Set(val *T) *Link[T] {
	l.Value = val
	return l
}

type List[T any] struct {
	head, tail *Link[T]
	size       int
}

func (l *List[T]) Size() int {
	return l.size
}

func (l *List[T]) AddLink(link *Link[T]) {
	link.list = l
	if l.head == nil && l.tail == nil {
		l.head = link
		l.tail = link
		l.size = 1
		return
	}
	l.tail.next = link
	link.prev = l.tail
	l.tail = link
	l.size++
}

func (l *List[T]) RemoveLink(link *Link[T]) error {
	if link.list != l {
		panic("elo não pertence a esta lista")
	}
	prev := link.prev
	next := link.next
	link.prev = nil
	link.next = nil
	if prev != nil {
		prev.next = next
	}
	if next != nil {
		next.prev = prev
	}
	l.size--
	return nil
}

func (l *List[T]) TakeLink() (*Link[T], error) {
	if l.size == 0 {
		panic("tentando tirar elo de lista vazia")
	}
	link := l.tail
	prev := link.prev

	l.tail = prev
	l.tail.next = nil

	link.prev = nil
	link.next = nil
	link.list = nil

	l.size--

	return link, nil
}

func (l *List[T]) ForEach(fun func(*T, int)) {
	var link *Link[T]
	var i int = 0
	for link = l.head; link != nil; link = link.next {
		fun(link.Value, i)
		i++
	}
}

func NewLink[T any](value *T) *Link[T] {
	return &Link[T]{
		prev:  nil,
		next:  nil,
		Value: value,
	}
}

func NewList[T any]() List[T] {
	log.Println("lista alocada")
	return List[T]{}
}
