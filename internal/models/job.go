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
	OperationMerge    OperationType = "merge"
	OperationSplit    OperationType = "split"
	OperationCompress OperationType = "compress"
)

type Job struct {
	ID string `gorm:"primaryKey;size:36" json:"id"` // UUID string

	// Ownership
	UserID *uint `gorm:"index" json:"user_id"`

	// Operation
	OperationType OperationType `gorm:"size:20;index" json:"operation_type"`

	// Operation params (JSON for flexibility)
	Params string `gorm:"type:text" json:"params"`

	// Status
	Status JobStatus `gorm:"size:20;index;default:'pending'" json:"status"`

	ErrorMessage *string `gorm:"type:text" json:"error_message"`

	StartedAt   *time.Time `json:"started_at"`
	CompletedAt *time.Time `json:"completed_at"`

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
