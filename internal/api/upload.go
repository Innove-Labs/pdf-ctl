package api

import (
    "fmt"
    "net/http"
    "os"
    "path/filepath"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "github.com/Innove-Labs/pdf-ctl/internal/models"
    "github.com/Innove-Labs/pdf-ctl/internal/db"
)

const MaxUploadSize = 50 << 20 // 50MB

func UploadPDF(c *gin.Context) {
    user, _ := c.Get("user")

    c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxUploadSize)

    file, err := c.FormFile("file")
	operationType := c.PostForm("operation_type")

    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
        return
    }

    if filepath.Ext(file.Filename) != ".pdf" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "only PDF files allowed"})
        return
    }

    jobID := uuid.New().String()

    storageDir := filepath.Join("uploads", jobID)
    os.MkdirAll(storageDir, os.ModePerm)

    storagePath := filepath.Join(storageDir, file.Filename)

    // Save file
    if err := c.SaveUploadedFile(file, storagePath); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
        return
    }

    // Create Job in DB
    var userID *uint
    if user != nil {
        u := user.(models.User)
        userID = &u.ID
    }

    job := models.Job{
        ID:          jobID,
        UserID:      userID,
        Filename:    file.Filename,
        StoragePath: storagePath,
        Status:      models.StatusPending,
		OperationType: models.OperationType(operationType),
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }

    if err := db.DB.Create(&job).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create job"})
        return
    }
	fmt.Printf("Created job %s for file %s\n", job.ID, file.Filename)
    c.JSON(http.StatusOK, gin.H{
        "job_id": job.ID,
        "status": job.Status,
    })
}
