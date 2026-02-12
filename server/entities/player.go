package entities

import (
	"errors"
	"fmt"
	"log"
	"strings"

	fb "github.com/Alfrederson/backend_game/firebase"
	"github.com/Alfrederson/backend_game/msg"
)

type Ticker interface {
	Tick()
}

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
	MaxWeight     int      `json:"max_weight" firestore:"max_weight"`
	CurrentWeight int      `json:"current_weight" firestore:"current_weight"`
	MaxItemCount  int      `json:"max_item_count" firestore:"max_item_count"`
	ItemCount     int      `json:"item_count" firestore:"item_count"`
	ItemIds       []ItemId `json:"item_ids" firestore:"item_ids"`
	// isso só é usado internamente para implementar as funcionalidades.
	Items []Item `json:"-" firestore:"-"`
}

func (b *Bag) WriteToMessage(out *msg.Message) {
	out.PutInt16(b.MaxWeight)
	out.PutInt16(b.CurrentWeight)
	out.PutInt16(b.MaxItemCount)
	out.PutInt16(b.ItemCount)
	for _, v := range b.ItemIds {
		out.PutShortString(string(v))
	}
}

func (b *Bag) Add(item Item) error {
	if b.CurrentWeight+item.Weight() > b.MaxWeight {
		return errors.New("a mochila já está pesada demais")
	}
	if b.ItemCount+1 > b.MaxItemCount {
		return errors.New("a mochila já tem coisas demais")
	}
	if b.ItemIds == nil {
		b.ItemIds = make([]ItemId, 0)
		b.Items = make([]Item, 0)
	}
	b.ItemCount++
	log.Printf("jogador pegou uma %s", item.Name())
	b.ItemIds = append(b.ItemIds, ItemId(item.String()))
	b.Items = append(b.Items, item)
	return nil
}

type PlayerStatus struct {
	// ghost: false => jogador normal. true => espectador
	Ghost bool `json:"-" firestore:"ghost"`
	// input-blocked => jogador não se move
	InputBlocked bool   `json:"-"`
	CurrentMap   string `json:"current_map" firestore:"current_map"`
	X            int    `json:"x" firestore:"x"`
	Y            int    `json:"y" firestore:"y"`
	Energy       int    `json:"energy" firestore:"energy"`
	Hunger       int    `json:"hunger" firestore:"hunger"`
	Thirst       int    `json:"thirst" firestore:"thirst"`
	Health       int    `json:"health" firestore:"health"`
	EquippedId   int    `json:"equipped_id" firestore:"equipped_id"`
	Balance      int    `json:"balance" firestore:"balance"`
	// não são persistidos
	DistanceWalked int `json:"-" firestore:"-"`
}

func (s *PlayerStatus) Tick() {
	// sinais vitais
	s.Hunger = min(100, s.Hunger+3)
	s.Thirst = min(100, s.Thirst+1)
	s.Energy = max(0, s.Energy-s.DistanceWalked/10)
	s.DistanceWalked = 0
	if s.Hunger == 100 {
		s.Health = max(0, s.Health-1)
	}
	if s.Thirst == 100 {
		s.Health = max(0, s.Health-3)
	}
	if s.Energy == 0 {
		s.Health = max(0, s.Health-1)
	}
}

func (s *PlayerStatus) IsGhost() bool {
	return s.Ghost
}
func (s *PlayerStatus) BecomeGhost() {
	s.Ghost = true
}
func (s *PlayerStatus) UnGhost() {
	s.Ghost = false
}
func (s *PlayerStatus) BlockInput() {
	s.InputBlocked = true
}
func (s *PlayerStatus) UnblockInput() {
	s.InputBlocked = false
}

func (s *PlayerStatus) WriteToMessage(out *msg.Message) {
	out.PutBool(s.Ghost)
	out.PutShortString(s.CurrentMap)
	out.PutInt32(s.X)
	out.PutInt32(s.Y)
	out.PutInt8(s.Energy)
	out.PutInt8(s.Hunger)
	out.PutInt8(s.Thirst)
	out.PutInt8(s.Health)
	out.PutInt16(s.EquippedId)
	out.PutInt32(s.Balance)
}

func (s *PlayerStatus) WriteVitalToMessage(out *msg.Message) {
	out.PutInt8(s.Energy)
	out.PutInt8(s.Hunger)
	out.PutInt8(s.Thirst)
	out.PutInt8(s.Health)
}

type PlayerProfile struct {
	Name   string `json:"name" firestore:"name"`
	Handle string `json:"handle" firestore:"handle"`
	// aqui a gente vai botar qual sprite ele tem e etc
	Sprite string `json:"sprite" firestore:"sprite"`
}

func (p *PlayerProfile) WriteToMessage(out *msg.Message) {
	out.PutShortString(p.Name)
	out.PutShortString(p.Handle)
	out.PutShortString(p.Sprite)
}

type Player struct {
	Id string `json:"id" firestore:"id"`
	// uma coisa tipo @usuario123
	Profile PlayerProfile `json:"profile" firestore:"profile"`
	Status  PlayerStatus  `json:"status" firestore:"status"`

	// quais itens o jogador tem
	Bag Bag `json:"bag" firestore:"bag"`
}

func (p *Player) Tick() {
	p.Status.Tick()
}

func (p *Player) WriteToMessage(out *msg.Message) {
	p.Profile.WriteToMessage(out)
	p.Status.WriteToMessage(out)
	p.Bag.WriteToMessage(out)
}

func (p *Player) Message(msg string) {
	log.Printf("to %s : %s", p.Id, msg)
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
