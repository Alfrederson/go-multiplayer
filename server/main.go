package main

import (
	"log"

	"github.com/gin-gonic/gin"
)

type Player struct {
	Id         int    `json:"id"`
	PlayerName string `json:"player_name"`
}

// 1- Eu tenho um servidor
func main() {
	r := gin.Default()

	server := Server{
		MaxPlayers: 100,
	}

	r.GET("/server", server.GetWSHandler())
	r.GET("/server/status", func(ctx *gin.Context) {
		ctx.JSON(200, server.Status())
	})

	r.Static("/client", "../client")

	log.Println("iniciando o servidor...")
	if err := r.Run("0.0.0.0:8080"); err != nil {
		log.Fatal(err)
	}
}
