package api

import (
	"net/http"

	"github.com/Innove-Labs/pdf-ctl/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CreateCompressJobRequest struct {
	FileID string `json:"file_id" binding:"required,uuid"`
}

type CreateSplitJobRequest struct {
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

func (h *JobHandler) CreateCompressJob(c *gin.Context) {
	var req CreateCompressJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

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

	c.JSON(http.StatusCreated, JobResponse{
		JobID:  job.ID,
		Status: job.Status,
	})
}

func (h *JobHandler) GetJobStatus(c *gin.Context) {
	jobID := c.Param("id")
	var job models.Job
	if err := h.DB.First(&job, "id = ?", jobID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
		return
	}

	if job.Status == models.StatusCompleted {
		var outputFiles []models.JobFile
		if err := h.DB.Where("job_id = ? AND role = ?", job.ID, models.JobFileOutput).Order("position ASC").Find(&outputFiles).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch output files"})
			return
		}

		type outputFile struct {
			ID       string `json:"id"`
			Position int    `json:"position"`
		}
		out := make([]outputFile, len(outputFiles))
		for i, f := range outputFiles {
			out[i] = outputFile{ID: f.FileID, Position: f.Position}
		}

		c.JSON(http.StatusOK, gin.H{
			"job_id":       job.ID,
			"status":       job.Status,
			"output_files": out,
		})
		return

	}
	c.JSON(http.StatusOK, gin.H{
		"job_id": job.ID,
		"status": job.Status,
	})
}
