package msg

const (
	// mensagens enviadas pelo servidor
	// define o ID do cliente
	SERVER_SETID = iota + 1
	//  quando um cliente novo entra no mapa
	SERVER_PLAYER_JOINED
	//  quando um cliente sai do mapa
	SERVER_PLAYER_EXITED
	// manda um cliente entrar em um mapa [i8 length byte... name]
	SERVER_PLAYER_SET_MAP
	// manda o cliente trocar de célula
	SERVER_PLAYER_SET_CELL
	// informa ao cliente quem são os outros jogadores no mapa dele
	SERVER_PLAYER_PEER_LIST
	// mensagem diretamente do servidor para os clientes do chat
	// SERVER_CHAT_SEND

	// estado completo do jogador
	SERVER_PLAYER_FULL_STATUS

	// estado vital
	SERVER_PLAYER_VITAL

	// heartbeat
	PLAYER_HEART
	// sempre que o jogador se move ou periodicamente [i16 x,i16 y]
	PLAYER_STATUS
	// quando o jogador quer entrar em um mapa diferente
	PLAYER_ENTER_MAP
	// quando o jogador envia uma mensagem no chat
	PLAYER_CHAT
	// quando um jogador tenta usar um quadrado (usar um npc, minerar um quadrado, fazendar um quadrado, atacar um quadrado, etc...)
	PLAYER_USE_TILE

	// servidor manda mensagem (tipo rpg maker) para o jogador
	EVENT_SERVER_MESSAGE
	// jogador fecha a mensagem
	EVENT_PLAYER_OK
	// servidor pergunta alguma coisa
	EVENT_SERVER_ASK
	// jogador responde
	EVENT_PLAYER_ANSWER
)
