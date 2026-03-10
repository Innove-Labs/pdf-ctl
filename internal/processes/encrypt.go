package processes

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/Innove-Labs/pdf-ctl/internal/models"
	"github.com/Innove-Labs/pdf-ctl/internal/types"
	"github.com/google/uuid"
	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"gorm.io/gorm"
)

type Encrypt struct{}

func (c *Encrypt) Run(ctx Context, job *models.Job) error {

	var params types.EncryptPdfParams

	err := json.Unmarshal([]byte(job.Params), &params)

	if err != nil {
		return err
	}

	var jobFiles []models.JobFile

	if err := ctx.DB.Where("job_id = ? AND role = ?", job.ID, models.JobFileInput).Order("position ASC").Find(&jobFiles).Error; err != nil {
		return err
	}

	fileIds := make([]string, len(jobFiles))

	for i, j := range jobFiles {
		fileIds[i] = j.FileID
	}

	var inputfiles []models.File

	if err := ctx.DB.Where("id IN (?)", fileIds).Find(&inputfiles).Error; err != nil {
		return nil
	}

	tempInFiles := make([]string, len(inputfiles))

	for i, f := range inputfiles {
		reader, err := ctx.Storage.Load(f.StorageKey)
		if err != nil {
			return err
		}
		defer reader.Close()

		tempFileName := "pdf-ctl-encrypt-in-*" + f.Extension

		tempFile, err := os.CreateTemp("", tempFileName)
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

	config := model.NewAESConfiguration(params.Password, params.Password, 256)

	var jobFileOutputs []models.JobFile
	var fileOutputs []models.File

	for i, j := range tempInFiles {
		outPath := os.TempDir() + "/pdf-ctl-temp-encrypt-out-" + uuid.New().String() + ".pdf"
		defer os.Remove(outPath)
		if err := api.EncryptFile(j, outPath, config); err != nil {
			return err
		}
		result, err := os.Open(outPath)
		if err != nil {
			return err
		}
		defer result.Close()

		info, err := result.Stat()
		if err != nil {
			return err
		}

		outputId := uuid.New()
		storageKey := outputId.String() + "_convert_image.pdf"

		if err := ctx.Storage.Save(storageKey, result); err != nil {
			return err
		}

		outPutFile := models.File{
			ID:          outputId,
			FileName:    fmt.Sprint(storageKey),
			Extension:   "pdf",
			ContentType: "application/pdf",
			SizeBytes:   info.Size(),
			StorageType: inputfiles[i].StorageType,
			StorageKey:  storageKey,
		}

		jobFile := models.JobFile{
			JobID:  job.ID,
			FileID: outPutFile.ID.String(),
			Role:   models.JobFileOutput,
		}
		jobFileOutputs = append(jobFileOutputs, jobFile)
		fileOutputs = append(fileOutputs, outPutFile)
	}

	err1 := ctx.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&jobFileOutputs).Error; err != nil {
			return err
		}
		if err := tx.Create(&fileOutputs).Error; err != nil {
			return err
		}
		return nil
	})

	if err1 != nil {
		return err1
	}

	return nil
}
