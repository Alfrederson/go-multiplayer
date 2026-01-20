package server

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/Alfrederson/backend_game/entities"
	"github.com/Alfrederson/backend_game/pecas"
)

// carrega os mapas que estão em ../files/maps e cria uma sala para cada um deles
func (s *Server) LoadMaps() {
	s.maps = make(map[string]*ServerMap)

	f, err := os.OpenFile("../files/maps", 0644, os.ModePerm)
	if err != nil {
		panic(err)
	}
	dir, err := f.ReadDir(0)
	if err != nil {
		panic(err)
	}
	log.Println("carregando mapas...")
	for numero, arquivo := range dir {
		if arquivo.IsDir() {
			continue
		}
		filename := arquivo.Name()
		map_name := filepath.Base(filename)
		fmt.Printf("%2d) %s ", numero, map_name)

		esse_mapa := entities.TiledMap{}
		fmt.Printf("lendo... ")
		bytes, err := os.ReadFile(filepath.Join("../files/maps", arquivo.Name()))
		if err != nil {
			panic(err)
		}
		fmt.Printf("interpretando... ")
		err = json.Unmarshal(bytes, &esse_mapa)
		if err != nil {
			panic(err)
		}

		fmt.Printf("criando sala... ")
		map_name_without_extension := strings.TrimSuffix(map_name, ".json")
		new_map := &ServerMap{
			GameMap: entities.GameMap{
				TiledMap: &esse_mapa,
				Zones:    make(map[string]entities.MapZone),
				Portals:  make(map[string]entities.MapPortal),
			},
			ActiveClients: pecas.NewList[Client](),
		}
		s.maps[map_name_without_extension] = new_map

		new_map.Prepare()

		log.Println(esse_mapa)
		fmt.Printf("ok!\n")
	}
}

// nem ideia de como vou fazer isso
// func (s *Server) OpenHouse(house_name string) *ServerMap {
// 	casa, existe := s.maps[house_name]
// 	if existe {
// 		return casa
// 	}
// 	fmt.Printf("criando sala para casa %s \n", house_name)

// 	return nil
// }

// func (s *Server) CloseHouse(house_name string) {

// }
