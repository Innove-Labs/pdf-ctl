package processes

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/Innove-Labs/pdf-ctl/internal/models"
	"github.com/Innove-Labs/pdf-ctl/internal/types"
	"github.com/google/uuid"
	"github.com/pdfcpu/pdfcpu/pkg/api"
	pdfCpuTypes "github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"
	"gorm.io/gorm"
)

type ImageToPdf struct{}

func (c *ImageToPdf) Run(ctx Context, job *models.Job) error {

	var jobFiles []models.JobFile

	if err := ctx.DB.
		Where("job_id = ? AND role = ?", job.ID, models.JobFileInput).
		Order("position ASC").
		Find(&jobFiles).Error; err != nil {
		return err
	}

	fileIds := make([]string, len(jobFiles))

	for i, j := range jobFiles {
		fileIds[i] = j.FileID
	}

	var inputFiles []models.File

	if err := ctx.DB.Where("id IN (?)", fileIds).Find(&inputFiles).Error; err != nil {
		return err
	}

	tempInFiles := make([]string, len(inputFiles))

	for i, f := range inputFiles {
		reader, err := ctx.Storage.Load(f.StorageKey)
		if err != nil {
			return err
		}
		defer reader.Close()

		tempFileName := "pdf-ctl-image-to-pdf-in-*" + f.Extension

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

	configs, _ := api.Import("form:A3, pos:c, s:1.0", pdfCpuTypes.POINTS)

	var params types.ConvertImageParams

	if err := json.Unmarshal([]byte(job.Params), &params); err != nil {
		return err
	}

	if params.MergeIntoOne == true {
		outPath := os.TempDir() + "/pdf-ctl-image-to-pdf-out-" + uuid.New().String() + ".pdf"
		defer os.Remove(outPath)

		if err := api.ImportImagesFile(tempInFiles, outPath, configs, nil); err != nil {
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
			StorageType: inputFiles[0].StorageType,
			StorageKey:  storageKey,
		}

		if err := ctx.DB.Create(&outPutFile).Error; err != nil {
			return err
		}

		jobFile := models.JobFile{
			JobID:  job.ID,
			FileID: outPutFile.ID.String(),
			Role:   models.JobFileOutput,
		}

		if err := ctx.DB.Create(&jobFile).Error; err != nil {
			return err
		}
		return nil
	}

	var outPutDBFiles []models.File
	var outPutDBJobFiles []models.JobFile

	for i, j := range tempInFiles {
		outPath := os.TempDir() + "/pdf-ctl-image-to-pdf-out-" + uuid.New().String() + ".pdf"

		if err := api.ImportImagesFile([]string{j}, outPath, configs, nil); err != nil {
			return err
		}

		result, err := os.Open(outPath)
		if err != nil {
			return err
		}

		info, err := result.Stat()
		if err != nil {
			result.Close()
			os.Remove(outPath)
			return err
		}

		outputId := uuid.New()
		storageKey := outputId.String() + "_convert_image" + string(rune('0'+i)) + ".pdf"

		if err := ctx.Storage.Save(storageKey, result); err != nil {
			result.Close()
			os.Remove(outPath)
			return err
		}
		result.Close()
		os.Remove(outPath)

		outPutFile := models.File{
			ID:          outputId,
			FileName:    fmt.Sprint(storageKey),
			Extension:   "pdf",
			ContentType: "application/pdf",
			SizeBytes:   info.Size(),
			StorageType: inputFiles[0].StorageType,
			StorageKey:  storageKey,
		}

		jobFile := models.JobFile{
			JobID:  job.ID,
			FileID: outPutFile.ID.String(),
			Role:   models.JobFileOutput,
		}

		outPutDBFiles = append(outPutDBFiles, outPutFile)
		outPutDBJobFiles = append(outPutDBJobFiles, jobFile)
	}

	err := ctx.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&outPutDBFiles).Error; err != nil {
			return err
		}
		if err := tx.Create(&outPutDBJobFiles).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return err
	}

	return nil
}
