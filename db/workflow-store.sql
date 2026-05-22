CREATE TABLE IF NOT EXISTS workflow_records (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS workflow_records_collection_updated_idx
  ON workflow_records (collection, updated_at DESC);

CREATE INDEX IF NOT EXISTS workflow_records_payload_gin_idx
  ON workflow_records USING GIN (payload_json);

CREATE TABLE IF NOT EXISTS workflow_migration_batches (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  status TEXT NOT NULL,
  counts_json JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  error_message TEXT
);
