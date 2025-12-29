package storage

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
)

type LocalStorage struct {
	BasePath string
}

func NewLocal(basePath string) (*LocalStorage, error) {
	if basePath == "" {
		return nil, fmt.Errorf("storage base path is empty")
	}

	if err := os.MkdirAll(basePath, 0o750); err != nil {
		return nil, err
	}

	return &LocalStorage{BasePath: basePath}, nil
}

func (l *LocalStorage) filePath(id string) string {
	return filepath.Join(l.BasePath, id)
}

func (l *LocalStorage) Save(id string, r io.Reader) error {
	path := l.filePath(id)

	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	defer f.Close()

	_, err = io.Copy(f, r)
	return err
}

func (l *LocalStorage) Load(id string) (io.ReadCloser, error) {
	return os.Open(l.filePath(id))
}

func (l *LocalStorage) Delete(id string) error {
	err := os.Remove(l.filePath(id))
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

func (l *LocalStorage) Exists(id string) bool {
	_, err := os.Stat(l.filePath(id))
	return err == nil
}
