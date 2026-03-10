package main

import (
	"log"
	"net/http"
	"time"

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
	cleanup_worker := worker.NewCleanupWorker(connection, time.Duration(cfg.CleanupInterval)*time.Minute, store, cfg.CleanUpQuantity, cfg.FileTTL)
	go process_worker.Start()
	go cleanup_worker.Start()

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

	// backend routes
	router.POST("/api/jobs/compress", jobHandler.CreateCompressJob)
	router.POST("/api/jobs/split", jobHandler.CreateSplitJob)
	router.POST("/api/jobs/merge", jobHandler.CreateMergeJob)
	router.POST("/api/jobs/convert-image-pdf", jobHandler.CreateConvertImagesToPdfJob)
	router.POST("/api/jobs/encrypt", jobHandler.CreateEncryptJob)
	router.POST("/api/jobs/decrypt", jobHandler.CreateDecryptJob)
	router.POST("/api/file", fileHandler.Upload)
	router.GET("/api/job/status/:id", jobHandler.GetJobStatus)
	router.GET("/api/file/:id/download", fileHandler.Download)

	webFS := http.FileServer(http.Dir("./web"))
	router.NoRoute(func(c *gin.Context) {
		webFS.ServeHTTP(c.Writer, c.Request)
	})

	log.Printf("pdfctl starting on %s (%s)", cfg.HTTPAddr, cfg.Env)
	log.Fatal(router.Run(cfg.HTTPAddr))
}
