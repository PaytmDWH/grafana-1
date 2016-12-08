package models


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
	SegmentId int64
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
