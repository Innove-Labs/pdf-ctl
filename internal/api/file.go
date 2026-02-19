package api

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/Innove-Labs/pdf-ctl/internal/config"
	"github.com/Innove-Labs/pdf-ctl/internal/db"
	"github.com/Innove-Labs/pdf-ctl/internal/models"
	"github.com/Innove-Labs/pdf-ctl/internal/storage"
	"github.com/Innove-Labs/pdf-ctl/internal/utils"
)

type FileUploadHandler struct {
	Storage storage.Storage
}

func NewFileUploadHandler(s storage.Storage) *FileUploadHandler {
	return &FileUploadHandler{Storage: s}
}

func (h *FileUploadHandler) Upload(c *gin.Context) {
	upload, err := c.FormFile("file")
	cfg := config.Load()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	file, err := upload.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open file"})
		return
	}
	defer file.Close()

	fileID := uuid.New()
	ext := strings.ToLower(filepath.Ext(upload.Filename))

	storageKey := utils.GetStandardFileName(upload.Filename, fileID.String())

	// Save to storage
	if err := h.Storage.Save(storageKey, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}

	record := models.File{
		ID:          fileID,
		FileName:    upload.Filename,
		ContentType: upload.Header.Get("Content-Type"),
		Extension:   ext,
		SizeBytes:   upload.Size,
		StorageType: cfg.StorageType,
		StorageKey:  storageKey,
		UserID:      nil, // set when auth is added
	}

	if err := db.DB.Create(&record).Error; err != nil {
		_ = h.Storage.Delete(storageKey) // rollback storage
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save metadata"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":         record.ID,
		"filename":   record.FileName,
		"size_bytes": record.SizeBytes,
	})
}
