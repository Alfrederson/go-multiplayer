package server

import (
	"log"
	"net"

	"github.com/Alfrederson/backend_game/entities"
	"github.com/Alfrederson/backend_game/msg"
	"github.com/Alfrederson/backend_game/pecas"
)

type Client struct {
	entities.Player
	Spot       int
	Connection net.Conn
	Active     bool
	Link       *pecas.Link[Client]
	ByteSink   chan []byte
}

func (c *Client) Close() {
	close(c.ByteSink)

	for range (c).ByteSink {
		// esvaziando canal
		log.Println("esvazia! ")
	}

	c.Connection.Close()
}

func (c *Client) SendBytes(bytes []byte) {
	select {
	case c.ByteSink <- bytes:
		// ok
		return
	default:
		log.Println("[WARN] writing to closed channel", c.Id)
	}
}

func (c *Client) SendMessage(msg msg.Message) {
	c.SendBytes(msg.Bytes())
}

func (c *Client) Tick() {
	// client.Player.Tick()
	// msg_status := msg.Message{}
	// msg_status.PutUint8(msg.SERVER_PLAYER_VITAL)
	// client.Player.Status.WriteVitalToMessage(&msg_status)
	// s.SendBytes(client, msg_status.Bytes())

	c.Player.Tick()

	msg_status := msg.New()
	msg_status.PutUint8(msg.SERVER_PLAYER_VITAL)
	c.Player.Status.WriteVitalToMessage(msg_status)

	c.ByteSink <- msg_status.Bytes()
}
