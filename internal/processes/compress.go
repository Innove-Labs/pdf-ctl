package processes

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/google/uuid"

	"github.com/Innove-Labs/pdf-ctl/internal/models"
)

type Compress struct{}

func fileSize(path string) int64 {
	info, err := os.Stat(path)
	if err != nil {
		return 0
	}
	return info.Size()
}

func (c *Compress) Run(ctx Context, job *models.Job) error {
	var inputs []models.JobFile

	if err := ctx.DB.
		Where("job_id = ? AND role = ?", job.ID, models.JobFileInput).
		Order("position ASC").
		Find(&inputs).Error; err != nil {
		return err
	}

	if len(inputs) != 1 {
		return fmt.Errorf("compress expects exactly 1 input")
	}

	var inputFile models.File
	if err := ctx.DB.First(&inputFile, "id = ?", inputs[0].FileID).Error; err != nil {
		return err
	}

	outputPath := filepath.Join(
		filepath.Dir(inputFile.StorageKey),
		uuid.NewString()+".pdf",
	)

	cmd := exec.Command(
		"gs",
		"-sDEVICE=pdfwrite",
		"-dCompatibilityLevel=1.4",
		"-dPDFSETTINGS=/screen",
		"-dNOPAUSE",
		"-dQUIET",
		"-dBATCH",
		"-sOutputFile="+outputPath,
		inputFile.StorageKey,
	)

	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("ghostscript failed: %s", string(out))
	}

	outputFile := models.File{
		ID:          uuid.New(),
		FileName:    "compressed.pdf",
		Extension:   "pdf",
		ContentType: "application/pdf",
		SizeBytes:   fileSize(outputPath),
		StorageType: inputFile.StorageType,
		StorageKey:  outputPath,
	}

	if err := ctx.DB.Create(&outputFile).Error; err != nil {
		return err
	}

	jobFile := models.JobFile{
		JobID:    job.ID,
		FileID:   outputFile.ID.String(),
		Role:     models.JobFileOutput,
		Position: 0,
	}

	return ctx.DB.Create(&jobFile).Error
}
