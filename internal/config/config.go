package config

import (
	"log"
	"os"
	"strconv"
	"time"
)

type Config struct {
	// Server
	HTTPAddr string

	// Files & storage
	MaxFileSizeMB    int64
	StoragePath      string
	FileTTL          time.Duration
	DeleteOnDownload bool

	// Limits
	AnonMaxJobsPerHour int
	UserMaxJobsPerHour int

	// Environment
	Env string

	// Database
	SqlLitePath string
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		i, err := strconv.Atoi(v)
		if err != nil {
			log.Fatalf("invalid int for %s", key)
		}
		return i
	}
	return def
}

func getEnvInt64(key string, def int64) int64 {
	if v := os.Getenv(key); v != "" {
		i, err := strconv.ParseInt(v, 10, 64)
		if err != nil {
			log.Fatalf("invalid int64 for %s", key)
		}
		return i
	}
	return def
}

func getEnvBool(key string, def bool) bool {
	if v := os.Getenv(key); v != "" {
		b, err := strconv.ParseBool(v)
		if err != nil {
			log.Fatalf("invalid bool for %s", key)
		}
		return b
	}
	return def
}

func getEnvDuration(key string, def time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil {
			log.Fatalf("invalid duration for %s", key)
		}
		return d
	}
	return def
}

func (c *Config) validate() {
	if c.MaxFileSizeMB <= 0 {
		log.Fatal("MAX_FILE_SIZE_MB must be > 0")
	}
	if c.FileTTL <= 0 {
		log.Fatal("FILE_TTL must be > 0")
	}
}



func Load() *Config {
	cfg := &Config{
		HTTPAddr:           getEnv("HTTP_ADDR", ":8080"),
		StoragePath:        getEnv("STORAGE_PATH", "./tmp"),
		Env:                getEnv("ENV", "dev"),
		DeleteOnDownload:   getEnvBool("DELETE_ON_DOWNLOAD", true),
		MaxFileSizeMB:      getEnvInt64("MAX_FILE_SIZE_MB", 50),
		AnonMaxJobsPerHour: getEnvInt("ANON_MAX_JOBS_PER_HOUR", 5),
		UserMaxJobsPerHour: getEnvInt("USER_MAX_JOBS_PER_HOUR", 50),
		FileTTL:            getEnvDuration("FILE_TTL", 10*time.Minute),
		SqlLitePath:      getEnv("SQLITE_PATH", "./DB/pdfctl.db"),
	}

	cfg.validate()
	return cfg
}

