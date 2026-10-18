package server

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/Alfrederson/backend_game/autotilemap"
	"github.com/Alfrederson/backend_game/entities"
	fb "github.com/Alfrederson/backend_game/firebase"
	"github.com/Alfrederson/backend_game/pecas"
)

// carrega os tilesets que estão em ../files/tilesets para a gente poder computar as colisões

func (s *Server) LoadTilesets() {
	s.tilesets = make(map[string]*autotilemap.Tileset)

	dir_file, err := os.OpenFile("../files/tilesets", os.O_RDONLY, os.ModePerm)
	if err != nil {
		panic(err)
	}
	defer dir_file.Close()

	dir, err := dir_file.ReadDir(0)
	if err != nil {
		panic(err)
	}

	log.Println("carregando tilesets...")
	for numero, arquivo := range dir {
		if arquivo.IsDir() {
			continue // como isso veio parar aqui?
		}

		filename := arquivo.Name()
		tileset_file_name := filepath.Join("../files/tilesets", filepath.Base(filename))

		fmt.Printf("%d) carregando tileset %s \r\n", numero, filename)

		tileset_file, err := os.OpenFile(tileset_file_name, os.O_RDONLY, os.ModePerm)
		if err != nil {
			panic(err)
		}
		defer tileset_file.Close()

		tileset, err := autotilemap.ReadTilesetFromReader(tileset_file)
		if err != nil {
			panic(err)
		}

		fmt.Printf("carregado tileset %s \r\n", tileset.Name)

		s.tilesets[tileset.Name] = tileset
	}
}

func (s *Server) GetRoom(room_name string) (*Room, error) {
	room, existe := s.maps[room_name]
	if !existe {
		return nil, fmt.Errorf("sala %s non ecziste", room_name)
	}
	return room, nil
}

// carrega os mapas que estão em ../files/maps e cria uma sala para cada um deles
func (s *Server) LoadRooms() {
	s.maps = make(map[string]*Room)

	log.Println("carregando objetos mapais...")
	panic_se_der_erro(
		processar_diretorio("/maps", func(numero int, arquivo os.DirEntry) error {
			if !arquivo.IsDir() {
				return nil
			}

			fmt.Printf("[INFO] processando mapa %s \n", arquivo.Name())
			// nome do mapa, ex: 1_vila
			map_name := arquivo.Name()

			esse_mapa := autotilemap.AutoTilemap{}
			// carregar os bytes lá...

			new_room := &Room{
				Maps:          pecas.NewList[MapInstance](),
				Name:          map_name,
				Objects:       pecas.NewList[GameObject](),
				ActiveClients: pecas.NewList[Client](),
			}

			loaded_map := &entities.GameMap{
				AutoTilemap: &esse_mapa,
				Zones:       make(map[string]entities.MapZone),
				Portals:     make(map[string]entities.MapPortal),
			}
			loaded_map.Prepare()

			// por que estou considerando a possibilidade de ter mais de um mapa na mesma
			// sala??????????
			_ = new_room.Maps.Add(&MapInstance{GameMap: loaded_map, X: 0, Y: 0})

			fmt.Printf("a sala tem %d mapas \n", new_room.Maps.Size())

			s.maps[map_name] = new_room

			//OBS: esse ticker é o que controla os NPCs e etc.
			s.AddTicker(new_room.GetTicker())

			fmt.Printf("ok!\n")

			return nil
		}),
	)
}

// Baixa todos os assets (mapas, tilesets, imagens, etc do bucket)
func (s *Server) DownloadStuffFromStorage() {
	log.Println("carregando conteudo do cloud storage")

	log.Println("carregando mapas")
	// por acaso isso já baixa tudo o que tem nos diretórios também, ex: /maps/x/tiles
	err := fb.DownloadFromStorage("dumpster-4567", "maps", "../files/maps/")
	if err != nil {
		panic(fmt.Errorf("deu ruim na hora de baixar os mapas: %v", err))
	}

	log.Println("carregando tilesets")
	err = fb.DownloadFromStorage("dumpster-4567", "tilesets", "../files/tilesets/")
	if err != nil {
		panic(fmt.Errorf("deu ruim na hora de baixar os tilesets: %v", err))
	}
}
