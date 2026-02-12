package server

import (
	"fmt"
	"log"
	"sync"

	"github.com/Alfrederson/backend_game/autotilemap"
	"github.com/Alfrederson/backend_game/entities"
	"github.com/Alfrederson/backend_game/msg"
	"github.com/Alfrederson/backend_game/pecas"
	"github.com/gobwas/ws/wsutil"
)

// um mapa tem:
//   - nome
//   - largura, altura
//   - (largura/20) * (altura/20) células
//   - quando uma mensagem é publicada, ela é enviada
//   - a todas as células próximas à célula de origem

type MessageHandler func(RemoteMessageContext)

type Server struct {
	TotalPlayers int
	MaxPlayers   int

	mutex sync.Mutex

	// índices, caches gerais, etc.
	player_by_id map[string]*entities.Player
	tilesets     map[string]*autotilemap.Tileset

	// eu tenho SALAS, não tenho mapas
	maps map[string]*Room

	free_spots   pecas.Stack[int]
	free_clients pecas.List[Client]

	message_handlers []MessageHandler
}

func (s *Server) SetMessageHandler(msg_byte int, handler MessageHandler) {
	if s.message_handlers == nil {
		s.message_handlers = make([]MessageHandler, msg_byte+1)
	} else {
		// array é melhor que map......
		for {
			current_size := len(s.message_handlers)
			if msg_byte >= current_size {
				current_size *= 2
				new_slice := make([]MessageHandler, current_size)
				copy(new_slice, s.message_handlers)
				s.message_handlers = new_slice
				log.Println("current size is now ", current_size)
			} else {
				break
			}
		}
	}
	log.Println("setting handler for message ", msg_byte)
	s.message_handlers[msg_byte] = handler
}

type ServerStatus struct {
	TotalPlayers int            `json:"total_players"`
	FreeSpots    int            `json:"free_spots"`
	Population   map[string]int `json:"population"`
}

func (s *Server) Status() ServerStatus {
	population := make(map[string]int)
	for name, value := range s.maps {
		population[name] = value.ActiveClients.Size()
	}
	return ServerStatus{
		TotalPlayers: s.MaxPlayers - s.free_clients.Size(),
		FreeSpots:    s.free_clients.Size(),
		Population:   population,
	}
}

func (s *Server) WsWriteBytes(to *Client, bytes []byte) error {
	return wsutil.WriteServerBinary(to.Connection, bytes)
}

func (s *Server) ChangeClientRoom(client *Client, to_room string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.maps[(*client).Status.CurrentMap].ActiveClients.RemoveLink((*client).Link)
	(*client).Status.CurrentMap = to_room
	s.maps[(*client).Status.CurrentMap].ActiveClients.AddLink((*client).Link)
}

func int_abs(val int) int {
	if val < 0 {
		return -val
	} else {
		return val
	}
}

func (s *Server) MapcastBytes(mapname string, from *Client, x int, y int, data []byte) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.maps[mapname].ActiveClients.ForEach(func(c *Client) {
		// isso não é para acontecer nunca...
		if c.Status.CurrentMap != mapname {
			fmt.Printf("mensagem para o mapa %s chegando em cliente que está em %s", mapname, c.Status.CurrentMap)
			return
		}
		if ((from != nil && (c.Connection != from.Connection)) || from == nil) && c.Active {
			// não repassa para quem estiver longe...
			// TODO: fazer isso baseado no tamanho da célula do mapa (ex: 16x16 tiles, etc)
			if int_abs(x-c.Status.X) > 320 ||
				int_abs(y-c.Status.Y) > 320 {
				return
			}
			c.SendBytes(data)
		}
	})
}

// envia uma mensagem para todos os clientes em um mapa
func (s *Server) Mapcast(mapname string, from *Client, x int, y int, message byte, data ...[]byte) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	byte_message := msg.ConstructByteBuffer(message, data...)
	s.maps[mapname].ActiveClients.ForEach(func(c *Client) {
		if c.Status.CurrentMap != mapname {
			fmt.Printf(" EEEPA! mensagem para %s chegando em %s!\n", mapname, c.Status.CurrentMap)
			return
		}
		if ((from != nil && (c.Connection != from.Connection)) || from == nil) && c.Active {
			// não repassa para quem estiver longe...
			if int_abs(x-c.Status.X) > 320 ||
				int_abs(y-c.Status.Y) > 320 {
				return
			}
			c.SendBytes(byte_message)
		}
	})
}

// Envia uma mensagem a todos os clientes conectados em todos os mapas
func (s *Server) Broadcast(from *Client, message byte, data ...[]byte) {
	// talvez não precise disso aqui se o processo de tirar o cliente da sala e botar em outra for sincronizado...
	s.mutex.Lock()
	defer s.mutex.Unlock()
	new_msg := msg.ConstructByteBuffer(message, data...)
	for _, this_map := range s.maps {
		if this_map.ActiveClients.Size() == 0 {
			continue
		}
		this_map.ActiveClients.ForEach(func(c *Client) {
			if ((from != nil && ((*c).Connection != (*from).Connection)) || from == nil) && (*c).Active {
				(*c).ByteSink <- new_msg
			}
		})
	}
}
