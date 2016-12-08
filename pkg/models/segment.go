package models

import (
	"errors"
	"strings"
	"time"

	"github.com/gosimple/slug"
)
// Perform migration first. After migration, check whether models are being saved properly or not.
// if models are saved properly then we can introduce interaction with Azkaban.


// Typed errors
var (
	ErrSegmentNotFound           = errors.New("Segment not found")
	ErrSegmentWithSameNameExists = errors.New("A segment with the same name already exists")
	ErrSegmentVersionMismatch    = errors.New("The segment has been changed by someone else")
)

var (
  SegmentTypeJson     = "file"
  SegmentTypeDB       = "db"
  SegmentTypeScript   = "script"
  SegmentTypeSnapshot = "snapshot"
)

type Segment struct {
	Id      int64
	Slug    string
	OrgId   int64
	Version int

	Created time.Time
	Updated time.Time

	UpdatedBy int64

	Title string
	Data  map[string]interface{}
}

func NewSegment(title string) *Segment {
	segment := &Segment{}
	segment.Data = make(map[string]interface{})
	segment.Data["title"] = title
	segment.Title = title
	segment.Created = time.Now()
	segment.Updated = time.Now()
	segment.UpdateSlug()
	return segment
}

func (segment *Segment) UpdateSlug() {
	title := strings.ToLower(segment.Data["title"].(string))
	segment.Slug = slug.Make(title)
}

func (segment *Segment) GetTags() []string {
	jsonTags := segment.Data["tags"]
	if jsonTags == nil || jsonTags == "" {
		return []string{}
	}

	arr := jsonTags.([]interface{})
	b := make([]string, len(arr))
	for i := range arr {
		b[i] = arr[i].(string)
	}
	return b
}


func NewSegmentFromJson(data map[string]interface{}) *Segment {
  segment := &Segment{}
  segment.Data = data
  segment.Title = segment.Data["title"].(string)
  segment.UpdateSlug()

  if segment.Data["id"] != nil {
    segment.Id = int64(segment.Data["id"].(float64))

    if segment.Data["version"] != nil {
      segment.Version = int(segment.Data["version"].(float64))
      segment.Updated = time.Now()
    }
  } else {
    segment.Data["version"] = 0
    segment.Created = time.Now()
    segment.Updated = time.Now()
  }

  return segment
}

func (cmd *SaveSegmentCommand) GetSegmentModel() *Segment {
  segment := NewSegmentFromJson(cmd.Segment)
  segment.OrgId = cmd.OrgId
  segment.UpdatedBy = cmd.UpdatedBy
  segment.UpdateSlug()
  return segment
}


func (segment *Segment) GetString(prop string) string {
  return segment.Data[prop].(string)
}


//
// COMMANDS
//

type SaveSegmentCommand struct {
  Segment map[string]interface{} `json:"segment" binding:"Required"`
  Overwrite bool                   `json:"overwrite"`
  OrgId     int64                  `json:"-"`
  UpdatedBy int64                  `json:"-"`

  Result *Segment
}

type DeleteSegmentCommand struct {
  Slug  string
  OrgId int64
}

//
// QUERIES
//

type GetSegmentQuery struct {
  Slug  string
  OrgId int64

  Result *Segment
}

type Segments []*Segment

type SegmentTagCloudItem struct {
  Term  string `json:"term"`
  Count int    `json:"count"`
}

type GetSegmentTagsQuery struct {
  OrgId  int64
  Result []*SegmentTagCloudItem
}

type GetSegmentsQuery struct{
  Name  string
  Limit int
  OrgId int64

  Result Segments
}
