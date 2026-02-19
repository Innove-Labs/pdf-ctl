package worker

import (
	"log"
	"time"

	"github.com/Innove-Labs/pdf-ctl/internal/models"
	"github.com/Innove-Labs/pdf-ctl/internal/storage"
	"gorm.io/gorm"
)

type ProcessWorker struct {
	DB           *gorm.DB
	MaxWorkers   int
	PollInterval time.Duration
	Storage      storage.Storage

	jobChan chan *models.Job
}

func NewProcessWorker(db *gorm.DB, maxWorkers int) *ProcessWorker {
	return &ProcessWorker{
		DB:           db,
		MaxWorkers:   maxWorkers,
		PollInterval: 1 * time.Second,
		jobChan:      make(chan *models.Job, maxWorkers),
	}
}

func (w *ProcessWorker) Start() {
	log.Printf("Worker pool starting (%d workers)", w.MaxWorkers)

	// Start worker goroutines
	for i := 0; i < w.MaxWorkers; i++ {
		go w.workerLoop(i)
	}

	// Dispatcher loop
	for {
		job, err := w.fetchNextJob()
		if err != nil {
			log.Println("fetch job error:", err)
			time.Sleep(w.PollInterval)
			continue
		}

		if job == nil {
			time.Sleep(w.PollInterval)
			continue
		}

		w.jobChan <- job // blocks if pool is full (backpressure)
	}
}

func (w *ProcessWorker) workerLoop(id int) {
	log.Printf("worker-%d started", id)

	for job := range w.jobChan {
		log.Printf("worker-%d processing job %s", id, job.ID)
		w.processJob(job)
	}
}

func (w *ProcessWorker) fetchNextJob() (*models.Job, error) {
	var job models.Job

	err := w.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Where("status = ?", models.StatusPending).
			Order("created_at ASC").
			Limit(1).
			First(&job).Error; err != nil {
			return err
		}

		return tx.Model(&job).
			Update("status", models.StatusProcessing).Error
	})

	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &job, err
}
