package msg

import (
	"github.com/Alfrederson/backend_game/pecas"
)

// Pra fazer uma mensagem nova:
// - pega um book
// - vai escreve um byte nele
// - escreve os outros bytes nele

// TODO: dar um jeito de evitar as alocações com sync.Pool ou qualquer outra coisa

// type Message struct {
// 	bytes   []byte
// 	pointer int
// }

type Message struct {
	*pecas.Book
}

func New() *Message {
	return &Message{
		Book: &pecas.Book{},
	}
}

// não usar isso para enviar mensagens
func MessageFromBytes(bytes []byte) *Message {
	return &Message{
		Book: pecas.BookFromBytes(bytes),
	}
}

func (m *Message) PayloadBytes() []byte {
	return m.Bytes()[1:m.Length()]
}

func (m *Message) IsServerMessage() bool {
	msg_byte, _ := m.Book.Uint8At(0)

	return msg_byte >= SERVER_SETID && msg_byte <= SERVER_PLAYER_VITAL
}

func (m *Message) MessageByte() byte {
	msg_byte, _ := m.Book.Uint8At(0)
	return msg_byte
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

func U8(numero int) []byte {
	return []byte{
		byte(numero),
	}
}

func U16(numero int) []byte {
	return []byte{
		byte(numero >> 8),
		byte(numero),
	}
}

func U32(numero int) []byte {
	return []byte{
		byte(numero >> 24),
		byte(numero >> 16),
		byte(numero >> 8),
		byte(numero),
	}
}

// retorna um array de bytes que é [message, data....]
func ConstructByteBuffer(message byte, data ...[]byte) []byte {
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
