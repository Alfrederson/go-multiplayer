package main

import (
	"fmt"
	"log"
	"time"

	"github.com/Alfrederson/backend_game/msg"
	"github.com/gobwas/ws/wsutil"
)

// envia mensagem do servidor direto para o jogador
func msg_server_direct_message(s *Server, c *Client, m string) {
	message := msg.Message{}
	message.PutUint8(msg.PLAYER_CHAT)
	message.PutInt16(0)
	message.PutShortString(m)
	s.SendBytes(c, message.Bytes())
}

// interpreta mensagem player status enviada pelo jogador
func msg_player_status(s *Server, c *Client, m *msg.Message) {
	// tamanho fixo é mais fácil de fazer isso.
	if m.Length() < 7 {
		return
	}
	x := c.Player.Status.X
	y := c.Player.Status.Y

	c.Player.Status.X = m.TakeInt16()
	c.Player.Status.Y = m.TakeInt16()

	c.Player.Status.DistanceWalked += int_abs(x-c.Player.Status.X) + int_abs(y-c.Player.Status.Y)
	//TODO: cansar o jogador com base na distância que foi percorrida.

	// a gente vai ter um sistema de células
	// se a pessoa se move, só quem está na mesma célula
	// que a pessoa está vai ver a pessoa
	// quando a pessoa sai de uma célula para a outra, o servidor
	// manda a mensagem que indica quem está
	// naquela célula
	// a gente também vai usar os portais definidos no mapa
	// pra decidir para qual outro mapa a pessoa teletransporta
	s.Mapcast(c.Status.CurrentMap, c, c.Status.X, c.Status.Y, m.MessageByte(), m.PayloadBytes())
}

func msg_player_chat(s *Server, c *Client, m *msg.Message) {
	chat, err := m.TakeShortString()
	if err != nil {
		log.Println("msg_player_chat: ", err)
		return
	}
	fmt.Printf("%d > %s\n", c.Spot, chat)
	s.Mapcast(c.Status.CurrentMap, nil, c.Status.X, c.Status.Y, m.MessageByte(), m.PayloadBytes())
}

func msg_player_enter_map(s *Server, c *Client, m *msg.Message) {
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
	// TODO: decidir o que fazer quando a pessoa estiver entrando em uma casa
	mapa, existe := s.maps[map_name]
	if !existe {
		fmt.Printf("jogador tentando ir para mapa inexistente %s \n", map_name)
		return
	}
	portal, existe := mapa.Zones[target_zone]
	if !existe {
		fmt.Printf("jogador tentando ir para portal inexistente %s \n", target_zone)
		return
	}
	old_map := c.Status.CurrentMap
	x, y := portal.PickPointForRect(14, 14)
	log.Printf("(%.6s) => %s.%s (%d,%d)", c.Player.Id, map_name, target_zone, x, y)

	if !c.Status.IsGhost() {
		s.MapcastBytes(
			old_map,
			c,
			c.Status.X,
			c.Status.Y,
			msg.ConstructMessage(msg.SERVER_PLAYER_EXITED, msg.I16(c.Spot)),
		)
	}

	s.ChangeClientRoom(c, map_name)
	s.SendBytes(c,
		msg.ConstructMessage(msg.SERVER_PLAYER_SET_MAP, msg.StrToByteArray(map_name), msg.I16(x), msg.I16(y)),
	)
}

func (s *Server) RecycleClient(client *Client) {
	// libera o ID
	s.free_spots.Push(client.Spot)
	client.Link.RemoveFromList()
	// equivale a isso:
	// s.maps[(*client).Status.CurrentMap].ActiveClients.RemoveLink(client.Link)

	// devolve para o pool
	s.free_clients.AddLink(client.Link)
}

func (s *Server) StartSession(client *Client) {
	id_bytes := msg.I16(client.Spot)

	log.Printf("cliente pegou o spot %d", client.Spot)

	// começa o ticker
	ticker := time.NewTicker(time.Second)
	jogador_saiu := make(chan bool)
	go func() {
		for {
			select {
			case <-jogador_saiu:
				return
			case <-ticker.C:
				client.Player.Status.TickVitals()

				msg_status := msg.Message{}
				msg_status.PutUint8(msg.SERVER_PLAYER_VITAL)
				client.Player.Status.WriteVitalToMessage(&msg_status)
				s.SendBytes(client, msg_status.Bytes())
			}
		}
	}()

	defer func() {
		// desliga o ticker do jogador
		ticker.Stop()
		jogador_saiu <- true

		// notifica os outros jogadores de que este aqui saiu
		if !client.Status.IsGhost() {
			s.Mapcast(client.Status.CurrentMap, client, client.Status.X, client.Status.Y, msg.SERVER_PLAYER_EXITED, id_bytes)
		}

		s.mutex.Lock()
		defer s.mutex.Unlock()

		// libera o id do player do índice
		if !client.Status.IsGhost() {
			delete(s.player_by_id, client.Id)
		}

		// fecha a conexão
		(*client).Connection.Close()

		// tira o cliente do mapa em que ele está

		s.RecycleClient(client)

		// persiste o jogador
		client.Player.Save()

		// reseta o cliente por desencargo de consciência, mas ele
		// é reinicializado novamente quando um cliente conecta no servidor
		*client = Client{}
	}()

	if !client.Player.Status.IsGhost() {
		s.player_by_id[client.Player.Id] = &client.Player
	}

	s.maps[client.Status.CurrentMap].ActiveClients.AddLink(client.Link)

	// diz par ao jogador qual é o ID dele
	s.Send(client, msg.SERVER_SETID, id_bytes)
	// TODO: diz para o jogador quem são os outros jogadores que estão lá
	// (esse é difícil)

	// Envia o estado completo do jogador
	msg_status := msg.Message{}
	msg_status.PutUint8(msg.SERVER_PLAYER_FULL_STATUS)
	client.Player.WriteToMessage(&msg_status)
	s.SendBytes(client, msg_status.Bytes())

	// manda o jogador entrar em um mapa
	// msg_setmap := msg.Message{}
	// msg_setmap.PutUint8(msg.MSG_SERVER_PLAYER_SET_MAP)
	// msg_setmap.PutShortString(client.Status.CurrentMap)
	// msg_setmap.PutInt32(cli)
	// s.Send(client, msg.MSG_SERVER_PLAYER_SET_MAP, short_str_to_byte_array(client.CurrentMap), i16(client.X), i16(client.Y))

	// Notifica os outros do mapa que ele entrou...
	log.Println("notificando que o jogador entrou")
	s.Mapcast(client.Status.CurrentMap, client, client.Status.X, client.Status.Y, msg.SERVER_PLAYER_JOINED, id_bytes)

	// estatísticas
	for {
		// o segundo valor é op
		received_msg, op, err := wsutil.ReadClientData(client.Connection)
		if err != nil {
			log.Println("erro de leitura ", op, err)
			break
		}

		// descarta a mensagem se for menor do que a mínima
		if len(received_msg) < 3 {
			continue
		}
		if len(received_msg) > 256 {
			// ejeta o jogador
			msg_server_direct_message(s, client, "bye!")
			return
		}

		// muda o ID da mensagem para chegar nos outros jogadores
		// propriamente identificada
		copy(received_msg[1:3], id_bytes[:2])

		message := msg.MessageFromBytes(received_msg)

		// jogador tentando enviar uma mensagem de servidor
		if message.IsServerMessage() {
			continue
		}

		// faz algumas interpretações
		msg_byte := message.TakeInt8()
		message.Skip(2) // bytes do ID
		switch msg_byte {

		case msg.PLAYER_STATUS:
			if client.Status.IsGhost() {
				continue
			}
			msg_player_status(s, client, message)
		case msg.PLAYER_CHAT:
			if client.Status.IsGhost() {
				continue
			}
			msg_player_chat(s, client, message)
		// na verdade isso vai ser uma mensagem "PLAYER_USE_PORTAL"
		// e eu vou checar se o jogador está mesmo perto do portal
		case msg.PLAYER_ENTER_MAP:
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
