package main

import (
	"fmt"
	"log"
	"net"
	"sync"

	"github.com/Alfrederson/backend_game/entities"
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

	maps map[string]*ServerMap

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

func (s *Server) ChangeClientRoom(client *Client, client_link *pecas.Link[Client], to_room string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.maps[(*client).CurrentMap].ActiveClients.RemoveLink(client_link)
	(*client).CurrentMap = to_room
	s.maps[(*client).CurrentMap].ActiveClients.AddLink(client_link)
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

func (s *Server) StartSession(client_link *pecas.Link[Client]) {
	client := client_link.Value
	id_bytes := i16(client.Spot)

	log.Printf("cliente pegou o spot %d", client.Spot)

	defer func() {
		// notifica os outros jogadores de que este aqui saiu
		s.Mapcast(client.CurrentMap, client, client.X, client.Y, MSG_SERVER_PLAYER_EXITED, id_bytes)

		s.mutex.Lock()
		defer s.mutex.Unlock()

		// libera o ID
		s.free_spots.Push(client.Spot)
		log.Printf("spot %d agora está livre", client.Spot)

		// fecha a conexão
		(*client).Connection.Close()

		// tira o cliente do mapa em que ele está
		log.Println("removendo o cliente de ", client.CurrentMap)
		s.maps[(*client).CurrentMap].ActiveClients.RemoveLink(client_link)

		// retorna para o pool
		s.free_clients.AddLink(client_link)

		// persiste o jogador
		client.Player.Save()

		// reseta o cliente
		*client = Client{}
	}()

	log.Println("botando o cliente na sala ", client.CurrentMap)

	s.maps[client.CurrentMap].ActiveClients.AddLink(client_link)

	// diz par ao jogador qual é o ID dele
	s.Send(client, MSG_SERVER_SETID, id_bytes)
	// diz para o jogador quem são os outros jogadores que estão lá
	// (esse é difícil)

	// manda o jogador entrar em um mapa
	s.Send(client, MSG_SERVER_PLAYER_SET_MAP, short_str_to_byte_array(client.CurrentMap), i16(client.X), i16(client.Y))

	// Notifica os outros do mapa que ele entrou...
	log.Println("notificando que o jogador entrou")
	s.Mapcast(client.CurrentMap, client, client.X, client.Y, MSG_SERVER_PLAYER_JOINED, id_bytes)

	// estatísticas
	for {
		// o segundo valor é op
		msg, op, err := wsutil.ReadClientData(client.Connection)
		if err != nil {
			log.Println("erro de leitura ", op, err)
			break
		}

		// descarta a mensagem se for menor do que a mínima
		if len(msg) < 3 {
			continue
		}

		// identifica a mensagem
		msg[1] = id_bytes[0]
		msg[2] = id_bytes[1]

		message := Message{bytes: msg}

		// jogador tentando enviar uma mensagem de servidor
		if message.IsServerMessage() {
			continue
		}

		// faz algumas interpretações
		msg_byte := message.TakeInt8()
		message.Skip(2) // bytes do ID
		switch msg_byte {

		case MSG_PLAYER_STATUS:
			{
				// tamanho fixo é mais fácil de fazer isso.
				if len(msg) < 7 {
					continue
				}
				client.Player.X = message.TakeInt16()
				client.Player.Y = message.TakeInt16()
				// a gente vai ter um sistema de células
				// se a pessoa se move, só quem está na mesma célula
				// que a pessoa está vai ver a pessoa
				// quando a pessoa sai de uma célula para a outra, o servidor
				// manda a mensagem que indica quem está
				// naquela célula
				// a gente também vai usar os portais definidos no mapa
				// pra decidir para qual outro mapa a pessoa teletransporta
				s.Mapcast(client.CurrentMap, client, client.X, client.Y, message.MessageByte(), message.bytes[1:])
			}
		case MSG_PLAYER_CHAT:
			{
				chat, err := message.TakeShortString()
				if err != nil {
					continue
				}
				fmt.Printf("%d > %s\n", client.Spot, chat)
				s.Mapcast(client.CurrentMap, nil, client.X, client.Y, message.MessageByte(), message.bytes[1:])
			}
		// na verdade isso vai ser uma mensagem "PLAYER_USE_PORTAL"
		// e eu vou checar se o jogador está mesmo perto do portal
		case MSG_PLAYER_ENTER_MAP:
			{
				map_name, err := message.TakeShortString()
				if err != nil {
					log.Println("lendo o mapa:", err)
					continue
				}
				target_zone, err := message.TakeShortString()
				if err != nil {
					log.Println("lendo a zona:", err)
					continue
				}
				mapa, existe := s.maps[map_name]
				if !existe {
					fmt.Printf("jogador tentando ir para mapa inexistente %s ", map_name)
					break
				}
				portal, existe := mapa.Zones[target_zone]
				if !existe {
					fmt.Printf("jogador tentando ir para portal inexistente %s ", target_zone)
				}
				old_map := client.CurrentMap
				x, y := portal.PickPointForRect(14, 14)
				log.Printf("jogador %d => %s.%s (%d,%d)", client.Spot, map_name, target_zone, x, y)

				s.Mapcast(old_map, client, client.X, client.Y, MSG_SERVER_PLAYER_EXITED, id_bytes)

				s.ChangeClientRoom(client, client_link, map_name)
				s.Send(client, MSG_SERVER_PLAYER_SET_MAP, short_str_to_byte_array(map_name), i16(x), i16(y))
			}
		}
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

	s.free_clients = pecas.NewList[Client]()
	s.free_spots = pecas.NewStack[int](s.MaxPlayers)

	for i := 0; i < s.MaxPlayers; i++ {
		link := pecas.NewLink(&Client{
			Spot:       0,
			Connection: nil,
			Active:     false,
		})
		s.free_clients.AddLink(link)
		s.free_spots.Push(i)
	}

	return func(c *gin.Context) {
		log.Println("alguém está tentando entrar!")
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

		// todo: a gente vai tirar o ID do jogador de dentro do usuário autenticado
		//       e carregar as coisas dele
		*link.Value = Client{
			Active:     true,
			Connection: conn,
			Spot:       id,
			Player: entities.Player{
				CurrentMap: "cidade",
				Id:         123,
				X:          512,
				Y:          262,
				Bag: entities.Bag{
					MaxItems:  10,
					MaxWeight: 15000,
				},
			},
		}
		link.Value.Player.Load()
		link.Value.Bag.Add(entities.Maca{})
		link.Value.Bag.Add(entities.Sementes{Planta: "macieira"})

		go s.StartSession(link)
	}
}
