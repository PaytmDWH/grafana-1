package sqlstore

import (
  "bytes"
  "fmt"

  "github.com/go-xorm/xorm"
  "github.com/grafana/grafana/pkg/bus"
  "github.com/grafana/grafana/pkg/metrics"
  m "github.com/grafana/grafana/pkg/models"
  "github.com/grafana/grafana/pkg/services/segment_search"
)

func init() {
  bus.AddHandler("sql", SaveSegment)
  bus.AddHandler("sql", GetSegment)
  bus.AddHandler("sql", DeleteSegment)
  bus.AddHandler("sql", SearchSegments)
  bus.AddHandler("sql", GetSegmentTags)
}

func SaveSegment(cmd *m.SaveSegmentCommand) error {
  return inTransaction(func(sess *xorm.Session) error {
    segment := cmd.GetSegmentModel()

    var existing, sameTitle m.Segment

    if segment.Id > 0 {
      segmentWithIdExists, err := sess.Where("id=? AND org_id=?", segment.Id, segment.OrgId).Get(&existing)
      if err != nil {
        return err
      }
      if !segmentWithIdExists {
        return m.ErrSegmentNotFound
      }

      // check for is someone else has written in between
      if segment.Version != existing.Version {
        if cmd.Overwrite {
          segment.Version = existing.Version
        } else {
          return m.ErrSegmentVersionMismatch
        }
      }
    }

    sameTitleExists, err := sess.Where("org_id=? AND slug=?", segment.OrgId, segment.Slug).Get(&sameTitle)
    if err != nil {
      return err
    }

    if sameTitleExists {
      // another dashboard with same name
      if segment.Id != sameTitle.Id {
        if cmd.Overwrite {
          segment.Id = sameTitle.Id
        } else {
          return m.ErrSegmentWithSameNameExists
        }
      }
    }

    affectedRows := int64(0)

    if segment.Id == 0 {
      metrics.M_Models_Segment_Insert.Inc(1)
      affectedRows, err = sess.Insert(segment)
    } else {
      segment.Version += 1
      segment.Data["version"] = segment.Version
      affectedRows, err = sess.Id(segment.Id).Update(segment)
    }

    if affectedRows == 0 {
      return m.ErrSegmentNotFound
    }

    // delete existing tags
    _, err = sess.Exec("DELETE FROM segment_tag WHERE segment_id=?", segment.Id)
    if err != nil {
      return err
    }

    // insert new tags
    tags := segment.GetTags()
    if len(tags) > 0 {
      for _, tag := range tags {
        if _, err := sess.Insert(&SegmentTag{SegmentId: segment.Id, Term: tag}); err != nil {
          return err
        }
      }
    }

    cmd.Result = segment

    return err
  })
}

func GetSegment(query *m.GetSegmentQuery) error {
  segment := m.Segment{Slug: query.Slug, OrgId: query.OrgId}
  has, err := x.Get(&segment)
  if err != nil {
    return err
  } else if has == false {
    return m.ErrSegmentNotFound
  }

  segment.Data["id"] = segment.Id
  query.Result = &segment

  return nil
}

type SegmentSearchProjection struct {
  Id    int64
  Title string
  Slug  string
  Term  string
}

func SearchSegments(query *segment_search.FindPersistedSegmentsQuery) error {
  var sql bytes.Buffer
  params := make([]interface{}, 0)

  sql.WriteString(`SELECT
					  segment.id,
					  segment.title,
					  segment.slug,
					  segment_tag.term
					FROM segment
					LEFT OUTER JOIN segment_tag on segment_tag.segment_id = segment.id`)

  if query.IsStarred {
    sql.WriteString(" INNER JOIN star on segment_star.segment_id = segment.id")
  }

  sql.WriteString(` WHERE segment.org_id=?`)

  params = append(params, query.OrgId)

  if query.IsStarred {
    sql.WriteString(` AND segment_star.user_id=?`)
    params = append(params, query.UserId)
  }

  if len(query.Title) > 0 {
    sql.WriteString(" AND segment.title " + dialect.LikeStr() + " ?")
    params = append(params, "%"+query.Title+"%")
  }

  sql.WriteString(fmt.Sprintf(" ORDER BY segment.title ASC LIMIT 1000"))

  var res []SegmentSearchProjection
  err := x.Sql(sql.String(), params...).Find(&res)
  if err != nil {
    return err
  }

  query.Result = make([]*segment_search.Hit, 0)
  hits := make(map[int64]*segment_search.Hit)

  for _, item := range res {
    hit, exists := hits[item.Id]
    if !exists {
      hit = &segment_search.Hit{
        Id:    item.Id,
        Title: item.Title,
        Uri:   "segment/" + item.Slug,
        Type:  segment_search.SegmentHitDB,
        Tags:  []string{},
      }
      query.Result = append(query.Result, hit)
      hits[item.Id] = hit
    }
    if len(item.Term) > 0 {
      hit.Tags = append(hit.Tags, item.Term)
    }
  }

  return err
}

func GetSegmentTags(query *m.GetSegmentTagsQuery) error {
  sql := `SELECT
					  COUNT(*) as count,
						term
					FROM segment
					INNER JOIN segment_tag on segment_tag.segment_id = segment.id
					WHERE segment.org_id=?
					GROUP BY term`

  query.Result = make([]*m.SegmentTagCloudItem, 0)
  sess := x.Sql(sql, query.OrgId)
  err := sess.Find(&query.Result)
  return err
}

func DeleteSegment(cmd *m.DeleteSegmentCommand) error {
  return inTransaction2(func(sess *session) error {
    segment := m.Segment{Slug: cmd.Slug, OrgId: cmd.OrgId}
    has, err := x.Get(&segment)
    if err != nil {
      return err
    } else if has == false {
      return m.ErrSegmentNotFound
    }

    deletes := []string{
      "DELETE FROM segment_tag WHERE segment_id = ? ",
      "DELETE FROM segment_star WHERE segment_id = ? ",
      "DELETE FROM segment WHERE id = ?",
    }

    for _, sql := range deletes {
      _, err := sess.Exec(sql, segment.Id)
      if err != nil {
        return err
      }
    }

    return nil
  })
}
