package entities

import (
	"fmt"
	"math/rand"
)

const (
	LAYER_NAME_COISAS   = "Coisas"
	LAYER_NAME_COLISOES = "Colisões"

	COISA_TYPE_ZONE   = "zone"
	COISA_TYPE_PORTAL = "portal"
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

// escolhe um ponto aleatório dentro da zona que comporte
// um retângulo
func (m Rectangle) PickPointForRect(width int, height int) (int, int) {
	if width > m.Width || height > m.Height {
		return m.X + m.Width/2, m.Y + m.Height/2
	}

	minX := m.X
	maxX := m.X + m.Width - width
	minY := m.Y
	maxY := m.Y + m.Height - height

	x := rand.Intn(maxX-minX+1) + minX
	y := rand.Intn(maxY-minY+1) + minY

	return x, y
}

type MapZone struct {
	Rectangle
}
type MapPortal struct {
	Rectangle
	TargetMap  string
	TargetZone string
}

type GameMap struct {
	*TiledMap
	Zones   map[string]MapZone
	Portals map[string]MapPortal
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
