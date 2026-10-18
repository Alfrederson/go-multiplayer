package server

import (
	"fmt"
	"log"

	"github.com/Alfrederson/backend_game/entities"
	"github.com/Alfrederson/backend_game/pecas"
)

type MapInstance struct {
	*entities.GameMap
	X int
	Y int
}

type Room struct {
	Name string
	Maps pecas.List[MapInstance]

	Objects       pecas.List[GameObject]
	ActiveClients pecas.List[Client]
}

func (r *Room) GetMaps() *pecas.List[MapInstance] {
	return &r.Maps
}

// pega toda a lista de mapas e modificações e transforma em um só mapa
func (r *Room) ComputeTilemap() {
	log.Println("computando tilemap...")
}

// pega todos os mapas e cria um mapa de colisão
func (r *Room) ComputeCollisionMap() {
	log.Println("computando collision map...")
}

func (r *Room) GetTicker() (string, Ticker) {
	return fmt.Sprintf("ticker_%s", r.Name), func(s *Server) {
		r.Objects.ForEach(func(obj *GameObject) {
			// a gente vai definir os Tick dos obj como sendo
			// scripts de Lua
			(*obj).Tick(&TickContext{
				Server:          s,
				Room:            r,
				ScriptingEngine: &s.ScriptingEngine,
			})
		})
	}
}
