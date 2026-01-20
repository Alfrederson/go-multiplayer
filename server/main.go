package main

import (
	"log"
	"time"

	"github.com/Alfrederson/backend_game/server"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// 1- Eu tenho um servidor
func main() {

	// governo := entities.Player{
	// 	Id:         "governo",
	// 	Balance:    1000000000,
	// 	CurrentMap: "nowhere",
	// }
	// governo.Save()

	gin.SetMode(gin.ReleaseMode)

	r := gin.New()
	r.Use(func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		// raw := c.Request.URL.RawQuery
		c.Header("Cache-Control", "None")
		c.Next()
		latency := time.Since(start)
		status := c.Writer.Status()
		log.Printf("[GIN] %d | %13v | %15s | %-7s %s",
			status,
			latency,
			c.ClientIP(),
			c.Request.Method,
			path,
		)
	})
	r.Use(gin.Recovery())

	sv := server.Server{
		MaxPlayers: 100,
	}

	sv.LoadMaps()

	r.Use(cors.Default())

	// r.Use(func(c *gin.Context) {
	// 	if c.Request.URL.Path == "/maps" || c.Request.URL.Path[:6] == "/maps/" {
	// 		c.Header("Cache-Control", "public, max-age=3600")
	// 	}
	// 	c.Next()
	// })
	r.Static("/maps", "../files/maps")

	r.GET("/server", sv.GetWSHandler())
	r.GET("/server/status", func(ctx *gin.Context) {
		ctx.JSON(200, sv.Status())
	})

	r.Static("/client", "../client/dist")
	r.Static("/assets", "../client/dist/assets")

	log.Println("iniciando o servidor...")

	if err := r.Run("0.0.0.0:8080"); err != nil {
		log.Fatal(err)
	}
}
