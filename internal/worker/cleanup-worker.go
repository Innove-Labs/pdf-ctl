package worker

import (
	"log"
	"time"

	"github.com/Innove-Labs/pdf-ctl/internal/models"
	"github.com/Innove-Labs/pdf-ctl/internal/storage"
	"gorm.io/gorm"
)

type CleanupWorker struct {
	DB              *gorm.DB
	PollInternal    time.Duration
	Storage         storage.Storage
	CleanUpQuantity int
	CleanUpInterval time.Duration
}

func NewCleanupWorker(db *gorm.DB, pollInterval time.Duration, storage storage.Storage, cleanUpQuantity int, cleanUpInterval time.Duration) *CleanupWorker {
	return &CleanupWorker{
		DB:              db,
		PollInternal:    pollInterval,
		Storage:         storage,
		CleanUpQuantity: cleanUpQuantity,
		CleanUpInterval: cleanUpInterval,
	}
}

func (w *CleanupWorker) Start() {
	log.Println("Starting cleanup worker")

	for {
		w.CleanUp()
		time.Sleep(w.PollInternal)
	}
}

func (w *CleanupWorker) CleanUp() {
	log.Println("Running cleanup job")
	log.Printf("Looking for files older than %s", w.CleanUpInterval)
	now := time.Now()
	cutoff := now.Add(-w.CleanUpInterval)
	log.Printf("Current time: %s", now.Format(time.RFC3339))

	var oldJobsCount int64
	err := w.DB.Model(&models.Job{}).
		Where("created_at < ? AND status IN ?", cutoff, []string{"completed", "failed"}).
		Count(&oldJobsCount).Error
	if err != nil {
		log.Printf("Count query error for jobs: %v", err)
	} else {
		log.Printf("Found %d old jobs to clean up", oldJobsCount)
		if oldJobsCount > 0 {
			w.cleanupOldJobs(cutoff)
		}
	}

	// need to cleanup any stray files not inclued in the job

	var oldFileCount int64
	err = w.DB.Model(&models.File{}).
		Where("created_at < ? AND id NOT IN (SELECT file_id FROM job_files)", cutoff).
		Count(&oldFileCount).Error
	if err != nil {
		log.Printf("Count query error for stray files: %v", err)
		return
	}
	log.Printf("Found %d old stray files to clean up", oldFileCount)
	if oldFileCount == 0 {
		return
	}

	for {
		var files []models.File
		err := w.DB.Where("created_at < ? AND id NOT IN (SELECT file_id FROM job_files)", cutoff).
			Limit(w.CleanUpQuantity).Find(&files).Error
		if err != nil {
			log.Printf("Error fetching stray files for cleanup: %v", err)
			return
		}

		log.Printf("Cleaning up %d stray files", len(files))

		for _, file := range files {
			err := w.Storage.Delete(file.StorageKey)
			if err != nil {
				continue
			}
			err = w.DB.Delete(&file).Error
			if err != nil {
				continue
			}
		}

		if len(files) < w.CleanUpQuantity {
			break
		}
	}
}

func (w *CleanupWorker) cleanupOldJobs(cutoff time.Time) {
	for {
		var jobs []models.Job
		err := w.DB.Where("created_at < ? AND status IN ?", cutoff, []string{"completed", "failed"}).
			Limit(w.CleanUpQuantity).Find(&jobs).Error
		if err != nil {
			log.Printf("Error fetching old jobs: %v", err)
			return
		}
		if len(jobs) == 0 {
			break
		}

		jobIDs := make([]string, len(jobs))
		for i, job := range jobs {
			jobIDs[i] = job.ID
		}

		var oldJobFilesCount int64
		w.DB.Model(&models.JobFile{}).Where("job_id IN ?", jobIDs).Count(&oldJobFilesCount)
		log.Printf("Found %d job-file records for %d jobs", oldJobFilesCount, len(jobs))

		var jobFiles []models.JobFile
		err = w.DB.Where("job_id IN ?", jobIDs).Find(&jobFiles).Error
		if err != nil {
			log.Printf("Error fetching job files: %v", err)
			return
		}

		fileIDs := make([]string, 0, len(jobFiles))
		for _, jf := range jobFiles {
			fileIDs = append(fileIDs, jf.FileID)
		}

		if len(fileIDs) > 0 {
			var oldFilesForJobFilesCount int64
			w.DB.Model(&models.File{}).Where("id IN ?", fileIDs).Count(&oldFilesForJobFilesCount)
			log.Printf("Cleaning up %d files associated with job-files", oldFilesForJobFilesCount)

			var files []models.File
			err = w.DB.Where("id IN ?", fileIDs).Find(&files).Error
			if err != nil {
				log.Printf("Error fetching files for job cleanup: %v", err)
			} else {
				for _, file := range files {
					if err := w.Storage.Delete(file.StorageKey); err != nil {
						log.Printf("Error deleting storage object %s: %v", file.StorageKey, err)
						continue
					}
					if err := w.DB.Delete(&file).Error; err != nil {
						log.Printf("Error deleting file record %s: %v", file.ID, err)
					}
				}
			}
		}

		if err := w.DB.Where("job_id IN ?", jobIDs).Delete(&models.JobFile{}).Error; err != nil {
			log.Printf("Error deleting job-file records: %v", err)
		}

		if err := w.DB.Where("id IN ?", jobIDs).Delete(&models.Job{}).Error; err != nil {
			log.Printf("Error deleting job records: %v", err)
			return
		}

		log.Printf("Cleaned up %d jobs", len(jobs))

		if len(jobs) < w.CleanUpQuantity {
			break
		}
	}
}
