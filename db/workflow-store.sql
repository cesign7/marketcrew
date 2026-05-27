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

CREATE TABLE IF NOT EXISTS ad_brand_mappings (
  id TEXT PRIMARY KEY,
  brand_key TEXT NOT NULL CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT NOT NULL CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  provider_level TEXT NOT NULL CHECK (provider_level IN ('campaign', 'adgroup', 'keyword')),
  provider_id TEXT,
  match_type TEXT NOT NULL CHECK (match_type IN ('provider_id', 'name_prefix', 'name_contains', 'manual')),
  match_value TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'manual',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_ad_report_jobs (
  id TEXT PRIMARY KEY,
  provider_report_job_id TEXT NOT NULL UNIQUE,
  report_type TEXT NOT NULL,
  stat_date DATE NOT NULL,
  status TEXT NOT NULL,
  download_url TEXT,
  status_message TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_ad_report_files (
  id TEXT PRIMARY KEY,
  report_job_id TEXT NOT NULL REFERENCES search_ad_report_jobs(id) ON DELETE CASCADE,
  storage_backend TEXT NOT NULL DEFAULT 'postgres',
  raw_text TEXT NOT NULL,
  checksum TEXT NOT NULL,
  content_type TEXT,
  parser_version TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_job_id, checksum)
);

CREATE TABLE IF NOT EXISTS search_ad_report_rows (
  id TEXT PRIMARY KEY,
  report_file_id TEXT NOT NULL REFERENCES search_ad_report_files(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_row JSONB NOT NULL,
  brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  mapping_status TEXT NOT NULL DEFAULT 'unmapped',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_file_id, row_number)
);

CREATE TABLE IF NOT EXISTS search_ad_report_normalized_rows (
  id TEXT PRIMARY KEY,
  report_row_id TEXT NOT NULL REFERENCES search_ad_report_rows(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  brand_key TEXT NOT NULL CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT NOT NULL CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  campaign_id TEXT,
  campaign_name TEXT,
  adgroup_id TEXT,
  adgroup_name TEXT,
  keyword_id TEXT,
  keyword_text TEXT,
  search_term TEXT,
  impressions NUMERIC NOT NULL DEFAULT 0,
  clicks NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  conversions NUMERIC NOT NULL DEFAULT 0,
  sales_amount NUMERIC NOT NULL DEFAULT 0,
  source_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_ad_campaign_snapshots (
  id TEXT PRIMARY KEY,
  provider_campaign_id TEXT NOT NULL,
  brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  name TEXT NOT NULL,
  campaign_type TEXT,
  user_lock BOOLEAN,
  status TEXT,
  status_reason TEXT,
  raw_payload JSONB NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_campaign_id, collected_at)
);

CREATE TABLE IF NOT EXISTS search_ad_adgroup_snapshots (
  id TEXT PRIMARY KEY,
  provider_adgroup_id TEXT NOT NULL,
  provider_campaign_id TEXT,
  brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  name TEXT NOT NULL,
  adgroup_type TEXT,
  user_lock BOOLEAN,
  status TEXT,
  status_reason TEXT,
  bid_amount NUMERIC,
  daily_budget NUMERIC,
  raw_payload JSONB NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_adgroup_id, collected_at)
);

CREATE TABLE IF NOT EXISTS search_ad_keyword_snapshots (
  id TEXT PRIMARY KEY,
  provider_keyword_id TEXT NOT NULL,
  provider_adgroup_id TEXT,
  brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  keyword_text TEXT NOT NULL,
  user_lock BOOLEAN,
  status TEXT,
  status_reason TEXT,
  bid_amount NUMERIC,
  raw_payload JSONB NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_keyword_id, collected_at)
);

CREATE TABLE IF NOT EXISTS search_ad_ad_snapshots (
  id TEXT PRIMARY KEY,
  provider_ad_id TEXT NOT NULL,
  provider_adgroup_id TEXT,
  brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  name TEXT NOT NULL,
  ad_type TEXT,
  user_lock BOOLEAN,
  status TEXT,
  status_reason TEXT,
  pc_final_url TEXT,
  mobile_final_url TEXT,
  raw_payload JSONB NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_ad_id, collected_at)
);

CREATE TABLE IF NOT EXISTS search_ad_target_snapshots (
  id TEXT PRIMARY KEY,
  provider_target_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('adgroup', 'ad')),
  owner_name TEXT,
  brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  target_type TEXT NOT NULL,
  target_type_label TEXT NOT NULL,
  setting_label TEXT NOT NULL,
  target_payload JSONB NOT NULL,
  raw_payload JSONB NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_target_id, collected_at)
);

CREATE TABLE IF NOT EXISTS search_ad_rule_criteria (
  id TEXT PRIMARY KEY,
  brand_key TEXT NOT NULL CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT NOT NULL CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  period_days INTEGER NOT NULL,
  min_impressions NUMERIC NOT NULL DEFAULT 100,
  min_clicks NUMERIC NOT NULL DEFAULT 10,
  min_cost NUMERIC NOT NULL DEFAULT 10000,
  target_cpa NUMERIC,
  target_roas NUMERIC,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_ad_rule_results (
  id TEXT PRIMARY KEY,
  brand_key TEXT NOT NULL CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT NOT NULL CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  category TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  target_label TEXT NOT NULL,
  severity TEXT NOT NULL,
  period_days INTEGER NOT NULL,
  reason TEXT NOT NULL,
  metrics JSONB NOT NULL,
  evidence_packet JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_ad_action_previews (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('campaign', 'adgroup')),
  target_id TEXT NOT NULL,
  requested_action TEXT NOT NULL CHECK (requested_action IN ('turn_on', 'turn_off')),
  before_state JSONB NOT NULL,
  after_state JSONB NOT NULL,
  impact_summary JSONB NOT NULL,
  write_gate_open BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_ad_action_logs (
  id TEXT PRIMARY KEY,
  preview_id TEXT NOT NULL REFERENCES search_ad_action_previews(id),
  status TEXT NOT NULL CHECK (status IN ('blocked', 'applied', 'failed')),
  provider_request JSONB,
  provider_response JSONB,
  error_message TEXT,
  actor TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_ad_report_jobs_stat_date_idx
  ON search_ad_report_jobs (stat_date DESC, report_type);

CREATE INDEX IF NOT EXISTS search_ad_normalized_brand_type_date_idx
  ON search_ad_report_normalized_rows (brand_key, ad_product_type, source_date DESC);

CREATE INDEX IF NOT EXISTS search_ad_rule_results_brand_category_idx
  ON search_ad_rule_results (brand_key, ad_product_type, category, created_at DESC);

CREATE INDEX IF NOT EXISTS search_ad_campaign_latest_idx
  ON search_ad_campaign_snapshots (provider_campaign_id, collected_at DESC);

CREATE INDEX IF NOT EXISTS search_ad_adgroup_latest_idx
  ON search_ad_adgroup_snapshots (provider_adgroup_id, collected_at DESC);

CREATE INDEX IF NOT EXISTS search_ad_ad_latest_idx
  ON search_ad_ad_snapshots (provider_ad_id, collected_at DESC);

CREATE INDEX IF NOT EXISTS search_ad_target_latest_idx
  ON search_ad_target_snapshots (provider_target_id, collected_at DESC);
