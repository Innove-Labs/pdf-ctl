package types

type FileWithPosition struct {
	FileID   string `json:"file_id" binding:"required"`
	Position int    `json:"position" binding:"required"`
}
