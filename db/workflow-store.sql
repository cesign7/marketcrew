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
