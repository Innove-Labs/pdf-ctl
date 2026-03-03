package processes

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/Innove-Labs/pdf-ctl/internal/models"
	"github.com/Innove-Labs/pdf-ctl/internal/types"
	"github.com/google/uuid"
	"github.com/pdfcpu/pdfcpu/pkg/api"
)

type SplitPdf struct{}

func (s *SplitPdf) Run(ctx Context, job *models.Job) error {
	var params types.SplitPDFParams
	if err := json.Unmarshal([]byte(job.Params), &params); err != nil {
		return err
	}

	var inputFiles []models.JobFile
	if err := ctx.DB.
		Where("job_id = ? AND role = ?", job.ID, models.JobFileInput).
		Order("position ASC").
		Find(&inputFiles).Error; err != nil {
		return err
	}

	if len(inputFiles) != 1 {
		return fmt.Errorf("split expects exactly 1 input")
	}

	var inputFile models.File
	if err := ctx.DB.First(&inputFile, "id = ?", inputFiles[0].FileID).Error; err != nil {
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

	tmpOutDir, err := os.MkdirTemp("", "pdfctl-split-*")
	if err != nil {
		return fmt.Errorf("failed to create temp output dir: %w", err)
	}
	defer os.RemoveAll(tmpOutDir)

	switch params.Mode {
	case "all":
		if err := api.SplitFile(tmpIn.Name(), tmpOutDir, 1, nil); err != nil {
			return fmt.Errorf("pdfcpu split failed: %w", err)
		}
	case "n-pages":
		if params.NPages <= 0 {
			return fmt.Errorf("n_pages must be > 0")
		}
		if err := api.SplitFile(tmpIn.Name(), tmpOutDir, params.NPages, nil); err != nil {
			return fmt.Errorf("pdfcpu split failed: %w", err)
		}
	case "pages":
		if len(params.Pages) == 0 {
			return fmt.Errorf("pages must not be empty")
		}
		if err := api.SplitByPageNrFile(tmpIn.Name(), tmpOutDir, params.Pages, nil); err != nil {
			return fmt.Errorf("pdfcpu split by page nr failed: %w", err)
		}
	case "range":
		if len(params.Ranges) == 0 {
			return fmt.Errorf("ranges must not be empty")
		}
		for i, r := range params.Ranges {
			if r.From <= 0 || r.To < r.From {
				return fmt.Errorf("invalid range[%d]: from=%d to=%d", i, r.From, r.To)
			}
			outFile := filepath.Join(tmpOutDir, fmt.Sprintf("range_%d.pdf", i+1))
			if err := api.TrimFile(tmpIn.Name(), outFile, []string{fmt.Sprintf("%d-%d", r.From, r.To)}, nil); err != nil {
				return fmt.Errorf("pdfcpu trim failed for range[%d]: %w", i, err)
			}
		}
	default:
		return fmt.Errorf("unknown split mode: %s", params.Mode)
	}

	entries, err := os.ReadDir(tmpOutDir)
	if err != nil {
		return fmt.Errorf("failed to read output dir: %w", err)
	}
	if len(entries) == 0 {
		return fmt.Errorf("pdfcpu produced no output files")
	}

	position := 0
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		outPath := filepath.Join(tmpOutDir, entry.Name())
		f, err := os.Open(outPath)
		if err != nil {
			return fmt.Errorf("failed to open output file %s: %w", entry.Name(), err)
		}

		info, err := f.Stat()
		if err != nil {
			f.Close()
			return fmt.Errorf("failed to stat output file %s: %w", entry.Name(), err)
		}

		outputID := uuid.New()
		storageKey := outputID.String() + "_split_" + strconv.Itoa(position+1) + ".pdf"

		if err := ctx.Storage.Save(storageKey, f); err != nil {
			f.Close()
			return fmt.Errorf("failed to save output file: %w", err)
		}
		f.Close()

		outputFile := models.File{
			ID:          outputID,
			FileName:    fmt.Sprintf("split_%d.pdf", position+1),
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
			Position: position,
		}
		if err := ctx.DB.Create(&jobFile).Error; err != nil {
			return err
		}

		position++
	}

	return nil
}
