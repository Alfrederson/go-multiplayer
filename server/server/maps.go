package server

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/Alfrederson/backend_game/autotilemap"
	"github.com/Alfrederson/backend_game/entities"
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

func processar_diretorio(diretorio string, processador func(numero int, arquivo os.DirEntry) error) error {
	f, err := os.OpenFile(filepath.Join("../files", diretorio), 0644, os.ModePerm)
	if err != nil {
		return err
	}
	defer f.Close()
	dir, err := f.ReadDir(0)
	if err != nil {
		return err
	}
	for numero, arquivo := range dir {
		if err := processador(numero, arquivo); err != nil {
			return err
		}
	}
	return nil
}

func panic_se_der_erro(err error) {
	if err != nil {
		panic(err)
	}
}

// carrega os mapas que estão em ../files/maps e cria uma sala para cada um deles
func (s *Server) LoadRooms() {
	s.maps = make(map[string]*Room)

	log.Println("carregando objetos mapais...")
	panic_se_der_erro(
		processar_diretorio("/maps", func(numero int, arquivo os.DirEntry) error {
			if arquivo.IsDir() {
				return nil
			}
			filename := arquivo.Name()
			map_name := filepath.Base(filename)

			esse_mapa := entities.TiledMap{}
			fmt.Printf("lendo %s ... \n", map_name)
			bytes, err := os.ReadFile(filepath.Join("../files/maps", arquivo.Name()))
			if err != nil {
				return err
			}
			fmt.Printf("interpretando... \n")
			err = json.Unmarshal(bytes, &esse_mapa)
			if err != nil {
				return err
			}

			fmt.Printf("%2d) %s ", numero, map_name)

			// TODO: usar o nosso formato de arquivo, não essa desgraça de JSON

			fmt.Printf("criando sala... \n")
			map_name_without_extension := strings.TrimSuffix(map_name, ".json")
			new_room := &Room{
				Maps: pecas.NewList[entities.GameMap](),
				// BaseMap: entities.GameMap{
				// 	TiledMap: &esse_mapa,
				// 	Zones:    make(map[string]entities.MapZone),
				// 	Portals:  make(map[string]entities.MapPortal),
				// },
				// // Isso aqui a gente vai carregar da lista de objetos
				// OverlayMaps:   pecas.NewList[entities.GameMap](),
				ActiveClients: pecas.NewList[Client](),
			}

			loaded_map := &entities.GameMap{
				TiledMap: &esse_mapa,
				Zones:    make(map[string]entities.MapZone),
				Portals:  make(map[string]entities.MapPortal),
			}

			loaded_map.Prepare()

			_ = new_room.Maps.Add(loaded_map)

			fmt.Printf("a sala tem %d mapas \n", new_room.Maps.Size())

			s.maps[map_name_without_extension] = new_room

			// log.Println(esse_mapa)
			fmt.Printf("ok!\n")

			return nil
		}),
	)
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
