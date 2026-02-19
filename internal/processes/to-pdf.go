// converts a file to pdf
package processes

import (
	"github.com/Innove-Labs/pdf-ctl/internal/models"
)

type ToPdf struct{}

func (t *ToPdf) Run(ctx Context, job *models.Job) error {
	return nil
}
