package main

import (
	"errors"
)

const (
	// mensagens enviadas pelo servidor
	// define o ID do cliente
	MSG_SERVER_SETID = iota + 1
	//  quando um cliente novo entra no mapa
	MSG_SERVER_PLAYER_JOINED
	//  quando um cliente sai do mapa
	MSG_SERVER_PLAYER_EXITED
	// manda um cliente entrar em um mapa [i8 length byte... name]
	MSG_SERVER_PLAYER_SET_MAP
	// manda o cliente trocar de célula
	MSG_SERVER_PLAYER_SET_CELL
	// informa ao cliente quem são os outros jogadores no mapa dele
	MSG_SERVER_PLAYER_PEER_LIST

	// heartbeat
	MSG_PLAYER_HEART
	// sempre que o jogador se move ou periodicamente [i16 x,i16 y]
	MSG_PLAYER_STATUS
	// quando o jogador quer entrar em um mapa diferente
	MSG_PLAYER_ENTER_MAP
	// quando um jogador tenta usar um quadrado (usar um npc, minerar um quadrado, fazendar um quadrado, atacar um quadrado, etc...)
	MSG_PLAYER_USE_TILE
)

type Message struct {
	bytes []byte
}

func (m *Message) IsServerMessage() bool {
	return m.bytes[0] >= MSG_SERVER_SETID && m.bytes[0] <= MSG_SERVER_PLAYER_EXITED
}
func (m *Message) MessageByte() byte {
	return m.bytes[0]
}

// retorna uma string lida a partir da posição pos
// int é o final da string
// error se a mensagem foi malformada
func (m *Message) GetShortString(pos int) (string, int, error) {
	length := int(m.bytes[pos])
	result := make([]byte, length)
	if pos+length+1 > len(m.bytes) {
		return "", 0, errors.New("mensagem malformada")
	}
	copy(result, m.bytes[pos+1:pos+1+length])
	return string(result), pos + 1 + length, nil
}

func (m *Message) GetInt8(pos int) int {
	return int(m.bytes[pos])
}
func (m *Message) GetInt16(pos int) int {
	return (int(m.bytes[pos]) << 8) | int(m.bytes[pos+1])
}

// coisas para construir as mensagens

// gera uma array de string de até 256 caracteres
func short_str_to_byte_array(texto string) []byte {
	tamanho := len(texto)
	if tamanho > 255 {
		tamanho = 255
	}

	result := make([]byte, tamanho+1)
	result[0] = byte(tamanho)

	copy(result[1:], texto[:tamanho])

	return result
}

func i8(numero int) []byte {
	return []byte{
		byte(numero),
	}
}
func i16(numero int) []byte {
	return []byte{
		byte(numero >> 8),
		byte(numero),
	}
}
func i32(numero int) []byte {
	return []byte{
		byte(numero >> 24),
		byte(numero >> 16),
		byte(numero >> 8),
		byte(numero),
	}
}

func construct_message(message byte, data ...[]byte) []byte {
	total_size := 1
	for _, v := range data {
		total_size += len(v)
	}
	result := make([]byte, total_size)
	result[0] = message
	offset := 1
	for _, v := range data {
		copy(result[offset:], v)
		offset += len(v)
	}
	return result
}
