package autotilemap

import (
	"io"
	"log"

	"github.com/Alfrederson/backend_game/pecas"
)

// tilemap no meu formato, que é uma imitação do RPG Maker 2000.
// a ideia é que dê para modificar o mapa em tempo real pelos jogadores

const (
	B0 = 0b0000_0001
	B1 = 0b0000_0010
	B2 = 0b0000_0100
	B3 = 0b0000_1000
	B4 = 0b0001_0000
	B5 = 0b0010_0000
	B6 = 0b0100_0000
	B7 = 0b1000_0000
)

const (
	TOP_LEFT     = B0
	TOP          = B1
	TOP_RIGHT    = B2
	RIGHT        = B3
	BOTTOM_RIGHT = B4
	BOTTOM       = B5
	BOTTOM_LEFT  = B6
	LEFT         = B7
)

// como a gente vai fazer isso ser baseado em um mapa e poder ser modificado?????
type AutoTilemap struct {
	Tileset  *Tileset
	Width    int
	Height   int
	Layer0   *pecas.Array2D[int]
	Bitmasks *pecas.Array2D[byte]
	Subtiles *pecas.Array2D[int]
	Layer1   *pecas.Array2D[int]
}

func is_autotile(tile_index int) bool {
	return tile_index >= 6 && tile_index < 6+12
}

func calc_bitmask(tilemap pecas.Array2D[int], x int, y int) (result byte) {
	result = 0
	if x < 0 || y < 0 || x >= tilemap.Width() || y >= tilemap.Height() {
		return
	}
	aqui := tilemap.Get(x, y)
	if x == 0 || tilemap.Get(x-1, y) == aqui {
		result |= LEFT
	}
	if x == 0 || y == 0 || tilemap.Get(x-1, y-1) == aqui {
		result |= TOP_LEFT
	}
	if y == 0 || tilemap.Get(x, y-1) == aqui {
		result |= TOP
	}
	if y == 0 || x == tilemap.Width()-1 || tilemap.Get(x+1, y-1) == aqui {
		result |= TOP_RIGHT
	}
	if x == tilemap.Width()-1 || tilemap.Get(x+1, y) == aqui {
		result |= RIGHT
	}
	if x == tilemap.Width()-1 || y == tilemap.Height()-1 || tilemap.Get(x+1, y+1) == aqui {
		result |= BOTTOM_RIGHT
	}
	if y == tilemap.Height()-1 || tilemap.Get(x, y+1) == aqui {
		result |= BOTTOM
	}
	if x == 0 || y == tilemap.Height()-1 || tilemap.Get(x-1, y+1) == aqui {
		result |= BOTTOM_LEFT
	}
	return
}

func ReadAutoTilemapFromReader(r io.Reader) (*AutoTilemap, error) {
	br := pecas.BinaryReader{Reader: r}
	tileset_name, err := br.ReadShortStr()
	if err != nil {
		return nil, err
	}
	log.Println("mapa usa o tileset: ", tileset_name)
	width, err := br.ReadUint16()
	if err != nil {
		return nil, err
	}
	height, err := br.ReadUint16()
	if err != nil {
		return nil, err
	}
	layer0_buf := pecas.NewArray2D[int](int(width), int(height))
	layer0_bitmasks := pecas.NewArray2D[byte](int(width), int(height))
	for row := 0; row < int(height); row++ {
		for col := 0; col < int(width); col++ {
			tile, err := br.ReadUint8()
			if err != nil {
				return nil, err
			}
			layer0_buf.Set(col, row, int(tile))
			if is_autotile(int(tile)) {
				bitmask, err := br.ReadUint8()
				if err != nil {
					return nil, err
				}
				layer0_bitmasks.Set(col, row, bitmask)
			}
		}
	}
	layer1_buf := pecas.NewArray2D[int](int(width), int(height))
	// gerar os subtiles aqui...
	for row := 0; row < int(height); row++ {
		for col := 0; col < int(width); col++ {
			tile, err := br.ReadUint8()
			if err != nil {
				return nil, err
			}
			layer1_buf.Set(col, row, int(tile))
		}
	}

	return &AutoTilemap{
		Layer0:   layer0_buf,
		Bitmasks: layer0_bitmasks,
		Layer1:   layer1_buf,
	}, nil

}
