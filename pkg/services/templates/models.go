package templates

type Hit struct {
	Id        		int64		 `json:"id"`
	TemplateId    int64    `json:"template_id"`
	TemplateName  string	 `json:"template_name"`
	Text      		string	 `json:"text"`
	Value					string	 `json:"value"`
}

type HitList []*Hit

func (s HitList) Len() int           { return len(s) }
func (s HitList) Swap(i, j int)      { s[i], s[j] = s[j], s[i] }
func (s HitList) Less(i, j int) bool { return s[i].TemplateId < s[j].TemplateId }

type TempQuery struct {
	//Id     int64
	TemplateId      int64
	//TemplateName     string
	//Text    string
	//Value     string

	Result HitList
}

type FindTemplateValuesQuery struct {
	TemplateId     int64

	Result HitList
}
