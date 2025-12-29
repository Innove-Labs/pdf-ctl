package models

import (
    "time"

    "gorm.io/gorm"
)

type AuthMethod string

const (
    AuthMagicLink   AuthMethod = "magic_link"
    AuthCredentials AuthMethod = "credentials"
)

type Session struct {
    ID         uint           `gorm:"primaryKey" json:"id"`
    UserID     uint           `gorm:"index" json:"user_id"`
    Token      string         `gorm:"uniqueIndex;size:255" json:"token"` // JWT or magic link token
    ExpiresAt  time.Time      `json:"expires_at"`
    AuthMethod AuthMethod     `gorm:"default:'credentials'" json:"auth_method"`
    CreatedAt  time.Time      `json:"created_at"`
    UpdatedAt  time.Time      `json:"updated_at"`
    DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

    User       User           `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
}
