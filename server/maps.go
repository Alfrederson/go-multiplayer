package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/Alfrederson/backend_game/pecas"
)

// A gente vai usar isso para fazer os portais
// e zonas de recursos
type TiledObject struct {
	Height int    `json:"height"`
	Width  int    `json:"width"`
	Name   string `json:"name"`
	X      int    `json:"x"`
	Y      int    `json:"y"`
}

type TiledMapLayer struct {
	Name   string `json:"name"` // Superior, Inferior, Coisas, Recursos
	Height int    `json:"height"`
	Width  int    `json:"width"`
	Type   string `json:"type"` // objectgroup ou tilelayer
}

type TiledMap struct {
	CompressionLevel int             `json:"compressionlevel"`
	Width            int             `json:"width"`
	Height           int             `json:"height"`
	Infinite         bool            `json:"infinite"`
	TileHeight       int             `json:"tileheight"`
	TileWidth        int             `json:"tilewidth"`
	Layers           []TiledMapLayer `json:"layers"`
}

type GameMap struct {
	*TiledMap
	ActiveClients pecas.List[Client]
}

// carrega os mapas que estão em ../files/maps e cria uma sala para cada um deles
func (s *Server) LoadMaps() {
	s.maps = make(map[string]*GameMap)

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

		esse_mapa := TiledMap{}
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
		s.maps[map_name_without_extension] = &GameMap{
			TiledMap:      &esse_mapa,
			ActiveClients: pecas.NewList[Client](),
		}

		log.Println(esse_mapa)
		fmt.Printf("ok!\n")
	}
}
