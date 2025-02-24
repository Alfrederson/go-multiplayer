package main

import (
	"fmt"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// 1- Eu tenho um servidor
func main() {
	gin.SetMode(gin.ReleaseMode)

	r := gin.Default()

	server := Server{
		MaxPlayers: 100,
	}

	server.LoadMaps()

	r.Use(cors.Default())

	r.GET("/server/map/:map_id", func(ctx *gin.Context) {
		map_name, ok := ctx.Params.Get("map_id")
		if !ok {
			ctx.Status(404)
			return
		}
		ctx.JSON(200, fmt.Sprintf("não existe o mapa %s", map_name))
	})

	r.GET("/server", server.GetWSHandler())
	r.GET("/server/status", func(ctx *gin.Context) {
		ctx.JSON(200, server.Status())
	})

	r.Static("/client", "../client")

	r.Static("/maps", "../files/maps")

	log.Println("iniciando o servidor...")
	if err := r.Run("0.0.0.0:8080"); err != nil {
		log.Fatal(err)
	}
}
