package autotilemap

import (
	"fmt"
	"io"
	"log"

	"github.com/Alfrederson/backend_game/pecas"
)

const MAX_TILE_INDEX = 162 + 144

type Tileset struct {
	// image -> não tem ainda. talvez a gente use para alguma coisa?
	Name      string `json:"name"`
	ImagePath string `json:"image_path"`
	TileInfo  []byte `json:"tile_info"`
}

func NewTileset(name string) *Tileset {
	return &Tileset{
		Name:     name,
		TileInfo: make([]byte, MAX_TILE_INDEX),
	}
}

// no jabbascript tem
// setPassability, getPassability, cyclePassabilityUp, cyclePassabilityDown
// mas só são importantes dentro do editor.
// aqui, a gente só precisa do getPassability.

func (t *Tileset) GetPassability(tile_index int) (byte, error) {
	if tile_index < 0 || tile_index >= MAX_TILE_INDEX {
		return 0, fmt.Errorf("indice (%d) fora do alcance (0 a %d)", tile_index, MAX_TILE_INDEX)
	}
	return (t.TileInfo[tile_index] >> 6) & 0x11, nil
}

func ReadTilesetFromReader(r io.Reader) (*Tileset, error) {
	reader := pecas.BinaryReader{Reader: r}

	tileset_name, err := reader.ReadShortStr()
	if err != nil {
		return nil, err
	}
	log.Println("nome do tileset: ", tileset_name)

	tileset_image_path, err := reader.ReadShortStr()
	if err != nil {
		return nil, err
	}
	log.Println("imagem do tileset: ", tileset_image_path)

	// vamonos a ler os bytes!
	buf := make([]byte, MAX_TILE_INDEX)
	pos := 0
	for {
		tile_info, err := reader.ReadUint8()
		if err == io.EOF {
			break
		}
		buf[pos] = tile_info
		pos++
	}

	return &Tileset{
		Name:      tileset_name,
		ImagePath: tileset_image_path,
		TileInfo:  buf,
	}, nil

}
