package templates

import (
	//"sort"

	"github.com/grafana/grafana/pkg/bus"
	//m "github.com/grafana/grafana/pkg/models"
	//"github.com/grafana/grafana/pkg/setting"
)


func Init() {
	bus.AddHandler("templates", templatesHandler)
}

func templatesHandler(query *TempQuery	) error {
	hits := make(HitList, 0)

	dashQuery := TempQuery{
		TemplateId:    query.TemplateId,

	}

	if err := bus.Dispatch(&dashQuery); err != nil {
		return err
	}

	hits = append(hits, dashQuery.Result...)

	// sort data
	//for _, hit := range hits {
	//	sort.Strings(hit.Text)
	//}

	query.Result = hits
	return nil
}


