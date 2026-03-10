package types

type EncryptPdfRequestParams struct {
	Files    []FileWithPosition `json:"files" binding:"required,dive"`
	Password string             `json:"password" binding:"required"`
}

type EncryptPdfParams struct {
	Password string `json:"password"`
}
