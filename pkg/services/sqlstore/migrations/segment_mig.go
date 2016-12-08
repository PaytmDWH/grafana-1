package migrations

import . "github.com/grafana/grafana/pkg/services/sqlstore/migrator"

func addSegmentMigration(mg *Migrator) {
  var segmentV1 = Table{
    Name: "segment",
    Columns: []*Column{
      {Name: "id", Type: DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
      {Name: "version", Type: DB_Int, Nullable: false},
      {Name: "slug", Type: DB_NVarchar, Length: 255, Nullable: false},
      {Name: "title", Type: DB_NVarchar, Length: 255, Nullable: false},
      {Name: "data", Type: DB_MediumText, Nullable: false},
      {Name: "org_id", Type: DB_BigInt, Nullable: false},
      {Name: "created", Type: DB_DateTime, Nullable: false},
      {Name: "updated", Type: DB_DateTime, Nullable: false},
      {Name: "updated_by", Type: DB_Int, Nullable: true},
    },
    Indices: []*Index{
      {Cols: []string{"org_id"}},
      {Cols: []string{"org_id", "slug"}, Type: UniqueIndex},
    },
  }

  // recreate table
  mg.AddMigration("create segment v1", NewAddTableMigration(segmentV1))
  // recreate indices
  addTableIndicesMigrations(mg, "v2", segmentV1)

  segmentTagV1 := Table{
    Name: "segment_tag",
    Columns: []*Column{
      {Name: "id", Type: DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
      {Name: "segment_id", Type: DB_BigInt, Nullable: false},
      {Name: "term", Type: DB_NVarchar, Length: 50, Nullable: false},
    },
    Indices: []*Index{
      {Cols: []string{"segment_id", "term"}, Type: UniqueIndex},
    },
  }

  mg.AddMigration("create segment_tag table", NewAddTableMigration(segmentTagV1))
  mg.AddMigration("add unique index segment_tag.segment_id_term", NewAddIndexMigration(segmentTagV1, segmentTagV1.Indices[0]))

}
func addStarForSegmentMigrations(mg *Migrator) {
  starSegmentsV1 := Table{
    Name: "segment_star",
    Columns: []*Column{
      {Name: "id", Type: DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
      {Name: "user_id", Type: DB_BigInt, Nullable: false},
      {Name: "segment_id", Type: DB_BigInt, Nullable: false},
    },
    Indices: []*Index{
      {Cols: []string{"user_id", "segment_id"}, Type: UniqueIndex},
    },
  }

  mg.AddMigration("create segment star table", NewAddTableMigration(starSegmentsV1))
  mg.AddMigration("add unique index segment_star.user_id_segment_id", NewAddIndexMigration(starSegmentsV1, starSegmentsV1.Indices[0]))
}
