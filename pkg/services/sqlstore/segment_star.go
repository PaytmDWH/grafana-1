package sqlstore

import (
	"github.com/go-xorm/xorm"

	"github.com/grafana/grafana/pkg/bus"
	m "github.com/grafana/grafana/pkg/models"
)

func init() {
	bus.AddHandler("sql", StarSegment)
	bus.AddHandler("sql", UnstarSegment)
	bus.AddHandler("sql", GetUserSegmentStars)
	bus.AddHandler("sql", IsSegmentStarredByUser)
}

func IsSegmentStarredByUser(query *m.IsSegmentStarredByUserQuery) error {
	rawSql := "SELECT 1 from segment_star where user_id=? and segment_id=?"
	results, err := x.Query(rawSql, query.UserId, query.SegmentId)

	if err != nil {
		return err
	}

	if len(results) == 0 {
		return nil
	}

	query.Result = true

	return nil
}

func StarSegment(cmd *m.StarSegmentCommand) error {
	if cmd.SegmentId == 0 || cmd.UserId == 0 {
		return m.ErrCommandValidationFailed
	}

	return inTransaction(func(sess *xorm.Session) error {

		entity := m.SegmentStar{
			UserId:      cmd.UserId,
			SegmentId: cmd.SegmentId,
		}

		_, err := sess.Insert(&entity)
		return err
	})
}

func UnstarSegment(cmd *m.UnstarSegmentCommand) error {
	if cmd.SegmentId == 0 || cmd.UserId == 0 {
		return m.ErrCommandValidationFailed
	}

	return inTransaction(func(sess *xorm.Session) error {
		var rawSql = "DELETE FROM segment_star WHERE user_id=? and segment_id=?"
		_, err := sess.Exec(rawSql, cmd.UserId, cmd.SegmentId)
		return err
	})
}

func GetUserSegmentStars(query *m.GetUserSegmentStarsQuery) error {
	var stars = make([]m.SegmentStar, 0)
	err := x.Where("user_id=?", query.UserId).Find(&stars)

	query.Result = make(map[int64]bool)
	for _, star := range stars {
		query.Result[star.SegmentId] = true
	}

	return err
}
