// pkg/db/db.go
package db

import (
	"fmt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func NewSQLite(path string) (*gorm.DB, error) {
	fmt.Println("Initializing SQLite DB", path)
    gdb, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	
	DB = gdb
    return gdb, err
}
