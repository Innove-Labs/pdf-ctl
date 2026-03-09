package types

type OrientationType string

const (
	OrientationPortrait  OrientationType = "portrait"
	OrientationLandscape OrientationType = "landscape"
)

type PageSizeType string

const (
	PageSizeA4 PageSizeType = "A4"
)

type FileWithPosition struct {
	FileID   string `json:"file_id" binding:"required"`
	Position int    `json:"position" binding:"required"`
}

type ConvertImagesToPdfRequestParams struct {
	Files        []FileWithPosition `json:"files" binding:"required"`
	Orientation  OrientationType    `json:"orientation"`
	PageSize     PageSizeType       `json:"page_size"`
	MergeIntoOne bool               `json:"merge_into_one"`
}

type ConvertImageParams struct {
	Orientation  OrientationType `json:"orientation"`
	PageSize     PageSizeType    `json:"page_size"`
	MergeIntoOne bool            `json:"merge_into_one"`
}
