package worker

import (
	"errors"

	"github.com/Innove-Labs/pdf-ctl/internal/models"
	"github.com/Innove-Labs/pdf-ctl/internal/processes"
)

var ErrUnsupportedOperation = errors.New("unsupported operation")

func (w *ProcessWorker) processJob(job *models.Job) {
	process, ok := processes.Get(job.OperationType)
	if !ok {
		w.failJob(job, ErrUnsupportedOperation)
		return
	}

	ctx := processes.Context{
		DB:      w.DB,
		Storage: w.Storage,
	}

	if err := process.Run(ctx, job); err != nil {
		w.failJob(job, err)
		return
	}

	w.completeJob(job)
}
