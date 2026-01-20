package msg

import (
	"encoding/binary"
	"errors"
)

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

func bool_to_byte(val bool) byte {
	if val {
		return 1
	} else {
		return 0
	}
}

type Message struct {
	bytes   []byte
	pointer int
}

func MessageFromBytes(bytes []byte) *Message {
	return &Message{
		bytes:   bytes,
		pointer: 0,
	}
}

func (m *Message) Bytes() []byte {
	return m.bytes
}

func (m *Message) PayloadBytes() []byte {
	return m.bytes[1:]
}

func (m *Message) Length() int {
	return len(m.bytes)
}

func (m *Message) PutBool(val bool) {
	m.bytes = append(m.bytes, bool_to_byte(val))
	m.pointer += 1
}
func (m *Message) PutUint8(val int) {
	m.bytes = append(m.bytes, uint8(val))
	m.pointer += 1
}

func (m *Message) PutInt32(val int) {
	// trecho GPTesco
	start := len(m.bytes)
	m.bytes = append(m.bytes, 0, 0, 0, 0)
	binary.BigEndian.PutUint32(m.bytes[start:], uint32(val))
	m.pointer += 4
}
func (m *Message) PutInt16(val int) {
	start := len(m.bytes)
	m.bytes = append(m.bytes, 0, 0)
	binary.BigEndian.PutUint16(m.bytes[start:], uint16(val))
	m.pointer += 2
}
func (m *Message) PutInt8(val int) {
	m.bytes = append(m.bytes, byte(int8(val)))
	m.pointer += 1
}

// TODO: limitar isso a 256 caracteres porque eu sei que vai dar ruim em algum momento.
func (m *Message) PutShortString(val string) {
	length := len(val)
	bytes := []byte(val)
	m.bytes = append(m.bytes, byte(length))
	m.bytes = append(m.bytes, bytes...)
	m.pointer += length + 1
}

func (m *Message) SetInt16(val int16, pos int) {
	binary.BigEndian.PutUint16(m.bytes[pos:], uint16(val))
}

func (m *Message) Skip(n int) {
	m.pointer += n
}

func (m *Message) TakeInt8() int {
	num := int(m.bytes[m.pointer])
	m.pointer++
	return num
}
func (m *Message) TakeInt16() int {
	num := int16(binary.BigEndian.Uint16(m.bytes[m.pointer:]))
	m.pointer += 2
	return int(num)
}
func (m *Message) TakeInt32() int {
	num := int32(binary.BigEndian.Uint32(m.bytes[m.pointer:]))
	m.pointer += 4
	return int(num)
}

func (m *Message) TakeShortString() (string, error) {
	length := int(m.bytes[m.pointer])
	if m.pointer+length+1 > len(m.bytes) {
		return "", errors.New("mensagem malformada")
	}
	result := make([]byte, length)
	copy(result, m.bytes[m.pointer+1:m.pointer+1+length])
	m.pointer += 1 + length
	return string(result), nil
}

func (m *Message) IsServerMessage() bool {
	return m.bytes[0] >= SERVER_SETID && m.bytes[0] <= SERVER_PLAYER_VITAL
}
func (m *Message) MessageByte() byte {
	return m.bytes[0]
}

// retorna uma string lida a partir da posição pos
// int é o final da string
// error se a mensagem foi malformada
func (m *Message) GetShortString(pos int) (string, int, error) {
	length := int(m.bytes[pos])

	if pos+length+1 > len(m.bytes) {
		return "", 0, errors.New("mensagem malformada")
	}
	result := make([]byte, length)
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
func StrToByteArray(texto string) []byte {
	tamanho := min(len(texto), 255)

	result := make([]byte, tamanho+1)
	result[0] = byte(tamanho)

	copy(result[1:], texto[:tamanho])

	return result
}

func I8(numero int) []byte {
	return []byte{
		byte(numero),
	}
}
func I16(numero int) []byte {
	return []byte{
		byte(numero >> 8),
		byte(numero),
	}
}
func I32(numero int) []byte {
	return []byte{
		byte(numero >> 24),
		byte(numero >> 16),
		byte(numero >> 8),
		byte(numero),
	}
}

// retorna um array de bytes
func ConstructMessage(message byte, data ...[]byte) []byte {
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
