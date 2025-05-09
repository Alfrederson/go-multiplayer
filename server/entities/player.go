package entities

import (
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/Alfrederson/backend_game/fb"
)

type ItemId string

func (i ItemId) ItemName() string {
	partes := strings.Split(string(i), "_")
	return partes[0]
}

func (i ItemId) GetItem() (Item, error) {
	partes := strings.Split(string(i), "_")

	if item, existe := itens[partes[0]]; existe {
		return item, nil
	}
	return nil, fmt.Errorf("não conheço o item %s", i)
}

type Bag struct {
	MaxItems      int      `json:"max_items"`
	CurrentItems  int      `json:"current_items"`
	MaxWeight     int      `json:"max_weight"`
	CurrentWeight int      `json:"current_weight"`
	ItemIds       []ItemId `json:"item_ids"`
	Items         []Item   `json:"-" firestore:"-"`
}

func (b *Bag) Add(item Item) error {
	if b.CurrentWeight+item.Weight() > b.MaxWeight {
		return errors.New("a mochila já está pesada demais")
	}
	if b.CurrentItems+1 > b.MaxItems {
		return errors.New("a mochila já tem coisas demais")
	}
	if b.ItemIds == nil {
		b.ItemIds = make([]ItemId, 0)
		b.Items = make([]Item, 0)
	}
	log.Printf("jogador pegou uma %s", item.Name())
	b.ItemIds = append(b.ItemIds, ItemId(item.String()))
	b.Items = append(b.Items, item)
	return nil
}

type Player struct {
	// ghost: false => jogador normal. true => espectador
	Ghost bool   `json:"-" firestore:"-"`
	Id    string `json:"id"`
	// uma coisa tipo @usuario123
	Handle     string `json:"handle"`
	Name       string `json:"name"`
	CurrentMap string `json:"current_map"`
	X          int    `json:"x"`
	Y          int    `json:"y"`
	// disposição do jogador (se zerar, a pessoa só vai conseguir descansar)
	Energy int `json:"energy"`
	// quanto money a pessoa tem
	Balance int `json:"balance"`

	// quais itens o jogador tem
	Bag Bag `json:"bag"`

	// qual item está equipado agora
	EquippedId int `json:"equipped_id"`
}

func (p *Player) Message(msg string) {
	log.Printf("to %s : %s", p.Id, msg)
}
func (p *Player) IsGhost() bool {
	return p.Ghost
}
func (p *Player) BecomeGhost() {
	p.Ghost = true
}

// Isso vai ficar no firestore no futuro.
func (p *Player) Load() {
	path := fmt.Sprintf("players/%s", p.Id)
	err := fb.ReadDocument(path, p)
	if err != nil {
		log.Printf("não consegui carregar o jogador %s : %v\n", p.Id, err)
		return
	}

	// filename := filepath.Join("../files/players/", p.Id, "p.json")
	// b, err := os.ReadFile(filename)
	// if err != nil {
	// 	log.Printf("não consegui carregar como o jogador (%.6s) estava: %v", p.Id, err)
	// 	return
	// }
	// if err := json.Unmarshal(b, p); err != nil {
	// 	log.Printf("não consegui carregar como o jogador (%.6s) estava: %v", p.Id, err)
	// 	return
	// }

	// cria os itens concretos
	for _, id := range p.Bag.ItemIds {
		coisa_concreta, err := id.Parse()
		if err != nil {
			log.Printf("(%.6s) erro interpretando item: %v\n", p.Id, err)
		}
		item, ok := coisa_concreta.(Item)
		if ok {
			p.Bag.Add(item)
		} else {
			log.Printf("(%.6s) %s não representa um item válido\n", p.Id, id)
		}
	}

	//REMOVER isso.
	// log.Println("o jogador está carregando: ")
	// for num, item := range p.Bag.Items {
	// 	log.Printf("  %2d) %s\n", num, item.Name())
	// }
}

func (p *Player) Save() {
	path := fmt.Sprintf("players/%s", p.Id)
	err := fb.SaveDocument(path, p)
	if err != nil {
		log.Printf("não consegui salvar o jogador %s : %v\n", p.Id, err)
		return
	}

	// os.MkdirAll(filepath.Join("../files/players/", p.Id), os.ModePerm)
	// filename := filepath.Join("../files/players/", p.Id, "p.json")

	// bytes, err := json.MarshalIndent(p, "", " ")
	// if err != nil {
	// 	log.Printf("não consegui marshalizar jogador %s : %v", p.Id, err)
	// 	return
	// }
	// // buf := bytes.Buffer{}
	// // enc := gob.NewEncoder(&buf)
	// // if err := enc.Encode(p); err != nil {
	// // 	log.Printf("jogador %d perdeu dados: %v", p.Id, err)
	// // 	return
	// // }
	// if err := os.WriteFile(filename, bytes, os.ModePerm); err != nil {
	// 	log.Printf("não consegui gravar o progresso do jogador %s: %v", p.Id, err)
	// 	return
	// }
}
