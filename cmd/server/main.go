package main

import (
	"log"
	"net/http"

	"github.com/Innove-Labs/pdf-ctl/internal/config"
	"github.com/Innove-Labs/pdf-ctl/internal/db"
	"github.com/Innove-Labs/pdf-ctl/internal/api"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	_, err := db.NewSQLite(cfg.SqlLitePath)
	if err != nil {
		log.Fatal(err)
	}

	err = db.AutoMigrate(db.DB)
	if err != nil {
		log.Fatal(err)
	}

	router := gin.Default()

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// API endpoints

	router.POST("/upload", api.UploadPDF)


	log.Printf("pdfctl starting on %s (%s)", cfg.HTTPAddr, cfg.Env)
	log.Fatal(router.Run(cfg.HTTPAddr))
}
