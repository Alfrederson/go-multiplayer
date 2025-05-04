package main

import (
	"fmt"
	"log"

	"github.com/gobwas/ws/wsutil"
)

func msg_player_status(s *Server, c *Client, m Message) {
	// tamanho fixo é mais fácil de fazer isso.
	if m.Length() < 7 {
		return
	}
	c.Player.X = m.TakeInt16()
	c.Player.Y = m.TakeInt16()
	//TODO: cansar o jogador com base na distância que foi percorrida.

	// a gente vai ter um sistema de células
	// se a pessoa se move, só quem está na mesma célula
	// que a pessoa está vai ver a pessoa
	// quando a pessoa sai de uma célula para a outra, o servidor
	// manda a mensagem que indica quem está
	// naquela célula
	// a gente também vai usar os portais definidos no mapa
	// pra decidir para qual outro mapa a pessoa teletransporta
	s.Mapcast(c.CurrentMap, c, c.X, c.Y, m.MessageByte(), m.bytes[1:])
}

func msg_player_chat(s *Server, c *Client, m Message) {
	chat, err := m.TakeShortString()
	if err != nil {
		log.Println("msg_player_chat: ", err)
		return
	}
	fmt.Printf("%d > %s\n", c.Spot, chat)
	s.Mapcast(c.CurrentMap, nil, c.X, c.Y, m.MessageByte(), m.bytes[1:])
}

func msg_player_enter_map(s *Server, c *Client, m Message) {
	map_name, err := m.TakeShortString()
	if err != nil {
		log.Println("lendo o mapa:", err)
		return
	}
	target_zone, err := m.TakeShortString()
	if err != nil {
		log.Println("lendo a zona:", err)
		return
	}
	mapa, existe := s.maps[map_name]
	if !existe {
		fmt.Printf("jogador tentando ir para mapa inexistente %s \n", map_name)
		return
	}
	portal, existe := mapa.Zones[target_zone]
	if !existe {
		fmt.Printf("jogador tentando ir para portal inexistente %s \n", target_zone)
	}
	old_map := c.CurrentMap
	x, y := portal.PickPointForRect(14, 14)
	log.Printf("(%.6s) => %s.%s (%d,%d)", c.Player.Id, map_name, target_zone, x, y)

	s.Mapcast(old_map, c, c.X, c.Y, MSG_SERVER_PLAYER_EXITED, i16(c.Spot))

	s.ChangeClientRoom(c, map_name)
	s.Send(c, MSG_SERVER_PLAYER_SET_MAP, short_str_to_byte_array(map_name), i16(x), i16(y))
}

func (s *Server) StartSession(client *Client) {
	id_bytes := i16(client.Spot)

	log.Printf("cliente pegou o spot %d", client.Spot)

	defer func() {
		// notifica os outros jogadores de que este aqui saiu
		s.Mapcast(client.CurrentMap, client, client.X, client.Y, MSG_SERVER_PLAYER_EXITED, id_bytes)

		s.mutex.Lock()
		defer s.mutex.Unlock()

		// libera o id do player do índice
		if !client.Player.IsGhost() {
			delete(s.player_by_id, client.Player.Id)
		}

		// libera o ID
		s.free_spots.Push(client.Spot)
		log.Printf("spot %d agora está livre", client.Spot)

		// fecha a conexão
		(*client).Connection.Close()

		// tira o cliente do mapa em que ele está
		s.maps[(*client).CurrentMap].ActiveClients.RemoveLink(client.Link)

		// retorna para o pool
		s.free_clients.AddLink(client.Link)

		// persiste o jogador
		client.Player.Save()

		// reseta o cliente por desencargo de consciência, mas ele
		// é reinicializado novamente quando um cliente conecta no servidor
		*client = Client{}
	}()

	log.Println("botando o cliente na sala ", client.CurrentMap)

	if !client.Player.IsGhost() {
		s.player_by_id[client.Player.Id] = &client.Player
	}

	s.maps[client.CurrentMap].ActiveClients.AddLink(client.Link)

	// diz par ao jogador qual é o ID dele
	s.Send(client, MSG_SERVER_SETID, id_bytes)
	// diz para o jogador quem são os outros jogadores que estão lá
	// (esse é difícil)

	// manda o jogador entrar em um mapa
	s.Send(client, MSG_SERVER_PLAYER_SET_MAP, short_str_to_byte_array(client.CurrentMap), i16(client.X), i16(client.Y))

	// Notifica os outros do mapa que ele entrou...
	log.Println("notificando que o jogador entrou")
	s.Mapcast(client.CurrentMap, client, client.X, client.Y, MSG_SERVER_PLAYER_JOINED, id_bytes)

	// estatísticas
	for {
		// o segundo valor é op
		msg, op, err := wsutil.ReadClientData(client.Connection)
		if err != nil {
			log.Println("erro de leitura ", op, err)
			break
		}

		// descarta a mensagem se for menor do que a mínima
		if len(msg) < 3 {
			continue
		}

		// identifica a mensagem
		msg[1] = id_bytes[0]
		msg[2] = id_bytes[1]

		message := Message{bytes: msg}

		// jogador tentando enviar uma mensagem de servidor
		if message.IsServerMessage() {
			continue
		}

		// faz algumas interpretações
		msg_byte := message.TakeInt8()
		message.Skip(2) // bytes do ID
		switch msg_byte {

		case MSG_PLAYER_STATUS:
			msg_player_status(s, client, message)
		case MSG_PLAYER_CHAT:
			msg_player_chat(s, client, message)
		// na verdade isso vai ser uma mensagem "PLAYER_USE_PORTAL"
		// e eu vou checar se o jogador está mesmo perto do portal
		case MSG_PLAYER_ENTER_MAP:
			msg_player_enter_map(s, client, message)
		}
	}
}

// a mensagem que o cliente recebe tem esse formato:
//
// 0 1    | 0 1            |  0 1  | 0 1
// tipo   | id do jogador  |    x  |   y

// a mensagem que o cliente envia tem esse formato:
//
// 0 1  | 0 1 | 0 1
// tipo |   x |   y
