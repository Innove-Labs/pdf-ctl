package utils

import (
	"strings"
)

func GetStandardFileName(filename string, fileID string) string {
	standard_name := strings.ReplaceAll(filename, " ", "_")
	standard_name = fileID + "_" + standard_name
	return standard_name
}
