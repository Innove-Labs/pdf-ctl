package worker

import (
	"time"

	"github.com/Innove-Labs/pdf-ctl/internal/models"
)

func (w *ProcessWorker) completeJob(job *models.Job) {
	w.DB.Model(job).Updates(map[string]any{
		"status":       models.StatusCompleted,
		"completed_at": time.Now(),
	})
}

func (w *ProcessWorker) failJob(job *models.Job, err error) {
	msg := err.Error()
	w.DB.Model(job).Updates(map[string]any{
		"status":        models.StatusFailed,
		"error_message": &msg,
	})
}
