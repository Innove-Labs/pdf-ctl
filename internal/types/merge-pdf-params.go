package types

type MergePdfRequestParams struct {
	Files []FileWithPosition `json:"files" binding:"required,dive"`
}
