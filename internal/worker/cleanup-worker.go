package worker

import (
	"log"
	"time"

	"github.com/Innove-Labs/pdf-ctl/internal/models"
	"github.com/Innove-Labs/pdf-ctl/internal/storage"
	"gorm.io/gorm"
)

type CleanupWorker struct {
	DB              *gorm.DB
	PollInternal    time.Duration
	Storage         storage.Storage
	CleanUpQuantity int
	CleanUpInterval time.Duration
}

func NewCleanupWorker(db *gorm.DB, pollInterval time.Duration, storage storage.Storage, cleanUpQuantity int, cleanUpInterval time.Duration) *CleanupWorker {
	return &CleanupWorker{
		DB:              db,
		PollInternal:    pollInterval,
		Storage:         storage,
		CleanUpQuantity: cleanUpQuantity,
		CleanUpInterval: cleanUpInterval,
	}
}

func (w *CleanupWorker) Start() {
	log.Println("Starting cleanup worker")

	for {
		w.CleanUp()
		time.Sleep(w.PollInternal)
	}
}

func (w *CleanupWorker) CleanUp() {
	log.Println("Running cleanup job")
	log.Printf("Looking for files older than %s", w.CleanUpInterval)
	var oldFileCount int64
	now := time.Now()
	log.Printf("Current time: %s", now.Format(time.RFC3339))

	err := w.DB.Model(&models.File{}).Where("created_at < ?", now.Add(-w.CleanUpInterval)).Count(&oldFileCount).Error
	if err != nil {
		log.Printf("Count query error: %v", err)
		return
	}
	log.Printf("Found %d old files to clean up", oldFileCount)
	if oldFileCount == 0 {
		return
	}

	for {
		var files []models.File
		err := w.DB.Where("created_at < ?", now.Add(-w.CleanUpInterval)).Limit(w.CleanUpQuantity).Find(&files).Error
		if err != nil {
			log.Printf("Error fetching old files for cleanup: %v", err)
			return
		}

		log.Printf("Cleaning up %d old files", len(files))

		for _, file := range files {
			err := w.Storage.Delete(file.StorageKey)
			if err != nil {
				continue
			}

			err = w.DB.Delete(&file).Error
			if err != nil {
				continue
			}
		}

		if len(files) < w.CleanUpQuantity {
			break
		}
	}
}
