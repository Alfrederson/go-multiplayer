package main

import (
	"log"
	"net"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gobwas/ws"
	"github.com/gobwas/ws/wsutil"
)

const (
	MSG_SERVER_SETID = 0x01

	MSG_PLAYER_JOINED = 0x02
	MSG_PLAYER_EXITED = 0x03
	MSG_PLAYER_STATUS = 0x04
)

type Client struct {
	Id         int
	Connection net.Conn
	Active     bool
}

type Server struct {
	TotalPlayers int
	MaxPlayers   int

	mutex         sync.Mutex
	message_count int

	clients    []*Client
	free_spots Stack[int]
}

type ServerStatus struct {
	TotalPlayers     int `json:"total_players"`
	MaxPlayers       int `json:"max_players"`
	MessagesPerSecon int `json:"messages_per_second"`
}

func (s *Server) Status() ServerStatus {
	return ServerStatus{
		TotalPlayers: s.TotalPlayers,
		MaxPlayers:   s.MaxPlayers,
	}
}

func (s *Server) increaseMessageCount(count int) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.message_count += count
}

func (s *Server) Send(to *Client, message []byte) {
	wsutil.WriteServerBinary(to.Connection, message)
}

func (s *Server) Broadcast(from *Client, message []byte) {
	for _, other_client := range s.clients {
		if other_client == nil {
			continue
		}
		if (from != nil && (other_client.Connection != from.Connection)) && other_client.Active {
			wsutil.WriteServerBinary(other_client.Connection, message)
		}
	}
}

func (s *Server) AddClient(client *Client) {
	defer client.Connection.Close()
	s.clients[client.Id] = client
	id_h := byte((client.Id >> 8) & 0xFF)
	id_l := byte(client.Id & 0xFF)
	log.Printf("cliente pegou o spot %d", client.Id)

	s.TotalPlayers++

	defer func() {
		client.Active = false
		log.Printf("spot %d agora está livre", client.Id)
		// devolve o spot dele pra lista
		s.mutex.Lock()
		defer s.mutex.Unlock()
		s.clients[client.Id] = nil
		s.TotalPlayers--
		s.free_spots.Push(client.Id)
	}()

	// diz par ao jogador qual é o ID dele
	s.Send(client, []byte{
		MSG_SERVER_SETID,
		id_h,
		id_l,
	})

	// envia a mensagem de que o jogador entrou
	s.Broadcast(nil, []byte{
		MSG_PLAYER_JOINED,
		id_h,
		id_l,
	})
	// envia uma mensagem quando o jogador tiver saído
	defer s.Broadcast(client, []byte{
		MSG_PLAYER_EXITED,
		id_h,
		id_l,
	})

	// estatísticas
	messages_received := 0
	for {
		// o segundo valor é op
		msg, op, err := wsutil.ReadClientData(client.Connection)
		if err != nil {
			log.Println("erro de leitura ", op, err)
			break
		}

		messages_received++
		if messages_received > 10 {
			s.increaseMessageCount(messages_received)
			messages_received = 0
		}

		// descarta a mensagem se for menor do que a mínima
		if len(msg) < 3 {
			continue
		}

		// identifica a mensagem
		msg[1] = id_h
		msg[2] = id_l

		// faz algumas interpretações
		switch msg[0] {

		case MSG_PLAYER_STATUS:
			// descarta
			if len(msg) < 7 {
				log.Println("descartada: ", msg)
				continue
			}
			// player_x := (int(msg[1]) << 8) | int(msg[2])
			// player_y := (int(msg[3]) << 8) | int(msg[4])
			// // posiciona o player
			// if player_x < 0 || player_y < 0 {
			// 	log.Println("jogador saindo das estribeiras")
			// }
		}

		// replica para os outros clientes
		s.Broadcast(client, msg)

	}
}

// a mensagem que o cliente recebe tem esse formato:
//
// 0 1    | 0 1            |  0 1  | 0 1
// tipo   | id do jogador  |    x  |   y

// a mensagem que o cliente envia tem esse formato:
//
// 0 1  | 0 1 | 0 1
// tipo |   x |   y

// 2- O servidor aceita conexões de websocket
func (s *Server) GetWSHandler() func(c *gin.Context) {

	s.clients = make([]*Client, s.MaxPlayers)

	s.free_spots = NewStack[int](s.MaxPlayers)
	for i := s.MaxPlayers - 1; i >= 0; i-- {
		s.free_spots.Push(i)
	}

	return func(c *gin.Context) {
		conn, _, _, err := ws.UpgradeHTTP(c.Request, c.Writer)
		if err != nil {
			log.Println("não consegui fazer o upgrade da conexão: ", err)
			return
		}

		s.mutex.Lock()
		defer s.mutex.Unlock()

		if s.free_spots.Empty() {
			c.JSON(429, "server is full")
			return
		}
		id, _ := s.free_spots.Pop()

		client := Client{
			Id:         id,
			Connection: conn,
			Active:     true,
		}

		go s.AddClient(&client)
	}
}
