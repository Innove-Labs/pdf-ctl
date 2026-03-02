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

	process_worker := worker.NewProcessWorker(connection, cfg.MAX_WORKERS, store)
	go process_worker.Start()

	gin.SetMode(gin.DebugMode)
	if cfg.Env == "prod" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	router.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// handlers
	fileHandler := api.NewFileUploadHandler(store)
	jobHandler := api.NewJobHandler(connection)

	router.POST("/api/jobs/compress", jobHandler.CreateCompressJob)

	router.POST("/api/file", fileHandler.Upload)

	log.Printf("pdfctl starting on %s (%s)", cfg.HTTPAddr, cfg.Env)
	log.Fatal(router.Run(cfg.HTTPAddr))
}
