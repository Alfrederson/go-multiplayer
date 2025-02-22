package main

import (
	"log"
	"net"
	"sync"

	"github.com/Alfrederson/backend_game/lista"
	"github.com/gin-gonic/gin"
	"github.com/gobwas/ws"
	"github.com/gobwas/ws/wsutil"
)

const (
	// mensagens enviadas pelo servidor
	MSG_SERVER_SETID            = iota + 1 // define o ID do cliente
	MSG_SERVER_PLAYER_JOINED               // quando algum jogador entrou
	MSG_SERVER_PLAYER_EXITED               // quando algum jogador saiu
	MSG_SERVER_PLAYER_SET_MAP              // quando o jogador troca de mapa, do servidor para o cliente
	MSG_SERVER_PLAYER_SET_CELL             // quando o jogador troca de célula, do servidor par ao cliente
	MSG_SERVER_PLAYER_PEER_LIST            // servidor diz para o cliente quem são os jogadores próximos

	// mensagens enviadas pelo jogador
	MSG_PLAYER_HEART     // enviada em inatividade para manter a conexão aberta
	MSG_PLAYER_STATUS    // enviada sempre que o jogador se move, ou periodicamente
	MSG_PLAYER_ENTER_MAP // enviada quando um jogador quer entrar em um mapa diferente
)

type Message struct {
	bytes []byte
}

func (m *Message) IsServerMessage() bool {
	return m.bytes[0] >= MSG_SERVER_SETID && m.bytes[0] <= MSG_SERVER_PLAYER_EXITED
}
func (m *Message) MessageByte() byte {
	return m.bytes[0]
}
func (m *Message) GetInt16(pos int) int {
	return (int(m.bytes[pos]) << 8) | int(m.bytes[pos+1])
}

type Player struct {
	Id         int    `json:"id"`
	PlayerName string `json:"player_name"`
	X          int    `json:"x"`
	Y          int    `json:"y"`
}

type Client struct {
	Player
	Id         int
	Connection net.Conn
	Active     bool
}

func get_int16(bytes []byte, pos int) int {
	return (int(bytes[pos]) << 8) | int(bytes[pos+1])
}

// um mapa tem:
//   - nome
//   - largura, altura
//   - (largura/20) * (altura/20) células
//   - quando uma mensagem é publicada, ela é enviada
//   - a todas as células próximas à célula de origem

type Server struct {
	TotalPlayers int
	MaxPlayers   int

	mutex         sync.Mutex
	message_count int

	free_spots Stack[int]

	free_clients   lista.List[Client]
	active_clients lista.List[Client]
}

type ServerStatus struct {
	TotalPlayers     int `json:"total_players"`
	FreeSpots        int `json:"free_spots"`
	MessagesPerSecon int `json:"messages_per_second"`
}

func (s *Server) Status() ServerStatus {
	return ServerStatus{
		TotalPlayers: s.active_clients.Size(),
		FreeSpots:    s.free_clients.Size(),
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
	s.active_clients.ForEach(func(c *Client, i int) {
		if ((from != nil && (c.Connection != from.Connection)) || from == nil) && c.Active {
			wsutil.WriteServerBinary(c.Connection, message)
		}
	})
}

func (s *Server) StartSession(client_link *lista.Link[Client]) {
	client := client_link.Value
	id_h := byte((client.Id >> 8) & 0xFF)
	id_l := byte(client.Id & 0xFF)

	log.Printf("cliente pegou o spot %d", client.Id)

	defer func() {
		s.mutex.Lock()
		defer s.mutex.Unlock()

		// libera o ID
		s.free_spots.Push(client.Id)
		log.Printf("spot %d agora está livre", client.Id)

		// fecha a conexão
		client.Connection.Close()

		// reseta o cliente
		*client = Client{
			Connection: nil,
			Active:     false,
			Id:         0,
		}

		// retorna o cliente para o pool
		s.active_clients.RemoveLink(client_link)
		s.free_clients.AddLink(client_link)
		// libera o id

		// notifica os outros jogadores de que este aqui saiu
		s.Broadcast(client, []byte{MSG_SERVER_PLAYER_EXITED, id_h, id_l})
	}()

	// diz par ao jogador qual é o ID dele
	s.Send(client, []byte{MSG_SERVER_SETID, id_h, id_l})

	// diz para o jogador quem são os outros jogadores que estão lá
	// (esse é difícil)

	// envia a mensagem de que o jogador entrou
	s.Broadcast(nil, []byte{
		MSG_SERVER_PLAYER_JOINED,
		id_h,
		id_l,
	})

	// coloca na lista de clientes ativos
	s.active_clients.AddLink(client_link)

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

		message := Message{bytes: msg}

		// não sei se faz sentido fazer isso
		if message.IsServerMessage() {
			continue
		}

		// faz algumas interpretações
		switch message.MessageByte() {

		case MSG_PLAYER_STATUS:
			// descarta
			if len(msg) < 7 {
				continue
			}
			client.Player.X = message.GetInt16(1)
			client.Player.Y = message.GetInt16(3)
			// a gente vai ter um sistema de células
			// se a pessoa se move, só quem está na mesma célula
			// que a pessoa está vai ver a pessoa
			// quando a pessoa sai de uma célula para a outra, o servidor
			// manda a mensagem que indica quem está
			// naquela célula
			// a gente também vai usar os portais definidos no mapa
			// pra decidir para qual outro mapa a pessoa teletransporta
		}

		// replica para os outros clientes
		s.Broadcast(client, message.bytes)
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

	s.free_clients = lista.NewList[Client]()
	s.free_spots = NewStack[int](s.MaxPlayers)

	for i := 0; i < s.MaxPlayers; i++ {
		link := lista.NewLink(&Client{
			Id:         0,
			Connection: nil,
			Active:     false,
		})
		s.free_clients.AddLink(link)
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

		link, error := s.free_clients.TakeLink()
		log.Printf("agora tem %d clientes disponíveis", s.free_clients.Size())
		if error != nil {
			log.Println(error)
			c.JSON(429, "server is full")
			return
		}
		id, _ := s.free_spots.Pop()
		*link.Value = Client{
			Active:     true,
			Connection: conn,
			Id:         id,
		}
		go s.StartSession(link)
	}
}
