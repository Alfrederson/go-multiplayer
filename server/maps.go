package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Alfrederson/backend_game/pecas"
)

type TiledObjectProperty struct {
	Name  string `json:"name"`
	Type  string `json:"type"`
	Value string `json:"value"`
}

// A gente vai usar isso para fazer os portais
// e zonas de recursos
type TiledObject struct {
	Height     float64               `json:"height"`
	Width      float64               `json:"width"`
	Name       string                `json:"name"`
	Type       string                `json:"type"`
	X          float64               `json:"x"`
	Y          float64               `json:"y"`
	Properties []TiledObjectProperty `json:"properties"`
}

type TiledMapLayer struct {
	Name    string        `json:"name"` // Superior, Inferior, Coisas, Recursos
	Height  int           `json:"height"`
	Width   int           `json:"width"`
	Type    string        `json:"type"` // objectgroup ou tilelayer
	Objects []TiledObject `json:"objects"`
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

type Rectangle struct {
	X      int
	Y      int
	Width  int
	Height int
}

type MapZone struct {
	Rectangle
}
type MapPortal struct {
	Rectangle
	TargetMap  string
	TargetZone string
}

// escolhe um ponto aleatório dentro da zona que comporte
// um retângulo
func (m Rectangle) PickPointForRect(width int, height int) (int, int) {
	if width > m.Width || height > m.Height {
		return m.X + m.Width/2, m.Y + m.Height/2
	}

	rand.Seed(time.Now().UnixNano())

	minX := m.X
	maxX := m.X + m.Width - width
	minY := m.Y
	maxY := m.Y + m.Height - height

	x := rand.Intn(maxX-minX+1) + minX
	y := rand.Intn(maxY-minY+1) + minY

	return x, y
}

const (
	LAYER_NAME_COISAS   = "Coisas"
	LAYER_NAME_COLISOES = "Colisões"

	COISA_TYPE_ZONE   = "zone"
	COISA_TYPE_PORTAL = "portal"
)

type GameMap struct {
	*TiledMap
	ActiveClients pecas.List[Client]
	Zones         map[string]MapZone
	Portals       map[string]MapPortal
}

func processar_camada_de_coisas(l *TiledMapLayer, m *GameMap) {
	for _, coisa := range l.Objects {
		switch coisa.Type {
		case COISA_TYPE_ZONE:
			m.Zones[coisa.Name] = MapZone{
				Rectangle: Rectangle{
					X:      int(coisa.X),
					Y:      int(coisa.Y),
					Width:  int(coisa.Width),
					Height: int(coisa.Height),
				},
			}
			fmt.Printf("zona %s (x = %0.2f y = %0.2f w = %0.2f h = %0.2f)\n", coisa.Name, coisa.X, coisa.Y, coisa.Width, coisa.Height)
		case COISA_TYPE_PORTAL:
			var target_map string
			var target_zone string
			// faz mais sentido que exista só uma propriedade target e o valor
			// esteja no formato mapa.zona
			for _, p := range coisa.Properties {
				switch p.Name {
				case "to_map":
					target_map = p.Value
				case "to_zone":
					target_zone = p.Value
				}
			}
			m.Portals[coisa.Name] = MapPortal{
				Rectangle: Rectangle{
					X:      int(coisa.X),
					Y:      int(coisa.Y),
					Width:  int(coisa.Width),
					Height: int(coisa.Height),
				},
				TargetMap:  target_map,
				TargetZone: target_zone,
			}
			fmt.Printf("portal %s (x = %0.2f y = %0.2f w = %0.2f h = %0.2f) to %s %s\n", coisa.Name, coisa.X, coisa.Y, coisa.Width, coisa.Height, target_map, target_zone)

		}
	}
}

func (m *GameMap) Prepare() {
	for _, layer := range m.TiledMap.Layers {
		switch layer.Name {
		case LAYER_NAME_COISAS:
			fmt.Printf("processando camada %s \n", layer.Name)
			processar_camada_de_coisas(&layer, m)
		default:
			fmt.Printf("pulando camada %s \n", layer.Name)
			continue
		}
	}
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
		new_map := &GameMap{
			TiledMap:      &esse_mapa,
			ActiveClients: pecas.NewList[Client](),
			Zones:         make(map[string]MapZone),
			Portals:       make(map[string]MapPortal),
		}
		s.maps[map_name_without_extension] = new_map

		new_map.Prepare()

		log.Println(esse_mapa)
		fmt.Printf("ok!\n")
	}
}
