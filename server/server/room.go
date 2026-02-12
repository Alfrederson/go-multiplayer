package server

import (
	"github.com/Alfrederson/backend_game/entities"
	"github.com/Alfrederson/backend_game/pecas"
)

type Room struct {
	Maps pecas.List[entities.GameMap]

	ActiveClients pecas.List[Client]
}

func (r *Room) GetMaps() *pecas.List[entities.GameMap] {
	return &r.Maps
}

func (r *Room) Tick(s *Server) {
	// tick dos NPCs, scripts, etc.

}
