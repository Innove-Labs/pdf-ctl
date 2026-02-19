package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"log"

	"github.com/Innove-Labs/pdf-ctl/internal/models"
)

type CreateCompressJobRequest struct {
	FileID string `json:"file_id" binding:"required,uuid"`
}

type JobResponse struct {
	JobID  string           `json:"job_id"`
	Status models.JobStatus `json:"status"`
}

type JobHandler struct {
	DB *gorm.DB
}

func NewJobHandler(db *gorm.DB) *JobHandler {
	return &JobHandler{DB: db}
}

func EnqueueJob(jobID string) {
	go func() {
		// placeholder: real worker will pick this up
		log.Printf("Job enqueued: %s", jobID)
	}()
}

func (h *JobHandler) CreateCompressJob(c *gin.Context) {
	var req CreateCompressJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Ensure file exists
	var file models.File
	if err := h.DB.First(&file, "id = ?", req.FileID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	job := models.Job{
		ID:            uuid.NewString(),
		OperationType: models.OperationCompress,
		Status:        models.StatusPending,
	}

	input := models.JobFile{
		JobID:    job.ID,
		FileID:   req.FileID,
		Role:     models.JobFileInput,
		Position: 0,
	}

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&job).Error; err != nil {
			return err
		}
		if err := tx.Create(&input).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create job"})
		return
	}

	// Enqueue job (async)
	EnqueueJob(job.ID)

	c.JSON(http.StatusCreated, JobResponse{
		JobID:  job.ID,
		Status: job.Status,
	})
}
