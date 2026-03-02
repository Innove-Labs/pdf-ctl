package processes

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/google/uuid"

	"github.com/Innove-Labs/pdf-ctl/internal/models"
)

type Compress struct{}

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

	reader, err := ctx.Storage.Load(inputFile.StorageKey)
	if err != nil {
		return fmt.Errorf("failed to load input file: %w", err)
	}
	defer reader.Close()

	tmpIn, err := os.CreateTemp("", "pdfctl-in-*.pdf")
	if err != nil {
		return fmt.Errorf("failed to create temp input: %w", err)
	}
	defer os.Remove(tmpIn.Name())
	defer tmpIn.Close()

	if _, err := tmpIn.ReadFrom(reader); err != nil {
		return fmt.Errorf("failed to write temp input: %w", err)
	}
	tmpIn.Close()

	tmpOut, err := os.CreateTemp("", "pdfctl-out-*.pdf")
	if err != nil {
		return fmt.Errorf("failed to create temp output: %w", err)
	}
	defer os.Remove(tmpOut.Name())
	tmpOut.Close()

	cmd := exec.Command(
		"gs",
		"-sDEVICE=pdfwrite",
		"-dCompatibilityLevel=1.4",
		"-dPDFSETTINGS=/screen",
		"-dNOPAUSE",
		"-dQUIET",
		"-dBATCH",
		"-sOutputFile="+tmpOut.Name(),
		tmpIn.Name(),
	)

	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("ghostscript failed: %s", string(out))
	}

	// Save output through the storage abstraction
	result, err := os.Open(tmpOut.Name())
	if err != nil {
		return fmt.Errorf("failed to open temp output: %w", err)
	}
	defer result.Close()

	info, _ := result.Stat()
	outputID := uuid.New()
	storageKey := outputID.String() + "_compressed.pdf"

	if err := ctx.Storage.Save(storageKey, result); err != nil {
		return fmt.Errorf("failed to save output file: %w", err)
	}

	outputFile := models.File{
		ID:          outputID,
		FileName:    "compressed.pdf",
		Extension:   "pdf",
		ContentType: "application/pdf",
		SizeBytes:   info.Size(),
		StorageType: inputFile.StorageType,
		StorageKey:  storageKey,
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
