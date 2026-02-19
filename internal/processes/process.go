package processes

import (
	"github.com/Innove-Labs/pdf-ctl/internal/models"
	"github.com/Innove-Labs/pdf-ctl/internal/storage"
	"gorm.io/gorm"
)

type Context struct {
	DB      *gorm.DB
	Storage storage.Storage
}

type Process interface {
	Run(ctx Context, job *models.Job) error
}
