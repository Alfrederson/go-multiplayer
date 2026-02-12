package server

import "github.com/Alfrederson/backend_game/msg"

// switch msg_byte {
// case msg.PLAYER_STATUS:
// 	if client.Status.IsGhost() {
// 		continue
// 	}
// 	msg_player_status(s, client, message)
// case msg.PLAYER_CHAT:
// 	if client.Status.IsGhost() {
// 		continue
// 	}
// 	msg_player_chat(s, client, message)
// // na verdade isso vai ser uma mensagem "PLAYER_USE_PORTAL"
// // e eu vou checar se o jogador está mesmo perto do portal
// case msg.PLAYER_ENTER_MAP:
// 	msg_player_enter_map(s, client, message)
// case msg.EVENT_PLAYER_ANSWER:
// 	msg_event_player_answer(ctx)
// case msg.EVENT_PLAYER_OK:
// 	msg_event_player_ok(s, client, message)
// }

func (s *Server) AddMessageHandlers2() {
	s.SetMessageHandler(msg.PLAYER_CHAT, OnPlayerChat)
	// for each handler found, add a line like this

	// for key, value := range message_handlers {
	// 	s.SetMessageHandler(key, value)
	// }
	// s.SetMessageHandler(msg.PLAYER_STATUS, msg_player_status)
	// s.SetMessageHandler(msg.PLAYER_CHAT, msg_player_chat)
	// s.SetMessageHandler(msg.PLAYER_ENTER_MAP, msg_player_enter_map)
}
