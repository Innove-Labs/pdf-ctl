package main

import (
	"log"
	"net/http"

	"github.com/Innove-Labs/pdf-ctl/internal/api"
	"github.com/Innove-Labs/pdf-ctl/internal/config"
	"github.com/Innove-Labs/pdf-ctl/internal/db"
	"github.com/Innove-Labs/pdf-ctl/internal/storage"
	"github.com/Innove-Labs/pdf-ctl/internal/worker"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	connection, err := db.NewSQLite(cfg.SqlLitePath)
	if err != nil {
		log.Fatal(err)
	}

	err = db.AutoMigrate(db.DB)
	if err != nil {
		log.Fatal(err)
	}

	router := gin.Default()

	process_worker := worker.NewProcessWorker(connection, cfg.MAX_WORKERS)
	process_worker.Start()

	gin.SetMode(gin.DebugMode)

	if cfg.Env == "prod" {
		gin.SetMode(gin.ReleaseMode)
	}

	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	store, err := storage.New(
		storage.Config{
			StorageType: cfg.StorageType,
			Local: storage.LocalConfig{
				BasePath: cfg.Local.BasePath,
			},
			S3: storage.S3Config{
				Bucket: cfg.S3.Bucket,
				Region: cfg.S3.Region,
				Prefix: cfg.S3.Prefix,
			},
		},
	)

	if err != nil {
		log.Fatal(err)
	}

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// API endpoints

	fileHandler := api.NewFileUploadHandler(store)

	// operation end points
	jobHandler := api.NewJobHandler(connection)

	router.POST("/jobs/compress", jobHandler.CreateCompressJob)

	// Upload end points
	router.POST("/file", fileHandler.Upload)

	log.Printf("pdfctl starting on %s (%s)", cfg.HTTPAddr, cfg.Env)
	log.Fatal(router.Run(cfg.HTTPAddr))
}
