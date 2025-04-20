package entities

import (
	"encoding/gob"
	"fmt"
)

type Item interface {
	Comer(p *Player, m *GameMap) bool
	Usar(p *Player, m *GameMap) bool
	Name() string
	Weight() int
	String() string
}

type Maca struct {
	Peso int
}

func (m Maca) Name() string {
	return fmt.Sprintf("maçã de %dg", m.Peso)
}

func (m Maca) String() string {
	return "maçã"
}

func (m Maca) Comer(p *Player, gm *GameMap) bool {
	p.Message("a maçã é sem graça")
	if err := p.Bag.Add(Sementes{Planta: "maca", PesoFruto: m.Peso}); err != nil {
		p.Message(fmt.Sprintf("%v", err))
	}
	return false
}

func (m Maca) Usar(p *Player, gm *GameMap) bool {
	p.Message("a maçã não reage.")
	return false
}

func (m Maca) Weight() int {
	return m.Peso
}

type Sementes struct {
	Planta     string
	PesoFruto  int
	Quantidade int
}

func (s Sementes) Name() string {
	if s.Quantidade == 1 {
		return fmt.Sprintf("semente de %s", s.Planta)
	} else {
		return fmt.Sprintf("%d sementes de %s", s.Quantidade, s.Planta)
	}
}

func (s Sementes) String() string {
	return fmt.Sprintf("sementes(planta=%s quantidade=%d)", s.Planta, s.Quantidade)
}

func (s Sementes) Comer(p *Player, m *GameMap) bool {
	p.Message("não posso comer sementes")
	return false
}
func (s Sementes) Usar(p *Player, m *GameMap) bool {
	p.Message("preciso de terra para plantar as sementes")
	return false
}
func (s Sementes) Weight() int {
	return 0
}

var itens = make(map[string]Item)

func registrar(i Item) {
	itens[i.Name()] = i
}

var fabricas = make(map[string]func() any)

func registrar_fabrica(nome string, fabrica func() any) {
	fabricas[nome] = fabrica
}

func fabricar_item(item_id string) (any, error) {
	fabrica, existe := fabricas[item_id]
	if !existe {
		return nil, fmt.Errorf("não existe fábrica para %s", item_id)
	}
	return fabrica(), nil
}

func init() {
	gob.Register(Maca{})
	gob.Register(Sementes{})

	registrar_fabrica("maçã", func() any {
		return &Maca{}
	})
	registrar_fabrica("sementes", func() any {
		return &Sementes{}
	})
	registrar(Maca{})
	registrar(Sementes{})
}
