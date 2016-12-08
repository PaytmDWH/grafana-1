package models

import "errors"

var ErrCommandValidationFailed = errors.New("Command missing required fields")

type SegmentStar struct {
	Id          int64
	UserId      int64
	SegmentId int64
}

// ----------------------
// COMMANDS

type StarSegmentCommand struct {
	UserId      int64
	SegmentId int64
}

type UnstarSegmentCommand struct {
	UserId      int64
	DashboardId int64
}

// ---------------------
// QUERIES

type GetUserSegmentStarsQuery struct {
	UserId int64

	Result map[int64]bool // dashboard ids
}

type IsSegmentStarredByUserQuery struct {
	UserId      int64
	SegmentId int64

	Result bool
}
