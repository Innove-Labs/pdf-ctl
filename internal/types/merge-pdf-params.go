package types

type MergePdfFiles struct {
	FileID   string `json:"file_id" binding:"required"`
	Position int    `json:"position" binding:"required"`
}

type MergePdfRequestParams struct {
	Files []MergePdfFiles `json:"files" binding:"required,dive"`
}
