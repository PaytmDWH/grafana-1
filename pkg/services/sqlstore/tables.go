package sqlstore

// extra tables not required by the core/outside model

type DashboardTag struct {
	Id          int64
	DashboardId int64
	Term        string
}

type SegmentTag struct {
  Id          int64
  SegmentId int64
  Term        string
}
