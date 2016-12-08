package segment_search

import (
	"sort"

	"github.com/grafana/grafana/pkg/bus"
	m "github.com/grafana/grafana/pkg/models"
)

func init() {
	bus.AddHandler("segment_search", searchSegmentHandler)
}

func searchSegmentHandler(query *SegmentQuery) error {
	hits := make(HitList, 0)

	segmentQuery := FindPersistedSegmentsQuery{
		Title:     query.Title,
		UserId:    query.UserId,
		IsStarred: query.IsStarred,
		OrgId:     query.OrgId,
	}

	if err := bus.Dispatch(&segmentQuery); err != nil {
		return err
	}

	hits = append(hits, segmentQuery.Result...)

	// filter out results with tag filter
	if len(query.Tags) > 0 {
		filtered := HitList{}
		for _, hit := range hits {
			if hasRequiredTags(query.Tags, hit.Tags) {
				filtered = append(filtered, hit)
			}
		}
		hits = filtered
	}

	// sort main result array
	sort.Sort(hits)

	if len(hits) > query.Limit {
		hits = hits[0:query.Limit]
	}

	// sort tags
	for _, hit := range hits {
		sort.Strings(hit.Tags)
	}

	// add isStarred info
	if err := setIsStarredFlagOnSearchResults(query.UserId, hits); err != nil {
		return err
	}

	query.Result = hits
	return nil
}

func stringInSlice(a string, list []string) bool {
	for _, b := range list {
		if b == a {
			return true
		}
	}
	return false
}

func hasRequiredTags(queryTags, hitTags []string) bool {
	for _, queryTag := range queryTags {
		if !stringInSlice(queryTag, hitTags) {
			return false
		}
	}

	return true
}

func setIsStarredFlagOnSearchResults(userId int64, hits []*Hit) error {
	query := m.GetUserSegmentStarsQuery{UserId: userId}
	if err := bus.Dispatch(&query); err != nil {
		return err
	}

	for _, segment := range hits {
		if _, exists := query.Result[segment.Id]; exists {
      segment.IsStarred = true
		}
	}

	return nil
}
