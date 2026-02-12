package server

import (
	"fmt"
	"log"
	"time"

	"github.com/Alfrederson/backend_game/msg"
	"github.com/gobwas/ws/wsutil"
)

type RemoteMessageContext struct {
	*Server
	*Client
	*msg.Message
}

// envia mensagem do servidor direto para o jogador
func msg_server_direct_message(s *Server, c *Client, m string) {
	message := msg.Message{}
	message.PutUint8(msg.PLAYER_CHAT).PutInt16(0)
	message.PutShortString(m)
	c.SendBytes(message.Bytes())
}

func msg_player_enter_map(ctx RemoteMessageContext) {
	map_name, err := ctx.Message.TakeShortString()
	if err != nil {
		log.Println("lendo o mapa:", err)
		return
	}
	target_zone, err := ctx.Message.TakeShortString()
	if err != nil {
		log.Println("lendo a zona:", err)
		return
	}
	// TODO: decidir o que fazer quando a pessoa estiver entrando em uma casa
	room, existe := ctx.Server.maps[map_name]
	if !existe {
		fmt.Printf("jogador tentando ir para sala inexistente %s \n", map_name)
		return
	}
	log.Println(map_name, room)

	// Não é para a sala não ter um mapa, hein!
	next_map := room.Maps.FirstItem()
	if next_map == nil {
		fmt.Printf("sala não tem mapa!")
		return
	}

	portal, existe := next_map.Zones[target_zone]
	if !existe {
		fmt.Printf("jogador tentando ir para portal inexistente %s \n", target_zone)
		return
	}

	old_map := ctx.Client.Status.CurrentMap
	x, y := portal.PickPointForRect(14, 14)
	log.Printf("(%.6s) => %s.%s (%d,%d)", ctx.Client.Player.Id, map_name, target_zone, x, y)

	if !ctx.Client.Status.IsGhost() {
		ctx.Server.MapcastBytes(
			old_map,
			ctx.Client,
			ctx.Client.Status.X,
			ctx.Client.Status.Y,
			msg.ConstructByteBuffer(msg.SERVER_PLAYER_EXITED, msg.U16(ctx.Client.Spot)),
		)
	}

	ctx.Server.ChangeClientRoom(ctx.Client, map_name)
	ctx.Client.SendBytes(
		msg.ConstructByteBuffer(msg.SERVER_PLAYER_SET_MAP, msg.StrToByteArray(map_name), msg.U16(x), msg.U16(y)),
	)
	// REMOVER
	// ctx.Server.SendBytes(ctx.Client,
	// 	msg.ConstructByteBuffer(msg.SERVER_PLAYER_SET_MAP, msg.StrToByteArray(map_name), msg.U16(x), msg.U16(y)),
	// )
}

// isso vai ser chamado pela VM.
// func event_server_ask(s *Server, c *Client) {
// }

func msg_event_player_ok(ctx RemoteMessageContext) {
	// o que eu faço com a mensagem agora?
	// a gente não manda nenhuma mensagem pro jogador confirmando
	// então a gente torce para a pessoa não ter modificado o cliente
	ctx.Player.Status.UnblockInput()
}

// aqui a gente tem que mandar uma mensagem para um canal
// que vai resumear uma co-rotina
func msg_event_player_answer(ctx RemoteMessageContext) {
	// a resposta é para qual pergunta?
	ask_id := ctx.Message.TakeInt8()
	// respondeu o que?
	anwser := ctx.Message.TakeInt8()
	log.Println("jogador respondeu ", ask_id, "com", anwser)
	ctx.Client.Player.Status.UnblockInput()
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
	id_bytes := msg.U16(client.Spot)

	log.Printf("cliente pegou o spot %d", client.Spot)

	// começa o ticker
	ticker := time.NewTicker(time.Second)
	stop_ticker := make(chan bool)
	jogador_saiu := make(chan bool)

	// corotina de ticker do jogador (fome, sede, etc) que é parada quando ele sai.
	go func() {
		defer log.Println("stopping heartbeat")
		for {
			select {
			case <-stop_ticker:
				return
			// a gente faz assim? ou faz o ticker tickar para cada sala ao invés disso?
			case <-ticker.C:
				client.Tick()
			}
		}
	}()

	// corrotina de envio
	go func() {
		defer log.Println("parando o loop de envio")
		for {
			select {
			case <-jogador_saiu:
				return
			case bytes := <-client.ByteSink:
				err := s.WsWriteBytes(client, bytes)
				if err != nil {
					log.Printf("deu ruim: %v", err)
				}
			}
		}
	}()

	defer func() {
		// desliga o ticker do jogador
		ticker.Stop()
		jogador_saiu <- true
		stop_ticker <- true

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

		// fecha a conexão, etc
		client.Close()

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
	client.SendBytes(msg.ConstructByteBuffer(msg.SERVER_SETID, id_bytes))
	// TODO: diz para o jogador quem são os outros jogadores que estão lá
	// (esse é difícil)

	// Envia o estado completo do jogador
	msg_status := msg.New()
	msg_status.PutUint8(msg.SERVER_PLAYER_FULL_STATUS)
	client.Player.WriteToMessage(msg_status)
	client.SendMessage(*msg_status)

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

		ctx := RemoteMessageContext{Server: s, Client: client, Message: message}
		if msg_byte <= 0 || msg_byte >= len(s.message_handlers) {
			continue
		}
		handler := s.message_handlers[msg_byte]
		if handler == nil {
			continue
		}
		handler(ctx)
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
