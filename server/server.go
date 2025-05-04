package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"sync"

	"github.com/Alfrederson/backend_game/entities"
	"github.com/Alfrederson/backend_game/fb"
	"github.com/Alfrederson/backend_game/pecas"
	"github.com/gin-gonic/gin"
	"github.com/gobwas/ws"
	"github.com/gobwas/ws/wsutil"
)

type Client struct {
	entities.Player
	Spot       int
	Connection net.Conn
	Active     bool
	Link       *pecas.Link[Client]
}

// um mapa tem:
//   - nome
//   - largura, altura
//   - (largura/20) * (altura/20) células
//   - quando uma mensagem é publicada, ela é enviada
//   - a todas as células próximas à célula de origem

type ServerMap struct {
	entities.GameMap
	ActiveClients pecas.List[Client]
}

type Server struct {
	TotalPlayers int
	MaxPlayers   int

	mutex sync.Mutex

	player_by_id map[string]*entities.Player
	maps         map[string]*ServerMap

	free_spots   pecas.Stack[int]
	free_clients pecas.List[Client]
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

func (s *Server) Send(to *Client, message byte, data ...[]byte) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	wsutil.WriteServerBinary((*to).Connection, construct_message(message, data...))
}

func (s *Server) ChangeClientRoom(client *Client, to_room string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.maps[(*client).CurrentMap].ActiveClients.RemoveLink((*client).Link)
	(*client).CurrentMap = to_room
	s.maps[(*client).CurrentMap].ActiveClients.AddLink((*client).Link)
}

func int_abs(val int) int {
	if val < 0 {
		return -val
	} else {
		return val
	}
}

// envia uma mensagem para todos os clientes em um mapa
func (s *Server) Mapcast(mapname string, from *Client, x int, y int, message byte, data ...[]byte) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	msg := construct_message(message, data...)
	s.maps[mapname].ActiveClients.ForEach(func(c *Client) {
		if c.CurrentMap != mapname {
			fmt.Printf(" EEEPA! mensagem para %s chegando em %s!\n", mapname, c.CurrentMap)
			return
		}
		if ((from != nil && (c.Connection != from.Connection)) || from == nil) && c.Active {
			// não repassa para quem estiver longe...
			if int_abs(x-c.X) > 320 ||
				int_abs(y-c.Y) > 320 {
				return
			}
			wsutil.WriteServerBinary((*c).Connection, msg)
		}
	})
}

// Envia uma mensagem a todos os clientes conectados em todos os mapas
func (s *Server) Broadcast(from *Client, message byte, data ...[]byte) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	msg := construct_message(message, data...)
	for _, this_map := range s.maps {
		if this_map.ActiveClients.Size() == 0 {
			continue
		}
		this_map.ActiveClients.ForEach(func(c *Client) {
			if ((from != nil && ((*c).Connection != (*from).Connection)) || from == nil) && (*c).Active {
				wsutil.WriteServerBinary((*c).Connection, msg)
			}
		})
	}
}

// 2- O servidor aceita conexões de websocket
func (s *Server) GetWSHandler() func(c *gin.Context) {

	s.player_by_id = make(map[string]*entities.Player)
	s.free_clients = pecas.NewList[Client]()
	s.free_spots = pecas.NewStack[int](s.MaxPlayers)

	// na hora que eu fiz isso a ideia era ter um pool
	// de clientes em branco para ficar reusando sem
	// alocar/realocar o struct do Client em si
	for i := 0; i < s.MaxPlayers; i++ {
		s.free_clients.AddLink(
			pecas.NewLink[Client](&Client{}),
		)
		s.free_spots.Push(i)
	}

	return func(c *gin.Context) {
		player_id := "ghost"
		token := c.Query("token")

		fb_token, err := fb.ValidarToken(token)
		if err != nil {
			log.Printf("validação do token falhou: %v\n", err)
		} else {
			player_id = fb_token.UID
		}

		log.Printf("(%.6s) tentando entrar\n", player_id)
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
			c.JSON(http.StatusInternalServerError, "server is full")
			return
		}
		id, _ := s.free_spots.Pop()

		/*
					          _ valor _
			                 |         v
						[ link ]  [client]
			                 ^          |
							 |___ link _|
		*/

		// todo: a gente vai tirar o ID do jogador de dentro do usuário autenticado
		//       e carregar as coisas dele
		*link.Value = Client{
			Active:     true,
			Connection: conn,
			Spot:       id,
			Player: entities.Player{
				CurrentMap: "cidade",
				Id:         player_id,
				X:          512,
				Y:          262,
				Bag: entities.Bag{
					MaxItems:  10,
					MaxWeight: 15000,
				},
			},
			Link: link,
		}

		// Se esse Load() falhar (porque a pessoa nunca jogou), então prevalecem as configurações iniciais do jogador
		// i.e: surge no lobby, sem dinheiro, com uma mochila que comporta 10 coisas ou 15kg
		if p := link.Value.Player; p.Id == "ghost" {
			p.BecomeGhost()
		} else {
			p.Load()
		}
		go s.StartSession(link.Value)
	}
}
