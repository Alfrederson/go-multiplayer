package pecas

import (
	"encoding/binary"
	"errors"
	"io"
)

// Uma coisa que serve para ler e escrever tipos como u8, u16, u32, u64, i8, i16, i32, i64, etc...
// a gente usa para mandar/ler mensagens e para ler/salvar os mapas

type Book struct {
	bytes   []byte
	pointer int
}

func BookFromBytes(bytes []byte) *Book {
	return &Book{
		bytes:   bytes,
		pointer: 0,
	}
}

func (b *Book) Bytes() []byte {
	return b.bytes
}

func (b *Book) Length() int {
	return len(b.bytes)
}

func (b *Book) PutBool(val bool) {
	b.bytes = append(b.bytes, BoolToByte(val))
	b.pointer += 1
}

func (b *Book) PutUint8(val int) *Book {
	b.bytes = append(b.bytes, uint8(val))
	b.pointer += 1
	return b
}

func (b *Book) PutInt8(val int) {
	b.bytes = append(b.bytes, byte(int8(val)))
	b.pointer += 1
}

func (b *Book) PutInt16(val int) {
	start := len(b.bytes)
	b.bytes = append(b.bytes, 0, 0)
	binary.BigEndian.PutUint16(b.bytes[start:], uint16(val))
	b.pointer += 2
}

func (b *Book) PutInt32(val int) {
	// trecho GPTesco
	start := len(b.bytes)
	b.bytes = append(b.bytes, 0, 0, 0, 0)
	binary.BigEndian.PutUint32(b.bytes[start:], uint32(val))
	b.pointer += 4
}

// TODO: limitar isso a 256 caracteres porque eu sei que vai dar ruim em algum momento.
func (b *Book) PutShortString(val string) {
	length := len(val)
	bytes := []byte(val)
	b.bytes = append(b.bytes, byte(length))
	b.bytes = append(b.bytes, bytes...)
	b.pointer += length + 1
}

// coloca um int16 em uma posição específica, ex:
// SetInt16(h << 8 & l, 4) = 0 1 2 3 h l
func (b *Book) SetInt16(val int16, pos int) {
	binary.BigEndian.PutUint16(b.bytes[pos:], uint16(val))
}

func (b *Book) Skip(n int) {
	b.pointer += n
}

// TODO: fazer isso respeitar o tamanho
func (b *Book) MoveTo(pos int) {
	b.pointer = pos
}

func (b *Book) Uint8At(pos int) (byte, error) {
	if pos < 0 {
		return 0, errors.New("posicao menor que 0")
	}
	if pos >= b.Length() {
		return 0, errors.New("posicao maior que o comprimento")
	}
	return b.bytes[pos], nil
}

func (b *Book) TakeInt8() int {
	num := int(b.bytes[b.pointer])
	b.pointer++
	return num
}
func (b *Book) TakeInt16() int {
	num := int16(binary.BigEndian.Uint16(b.bytes[b.pointer:]))
	b.pointer += 2
	return int(num)
}
func (b *Book) TakeInt32() int {
	num := int32(binary.BigEndian.Uint32(b.bytes[b.pointer:]))
	b.pointer += 4
	return int(num)
}

func (b *Book) TakeShortString() (string, error) {
	length := int(b.bytes[b.pointer])
	if b.pointer+length+1 > len(b.bytes) {
		return "", errors.New("lendo depois do fim do livro")
	}
	result := make([]byte, length)
	copy(result, b.bytes[b.pointer+1:b.pointer+1+length])
	b.pointer += 1 + length
	return string(result), nil
}

// retorna uma string lida a partir da posição pos
// int é o final da string
// error se a mensagem foi malformada
func (b *Book) ShortStringAt(pos int) (string, int, error) {
	length := int(b.bytes[pos])

	if pos+length+1 > len(b.bytes) {
		return "", 0, errors.New("mensagem malformada")
	}
	result := make([]byte, length)
	copy(result, b.bytes[pos+1:pos+1+length])
	return string(result), pos + 1 + length, nil
}

func (b *Book) I16At(pos int) (int, error) {
	if pos < 0 {
		return 0, errors.New("posicao menor que 0")
	}
	if pos >= b.Length()-2 {
		return 0, errors.New("lendo depois do fim")
	}
	return (int(b.bytes[pos]) << 8) | int(b.bytes[pos+1]), nil
}

// escreve o negócio para um writer....
// a gente precisa disso?
func (b *Book) WriteToWriter(w io.Writer) (int, error) {
	return w.Write(b.bytes)
}

func BoolToByte(b bool) byte {
	// The compiler currently only optimizes this form.
	// See issue 6011.
	var i byte
	if b {
		i = 1
	} else {
		i = 0
	}
	return i
}
