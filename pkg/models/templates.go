package models

type TemplateHit struct {
	Id        		int64		 `json:"id"`
	TemplateId    int64    `json:"template_id"`
	TemplateName  string	 `json:"template_name"`
	Text      		string	 `json:"text"`
	Value					string	 `json:"value"`
}
