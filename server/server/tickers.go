package server

import (
	"log"
	"time"
)

func (s *Server) AddTicker(name string, t Ticker) {
	log.Printf("adicionando ticker %s\n", name)
	_, existe := s.tickers[name]
	if existe {
		log.Println("[WARN] tentando adicionar um ticker mais de uma vez")
		return
	}
	s.tickers[name] = t
}

func (s *Server) RemoveTicker(name string) {
	delete(s.tickers, name)
}

// o que acontece se um anterior não tiver rodando?
func (s *Server) RunTickers() {
	log.Println("rodando tickers...")
	go func() {
		for <-s.ticker_queue {
			for _, ticker := range s.tickers {
				go ticker(s)
			}
		}
	}()
}

func (s *Server) StartTickers() {
	s.tickers_running = true
	// acho que não precisa dessa peripécia toda...
	go func() {
		for {
			if !s.tickers_running {
				log.Println("tickers não estão rodando")
				return
			}
			s.ticker_queue <- true
			time.Sleep(time.Millisecond * 500)
		}
	}()
	s.RunTickers()
}

func (s *Server) StopTickers() {
	s.tickers_running = false
}
