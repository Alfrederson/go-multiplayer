package entities

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
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
	Items         []Item   `json:"-"`
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
	Id         int    `json:"id"`
	Name       string `json:"name"`
	CurrentMap string `json:"current_map"`
	X          int    `json:"x"`
	Y          int    `json:"y"`
	// disposição do jogador (se zerar, a pessoa só vai conseguir descansar)
	Energy int `json:"energy"`
	// quanto money a pessoa tem
	Balance int `json:"balance"`

	// quais itens o jogador tem
	Bag `json:"bag"`

	// qual item está equipado agora
	EquippedId int `json:"equipped_id"`
}

func (p *Player) Message(msg string) {
	log.Printf("to %d : %s", p.Id, msg)
}

// Isso vai ficar no firestore no futuro.
func (p *Player) Load() {
	filename := filepath.Join("../files/players", fmt.Sprintf("p_%d.json", p.Id))
	b, err := os.ReadFile(filename)
	if err != nil {
		log.Printf("não consegui carregar como o jogador %d estava: %v", p.Id, err)
		return
	}
	if err := json.Unmarshal(b, p); err != nil {
		log.Printf("não consegui carregar como o jogador %d estava: %v", p.Id, err)
		return
	}

	// cria os itens concretos
	log.Println("criando os itens concretos...")
	for _, id := range p.Bag.ItemIds {
		log.Printf("fabricando um %s\n", id)
		coisa_concreta, err := id.Parse()
		if err != nil {
			log.Printf("  erro interpretando item: %v\n", err)
		}
		item, ok := coisa_concreta.(Item)
		if ok {
			p.Bag.Add(item)
		} else {
			log.Printf("  %s não representa um item válido\n", id)
		}
	}

	log.Println("o jogador está carregando: ")
	for num, item := range p.Bag.Items {
		log.Printf("  %2d) %s\n", num, item.Name())
	}
}

func (p *Player) Save() {
	filename := filepath.Join("../files/players", fmt.Sprintf("p_%d.json", p.Id))

	bytes, err := json.MarshalIndent(p, "", " ")
	if err != nil {
		log.Printf("não consegui marshalizar jogador %d : %v", p.Id, err)
		return
	}
	// buf := bytes.Buffer{}
	// enc := gob.NewEncoder(&buf)
	// if err := enc.Encode(p); err != nil {
	// 	log.Printf("jogador %d perdeu dados: %v", p.Id, err)
	// 	return
	// }
	if err := os.WriteFile(filename, bytes, os.ModePerm); err != nil {
		log.Printf("não consegui gravar o progresso do jogador %d: %v", p.Id, err)
		return
	}
}
