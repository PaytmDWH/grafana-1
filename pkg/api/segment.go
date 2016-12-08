package api

import (
	"encoding/json"
	"os"
	"path"
	"strings"

	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/metrics"
	"github.com/grafana/grafana/pkg/middleware"
	m "github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/search"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/util"
)

func isSegmentStarredByUser(c *middleware.Context, segmentId int64) (bool, error) {
	if !c.IsSignedIn {
		return false, nil
	}

	query := m.IsSegmentStarredByUserQuery{UserId: c.UserId, SegmentId: segmentId}
	if err := bus.Dispatch(&query); err != nil {
		return false, err
	}

	return query.Result, nil
}

func GetSegment(c *middleware.Context) {
	metrics.M_Api_Segment_Get.Inc(1)

	slug := strings.ToLower(c.Params(":slug"))

	query := m.GetSegmentQuery{Slug: slug, OrgId: c.OrgId}
	err := bus.Dispatch(&query)
	if err != nil {
		c.JsonApiErr(404, "Segment not found", nil)
		return
	}

	isSegmentStarred, err := isSegmentStarredByUser(c, query.Result.Id)
	if err != nil {
		c.JsonApiErr(500, "Error while checking if segment was starred by user", err)
		return
	}

	segment := query.Result

	// Finding the last updater of the dashboard
	updater := "Anonymous"
	if segment.UpdatedBy != 0 {
		userQuery := m.GetUserByIdQuery{Id: segment.UpdatedBy}
		userErr := bus.Dispatch(&userQuery)
		if userErr != nil {
			updater = "Unknown"
		} else {
			user := userQuery.Result
			updater = user.Login
		}
	}

	dto := dtos.SegmentFullWithMeta{
		Segment: segment.Data,
		Meta: dtos.SegmentMeta{
      IsSegmentStarred: isSegmentStarred,
			Slug:      slug,
			CanStar:   c.IsSignedIn,
			CanSave:   c.OrgRole == m.ROLE_ADMIN || c.OrgRole == m.ROLE_EDITOR,
			CanEdit:   canEditDashboard(c.OrgRole),
			Created:   segment.Created,
			Updated:   segment.Updated,
			UpdatedBy: updater,
		},
	}

	c.JSON(200, dto)
}

func DeleteSegment(c *middleware.Context) {
	slug := c.Params(":slug")

	query := m.GetSegmentQuery{Slug: slug, OrgId: c.OrgId}
	if err := bus.Dispatch(&query); err != nil {
		c.JsonApiErr(404, "Segment not found", nil)
		return
	}

	cmd := m.DeleteSegmentCommand{Slug: slug, OrgId: c.OrgId}
	if err := bus.Dispatch(&cmd); err != nil {
		c.JsonApiErr(500, "Failed to delete segment", err)
		return
	}

	var resp = map[string]interface{}{"title": query.Result.Title}

	c.JSON(200, resp)
}

func PostSegment(c *middleware.Context, cmd m.SaveSegmentCommand) {
	cmd.OrgId = c.OrgId

	if !c.IsSignedIn {
		cmd.UpdatedBy = 0
	} else {
		cmd.UpdatedBy = c.UserId
	}

	segment := cmd.GetSegmentModel()
	if segment.Id == 0 {
		limitReached, err := middleware.QuotaReached(c, "segment")
		if err != nil {
			c.JsonApiErr(500, "failed to get quota", err)
			return
		}
		if limitReached {
			c.JsonApiErr(403, "Quota reached", nil)
			return
		}
	}

	err := bus.Dispatch(&cmd)
	if err != nil {
		if err == m.ErrSegmentWithSameNameExists {
			c.JSON(412, util.DynMap{"status": "name-exists", "message": err.Error()})
			return
		}
		if err == m.ErrSegmentVersionMismatch {
			c.JSON(412, util.DynMap{"status": "version-mismatch", "message": err.Error()})
			return
		}
		if err == m.ErrSegmentNotFound {
			c.JSON(404, util.DynMap{"status": "not-found", "message": err.Error()})
			return
		}
		c.JsonApiErr(500, "Failed to save segment", err)
		return
	}

	metrics.M_Api_Segment_Post.Inc(1)

	c.JSON(200, util.DynMap{"status": "success", "slug": cmd.Result.Slug, "version": cmd.Result.Version})
}

func canEditSegment(role m.RoleType) bool {
	return role == m.ROLE_ADMIN || role == m.ROLE_EDITOR || role == m.ROLE_READ_ONLY_EDITOR
}

/*func GetSegmentFromJsonFile(c *middleware.Context) {
	file := c.Params(":file")

	segment := search.GetSegmentFromJsonIndex(file)
	if segment == nil {
		c.JsonApiErr(404, "Segment not found", nil)
		return
	}

	seg := dtos.SegmentFullWithMeta{Segment: segment.Data}
	seg.Meta.Type = m.SegmentTypeJson
	seg.Meta.CanEdit = canEditSegment(c.OrgRole)

	c.JSON(200, &seg)
}*/

func GetSegmentTags(c *middleware.Context) {
	query := m.GetSegmentTagsQuery{OrgId: c.OrgId}
	err := bus.Dispatch(&query)
	if err != nil {
		c.JsonApiErr(500, "Failed to get tags from segment", err)
		return
	}

	c.JSON(200, query.Result)
}
