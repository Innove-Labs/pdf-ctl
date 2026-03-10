package api

import (
	"encoding/json"
	"net/http"

	"github.com/Innove-Labs/pdf-ctl/internal/models"
	"github.com/Innove-Labs/pdf-ctl/internal/types"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CreateCompressJobRequest struct {
	FileID string `json:"file_id" binding:"required,uuid"`
}

type CreateSplitJobRequest struct {
	FileID string            `json:"file_id" binding:"required,uuid"`
	Mode   string            `json:"mode" binding:"required,oneof=pages all n-pages range"`
	Pages  []int             `json:"pages,omitempty"`
	NPages int               `json:"n_pages,omitempty"`
	Ranges []types.PageRange `json:"ranges,omitempty"`
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

func (h *JobHandler) CreateSplitJob(c *gin.Context) {
	var req CreateSplitJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var file models.File
	if err := h.DB.First(&file, "id = ?", req.FileID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	paramsData := types.SplitPDFParams{
		Mode:   req.Mode,
		Pages:  req.Pages,
		NPages: req.NPages,
		Ranges: req.Ranges,
	}
	paramsJSON, _ := json.Marshal(paramsData)

	job := models.Job{
		ID:            uuid.NewString(),
		OperationType: models.OperationSplit,
		Status:        models.StatusPending,
		Params:        string(paramsJSON),
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

func (h *JobHandler) CreateMergeJob(c *gin.Context) {
	var req types.MergePdfRequestParams
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	job := models.Job{
		ID:            uuid.NewString(),
		OperationType: models.OperationMerge,
		Status:        models.StatusPending,
	}

	jobFilesArray := make([]models.JobFile, len(req.Files))
	for i, f := range req.Files {
		jobFilesArray[i] = models.JobFile{
			JobID:    job.ID,
			FileID:   f.FileID,
			Role:     models.JobFileInput,
			Position: f.Position,
		}
	}

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&job).Error; err != nil {
			return err
		}
		if err := tx.Create(&jobFilesArray).Error; err != nil {
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

func (h *JobHandler) CreateConvertImagesToPdfJob(c *gin.Context) {
	var req types.ConvertImagesToPdfRequestParams
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Files) > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Too Many Files"})
	}

	params := types.ConvertImageParams{
		Orientation:  req.Orientation,
		PageSize:     req.PageSize,
		MergeIntoOne: req.MergeIntoOne,
	}

	paramsJson, _ := json.Marshal(params)

	job := models.Job{
		OperationType: models.OperationConvertImage,
		ID:            uuid.NewString(),
		Status:        models.StatusPending,
		Params:        string(paramsJson),
	}

	jobFilesArray := make([]models.JobFile, len(req.Files))
	for i, j := range req.Files {
		jobFilesArray[i] = models.JobFile{
			JobID:    job.ID,
			FileID:   j.FileID,
			Position: j.Position,
			Role:     models.JobFileInput,
		}
	}

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&job).Error; err != nil {
			return err
		}
		if err := tx.Create(&jobFilesArray).Error; err != nil {
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

func (h *JobHandler) CreateEncryptJob(c *gin.Context) {
	var req types.EncryptPdfRequestParams
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Files) > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Too many files"})
	}

	jobID := uuid.New()

	params := types.EncryptPdfParams{
		Password: req.Password,
	}

	paramsJson, _ := json.Marshal(params)

	job := models.Job{
		ID:            jobID.String(),
		OperationType: models.OperationEncrypt,
		Params:        string(paramsJson),
		Status:        models.StatusPending,
	}

	jobFilesArray := make([]models.JobFile, len(req.Files))

	for i, j := range req.Files {
		jobFile := models.JobFile{
			JobID:    job.ID,
			FileID:   j.FileID,
			Position: j.Position,
			Role:     models.JobFileInput,
		}
		jobFilesArray[i] = jobFile
	}

	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&job).Error; err != nil {
			return err
		}
		if err := tx.Create(&jobFilesArray).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}

	c.JSON(http.StatusCreated, JobResponse{
		JobID:  job.ID,
		Status: job.Status,
	})
}

func (h *JobHandler) CreateDecryptJob(c *gin.Context) {
	var req types.EncryptPdfRequestParams
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Files) > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Too many files"})
	}

	jobID := uuid.New()

	params := types.EncryptPdfParams{
		Password: req.Password,
	}

	paramsJson, _ := json.Marshal(params)

	job := models.Job{
		ID:            jobID.String(),
		OperationType: models.OperationDecrypt,
		Params:        string(paramsJson),
		Status:        models.StatusPending,
	}

	jobFilesArray := make([]models.JobFile, len(req.Files))

	for i, j := range req.Files {
		jobFile := models.JobFile{
			JobID:    job.ID,
			FileID:   j.FileID,
			Position: j.Position,
			Role:     models.JobFileInput,
		}
		jobFilesArray[i] = jobFile
	}

	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&job).Error; err != nil {
			return err
		}
		if err := tx.Create(&jobFilesArray).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}

	c.JSON(http.StatusCreated, JobResponse{
		JobID:  job.ID,
		Status: job.Status,
	})
}
