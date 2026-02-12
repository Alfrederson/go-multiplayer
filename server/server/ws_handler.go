package server

import (
	"log"
	"net/http"

	"github.com/Alfrederson/backend_game/entities"
	fb "github.com/Alfrederson/backend_game/firebase"
	"github.com/Alfrederson/backend_game/pecas"
	"github.com/gin-gonic/gin"
	"github.com/gobwas/ws"
)

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
				Id: player_id,
				Status: entities.PlayerStatus{
					CurrentMap: "cidade",
					X:          512,
					Y:          262,
				},
				Bag: entities.Bag{
					MaxItemCount: 10,
					MaxWeight:    15000,
					Items:        make([]entities.Item, 0),
					ItemIds:      make([]entities.ItemId, 0),
				},
			},
			Link:     link,
			ByteSink: make(chan []byte),
		}

		// Se esse Load() falhar (porque a pessoa nunca jogou), então prevalecem as configurações iniciais do jogador
		// i.e: surge no lobby, sem dinheiro, com uma mochila que comporta 10 coisas ou 15kg
		if p := &link.Value.Player; p.Id == "ghost" {
			p.Status.BecomeGhost()
		} else {
			p.Load()
		}
		go s.StartSession(link.Value)
	}
}
