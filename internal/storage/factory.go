package storage

import "fmt"

type LocalConfig struct {
	BasePath string
}

type S3Config struct {
	Bucket string
	Region string
	Prefix string
}

type Config struct {
	StorageType string
	Local       LocalConfig
	S3          S3Config
}


func New(cfg Config) (Storage, error) {
	switch cfg.StorageType {
	case "local":
		return NewLocal(cfg.Local.BasePath)

	case "s3":
		return NewS3(
			cfg.S3.Bucket,
			cfg.S3.Region,
			cfg.S3.Prefix,
		)

	default:
		return nil, fmt.Errorf("unknown storage backend: %s", cfg.StorageType)
	}
}
