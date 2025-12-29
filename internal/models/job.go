package models

import (
    "time"

    "gorm.io/gorm"
)

type JobStatus string

const (
    StatusPending    JobStatus = "pending"
    StatusProcessing JobStatus = "processing"
    StatusCompleted  JobStatus = "completed"
    StatusFailed     JobStatus = "failed"
)

type OperationType string

const (
	OperationMerge   OperationType = "merge"
	OperationSplit   OperationType = "split"
	OperationCompress OperationType = "compress"
)

type Job struct {
    ID          string         `gorm:"primaryKey;size:36" json:"id"` // UUID
    UserID      *uint          `json:"user_id"`                       // nullable if guest
    Filename    string         `json:"filename"`
    StoragePath string         `json:"storage_path"`
    Status      JobStatus      `gorm:"default:'pending'" json:"status"`
	OperationType OperationType `json:"operation_type"`
	CompletedAt time.Time      `json:"completed_at"`
    CreatedAt   time.Time      `json:"created_at"`
    UpdatedAt   time.Time      `json:"updated_at"`
    DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
