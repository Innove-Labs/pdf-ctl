package types

type PageRange struct {
	From int `json:"from"`
	To   int `json:"to"`
}

type SplitPDFParams struct {
	Mode   string      `json:"mode" binding:"required,oneof=pages all n-pages range"`
	Pages  []int       `json:"pages,omitempty"`
	NPages int         `json:"n_pages,omitempty"`
	Ranges []PageRange `json:"ranges,omitempty"`
}
