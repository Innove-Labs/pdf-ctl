package models

import "time"

type JobFileRole string

const (
	JobFileInput  JobFileRole = "input"
	JobFileOutput JobFileRole = "output"
)

type JobFile struct {
	ID uint `gorm:"primaryKey"`

	// Relationships
	JobID  string `gorm:"size:36;not null;index"`
	FileID string `gorm:"size:36;not null;index"`

	// Semantics
	Role     JobFileRole `gorm:"size:10;not null;index"` // input | output
	Position int         `gorm:"not null"`               // order within role

	CreatedAt time.Time
}
