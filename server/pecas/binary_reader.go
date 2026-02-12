package pecas

import (
	"encoding/binary"
	"io"
)

type BinaryReader struct {
	io.Reader
	finished bool
}

func (b *BinaryReader) Finished() bool {
	return b.finished
}

func (b *BinaryReader) checkIfFinished(err error) {
	if err == io.EOF {
		b.finished = true
	}
}

func (b *BinaryReader) ReadBool() (bool, error) {
	var out byte
	if err := binary.Read(b, binary.LittleEndian, &out); err != nil {
		b.checkIfFinished(err)
		return false, err
	}
	if out == 0 {
		return false, nil
	} else {
		return true, nil
	}
}

func (b *BinaryReader) ReadUint8() (uint8, error) {
	var out uint8
	if err := binary.Read(b, binary.LittleEndian, &out); err != nil {
		b.checkIfFinished(err)
		return 0, err
	}
	return out, nil
}

func (b *BinaryReader) ReadUint16() (uint16, error) {
	var out uint16
	if err := binary.Read(b, binary.LittleEndian, &out); err != nil {
		b.checkIfFinished(err)
		return 0, err
	}
	return out, nil
}

func (b *BinaryReader) ReadUint32() (uint32, error) {
	var out uint32
	if err := binary.Read(b, binary.LittleEndian, &out); err != nil {
		b.checkIfFinished(err)
		return 0, err
	}
	return out, nil
}

// lê uma string de até 256 caracteres
func (b *BinaryReader) ReadShortStr() (string, error) {
	length, err := b.ReadUint8()
	if err != nil {
		return "", err
	}
	var out = make([]byte, length)
	if err := binary.Read(b, binary.LittleEndian, out); err != nil {
		return "", err
	}
	return string(out), nil
}
