package storage

import "io"

// Backend defines how pdfctl stores files.
// This lets us support local disk, memory, S3, etc.
type Storage interface {
	Save(id string, r io.Reader) error
	Load(id string) (io.ReadCloser, error)
	Delete(id string) error
	Exists(id string) bool
}
