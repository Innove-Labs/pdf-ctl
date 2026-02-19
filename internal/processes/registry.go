package processes

import "github.com/Innove-Labs/pdf-ctl/internal/models"

var registry = map[models.OperationType]Process{
	models.OperationCompress: &Compress{},
	models.OperationSplit:    &SplitPdf{},
}

func Get(op models.OperationType) (Process, bool) {
	p, ok := registry[op]
	return p, ok
}
