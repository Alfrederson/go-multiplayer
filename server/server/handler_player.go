package server

import (
	"fmt"
	"log"

	"github.com/Alfrederson/backend_game/msg"
)

func OnPlayerStatus(ctx RemoteMessageContext) {
	x := ctx.Player.Status.X
	y := ctx.Player.Status.Y

	ctx.Player.Status.X = ctx.Message.TakeInt16()
	ctx.Player.Status.Y = ctx.Message.TakeInt16()

	ctx.Player.Status.DistanceWalked += int_abs(x-ctx.Player.Status.X) + int_abs(y-ctx.Player.Status.Y)
	//TODO: cansar o jogador com base na distância que foi percorrida.

	// a gente vai ter um sistema de células
	// se a pessoa se move, só quem está na mesma célula
	// que a pessoa está vai ver a pessoa
	// quando a pessoa sai de uma célula para a outra, o servidor
	// manda a mensagem que indica quem está
	// naquela célula
	// a gente também vai usar os portais definidos no mapa
	// pra decidir para qual outro mapa a pessoa teletransporta
	ctx.Server.Mapcast(
		ctx.Client.Status.CurrentMap,
		ctx.Client,
		ctx.Client.Status.X,
		ctx.Client.Status.Y,
		ctx.Message.MessageByte(),
		ctx.Message.PayloadBytes(),
	)

}

func OnPlayerChat(ctx RemoteMessageContext) {
	chat, err := ctx.Message.TakeShortString()
	if err != nil {
		log.Println("msg_player_chat: ", err)
		return
	}
	fmt.Printf("%d > %s\n", ctx.Client.Spot, chat)
	ctx.Server.Mapcast(
		ctx.Client.Status.CurrentMap,
		nil,
		ctx.Client.Status.X,
		ctx.Client.Status.Y,
		ctx.Message.MessageByte(),
		ctx.Message.PayloadBytes(),
	)
}

func OnPlayerEnterMap(ctx RemoteMessageContext) {
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

}
