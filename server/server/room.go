package server

import (
	"fmt"
	"log"

	"github.com/Alfrederson/backend_game/entities"
	msghelper "github.com/Alfrederson/backend_game/helper"
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
		//s.S(r.Name,"hey, ho!")
		// essa API é horrorosa
		s.MapcastBytes(r.Name, nil, 0, 0, msghelper.ServerChatMessage("Hey, ho! Lets go!").Bytes())
	}
}
