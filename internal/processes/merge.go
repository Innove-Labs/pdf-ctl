package processes

import (
	"errors"
	"fmt"
	"os"

	"github.com/Innove-Labs/pdf-ctl/internal/models"
	"github.com/google/uuid"
	"github.com/pdfcpu/pdfcpu/pkg/api"
)

type MergePdf struct{}

func (c *MergePdf) Run(ctx Context, job *models.Job) error {

	var jobFiles []models.JobFile

	err := ctx.DB.Where("job_id = ? AND role = ?", job.ID, models.JobFileInput).Order("position ASC").Find(&jobFiles).Error

	if err != nil {
		return err
	}

	fileIds := make([]string, len(jobFiles))

	for i, jf := range jobFiles {
		fileIds[i] = jf.FileID
	}

	var files []models.File

	err = ctx.DB.Where("id IN (?)", fileIds).Find(&files).Error

	if err != nil {
		return err
	}

	if len(files) < 2 {
		return errors.New("Unsupported number of files")
	}

	tempInFiles := make([]string, len(files))

	for i, f := range files {
		reader, err := ctx.Storage.Load(f.StorageKey)
		if err != nil {
			return err
		}
		defer reader.Close()

		tempFile, err := os.CreateTemp("", "pdfctl-merge-in-*.pdf")
		if err != nil {
			return err
		}
		defer tempFile.Close()
		tempInFiles[i] = tempFile.Name()
		defer os.Remove(tempFile.Name())

		if _, err := tempFile.ReadFrom(reader); err != nil {
			return err
		}
	}

	outPath := os.TempDir() + "/pdfctl-merge-out-" + uuid.New().String() + ".pdf"
	defer os.Remove(outPath)

	if err := api.MergeCreateFile(tempInFiles, outPath, false, nil); err != nil {
		return err
	}

	tempOut, err := os.Open(outPath)
	if err != nil {
		return err
	}
	defer tempOut.Close()

	info, err := tempOut.Stat()
	if err != nil {
		return err
	}

	outputId := uuid.New()
	storageKey := outputId.String() + "_merge_.pdf"

	if err := ctx.Storage.Save(storageKey, tempOut); err != nil {
		return err
	}

	outputFile := models.File{
		ID:          outputId,
		FileName:    fmt.Sprintf(storageKey),
		Extension:   "pdf",
		ContentType: "application/pdf",
		SizeBytes:   info.Size(),
		StorageType: files[0].StorageType,
		StorageKey:  storageKey,
	}

	if err := ctx.DB.Create(&outputFile).Error; err != nil {
		return err
	}

	jobFile := models.JobFile{
		JobID:  job.ID,
		FileID: outputFile.ID.String(),
		Role:   models.JobFileOutput,
	}

	if err := ctx.DB.Create(&jobFile).Error; err != nil {
		return err
	}

	return nil
}
