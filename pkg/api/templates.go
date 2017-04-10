package api

import (
	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/middleware"
	"github.com/grafana/grafana/pkg/services/templates"
	"fmt"
	"reflect"
	"strconv"
)

func TemplateSearch(c *middleware.Context) {
	fmt.Println(c)
	templateIdStr := c.Query("templateId")
	templateId,_ := strconv.ParseInt(templateIdStr,10,64)

	templateQuery := templates.TempQuery{
		TemplateId:     templateId,
	}

	err := bus.Dispatch(&templateQuery)
	if err != nil {
		c.JsonApiErr(500, "Search failed", err)
		return
	}

	c.JSON(200, templateQuery.Result)
}
