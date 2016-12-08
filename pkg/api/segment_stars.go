package api

import (
	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/middleware"
	m "github.com/grafana/grafana/pkg/models"
)

func StarSegment(c *middleware.Context) Response {
	if !c.IsSignedIn {
		return ApiError(412, "You need to sign in to star segments", nil)
	}

	cmd := m.StarSegmentCommand{UserId: c.UserId, SegmentId: c.ParamsInt64(":id")}

	if cmd.SegmentId <= 0 {
		return ApiError(400, "Missing segment id", nil)
	}

	if err := bus.Dispatch(&cmd); err != nil {
		return ApiError(500, "Failed to star segment", err)
	}

	return ApiSuccess("Segment starred!")
}

func UnstarSegment(c *middleware.Context) Response {

	cmd := m.UnstarSegmentCommand{UserId: c.UserId, SegmentId: c.ParamsInt64(":id")}

	if cmd.SegmentId <= 0 {
		return ApiError(400, "Missing segment id", nil)
	}

	if err := bus.Dispatch(&cmd); err != nil {
		return ApiError(500, "Failed to unstar segment", err)
	}

	return ApiSuccess("Segment unstarred")
}
