package main

import (
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

	// r.Use(func(c *gin.Context) {
	// 	if c.Request.URL.Path == "/maps" || c.Request.URL.Path[:6] == "/maps/" {
	// 		c.Header("Cache-Control", "public, max-age=3600")
	// 	}
	// 	c.Next()
	// })
	r.Static("/maps", "../files/maps")

	r.GET("/server", server.GetWSHandler())
	r.GET("/server/status", func(ctx *gin.Context) {
		ctx.JSON(200, server.Status())
	})

	r.Static("/client", "../client/dist")
	r.Static("/assets", "../client/dist/assets")

	log.Println("iniciando o servidor...")

	if err := r.Run("0.0.0.0:8080"); err != nil {
		log.Fatal(err)
	}
}
