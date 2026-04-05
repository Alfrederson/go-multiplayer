package msghelper

import "github.com/Alfrederson/backend_game/msg"

func ServerChatMessage(txt string) *msg.Message {
	message := msg.New()
	message.PutUint8(msg.PLAYER_CHAT).PutInt16(0)
	message.PutShortString(txt)
	return message
}

// messagebox tipo do rpg maker
func ServerEventMessage(txt string) *msg.Message {
	message := msg.New()
	message.PutUint8(msg.EVENT_SERVER_MESSAGE)
	message.PutShortString(txt)
	return message
}
