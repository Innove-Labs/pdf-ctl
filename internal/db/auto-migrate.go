package db

import (
    "github.com/Innove-Labs/pdf-ctl/internal/models"
    "gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB) error {
    return db.AutoMigrate(&models.User{}, &models.Session{}, &models.Job{})
}
