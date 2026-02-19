package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type File struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey"`

	// Original file info
	FileName    string `gorm:"size:255;not null"`
	ContentType string `gorm:"size:100"`
	Extension   string `gorm:"size:20"`
	SizeBytes   int64  `gorm:"not null"`

	// Storage info
	StorageType string `gorm:"size:50;not null"` // s3, gcs, local, etc.
	Bucket          string `gorm:"size:255"`
	StorageKey       string `gorm:"size:1024;not null"` // path/key in storage

	// Optional ownership / linking
	UserID *uint `gorm:"index"`

	// Metadata / lifecycle
	Checksum string `gorm:"size:64"` // sha256, md5, etc.

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

// BeforeCreate ensures UUID is set
func (f *File) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return nil
}
