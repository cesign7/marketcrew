import { query as defaultQuery } from "@/lib/persistence/postgres";

export type ProductImageStudioSqlQuery = (
  text: string,
  values?: unknown[],
) => Promise<{ readonly rows: readonly Readonly<Record<string, unknown>>[] }>;

const PRODUCT_IMAGE_STUDIO_SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS product_image_studio_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      product_type TEXT NOT NULL CHECK (product_type IN ('card_envelope_seal_set')),
      card_format TEXT NOT NULL CHECK (card_format IN ('folded_card', 'postcard_flat')),
      production_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      requested_card_poses JSONB NOT NULL DEFAULT '[]'::jsonb,
      requested_outputs JSONB NOT NULL DEFAULT '[]'::jsonb,
      ratios JSONB NOT NULL DEFAULT '[]'::jsonb,
      quality_mode TEXT NOT NULL CHECK (quality_mode IN ('draft', 'high')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `,
  `
    ALTER TABLE product_image_studio_projects
    ADD COLUMN IF NOT EXISTS production_settings JSONB NOT NULL DEFAULT '{}'::jsonb
  `,
  `
    CREATE TABLE IF NOT EXISTS product_image_studio_assets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES product_image_studio_projects(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN (
        'folded_card_outer_front',
        'folded_card_inner_spread',
        'folded_card_back',
        'folded_card_fold_metadata',
        'postcard_front',
        'postcard_back',
        'envelope_front',
        'envelope_inside_flap',
        'seal_sticker',
        'reference_mood'
      )),
      original_file_name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
      storage_key TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS product_image_studio_generation_requests (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES product_image_studio_projects(id) ON DELETE CASCADE,
      concept_id TEXT NOT NULL,
      quality_mode TEXT NOT NULL CHECK (quality_mode IN ('draft', 'high')),
      requested_outputs JSONB NOT NULL DEFAULT '[]'::jsonb,
      requested_card_poses JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL CHECK (status IN ('queued', 'generating_scene', 'compositing_design', 'ready', 'blocked', 'failed')),
      provider_request_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
      provider_response_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS product_image_studio_results (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES product_image_studio_projects(id) ON DELETE CASCADE,
      generation_request_id TEXT NOT NULL REFERENCES product_image_studio_generation_requests(id) ON DELETE CASCADE,
      output_type TEXT NOT NULL CHECK (output_type IN ('set_combined', 'card_single', 'envelope_single', 'seal_sticker_single')),
      card_pose TEXT,
      ratio_preset TEXT NOT NULL,
      custom_width INTEGER,
      custom_height INTEGER,
      width INTEGER NOT NULL CHECK (width > 0),
      height INTEGER NOT NULL CHECK (height > 0),
      storage_key TEXT NOT NULL,
      provider_result_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS product_image_studio_download_bundles (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES product_image_studio_projects(id) ON DELETE CASCADE,
      result_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      storage_key TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS product_image_studio_usage_records (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES product_image_studio_projects(id) ON DELETE CASCADE,
      generation_request_id TEXT REFERENCES product_image_studio_generation_requests(id) ON DELETE SET NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      quality_mode TEXT NOT NULL CHECK (quality_mode IN ('draft', 'high')),
      image_count INTEGER NOT NULL CHECK (image_count >= 0),
      estimated_cost_cents NUMERIC NOT NULL DEFAULT 0,
      usage_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `,
] as const;

const PRODUCT_IMAGE_STUDIO_INDEX_STATEMENTS = [
  "CREATE INDEX IF NOT EXISTS product_image_studio_projects_updated_idx ON product_image_studio_projects (updated_at DESC)",
  "CREATE INDEX IF NOT EXISTS product_image_studio_assets_project_idx ON product_image_studio_assets (project_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS product_image_studio_generation_requests_project_idx ON product_image_studio_generation_requests (project_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS product_image_studio_results_project_idx ON product_image_studio_results (project_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS product_image_studio_download_bundles_project_idx ON product_image_studio_download_bundles (project_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS product_image_studio_usage_records_project_idx ON product_image_studio_usage_records (project_id, created_at DESC)",
] as const;

export async function ensureProductImageStudioPostgresSchema(
  runQuery: ProductImageStudioSqlQuery = runProductImageStudioPostgresQuery,
): Promise<void> {
  for (const statement of [...PRODUCT_IMAGE_STUDIO_SCHEMA_STATEMENTS, ...PRODUCT_IMAGE_STUDIO_INDEX_STATEMENTS]) {
    await runQuery(statement);
  }
}

export async function runProductImageStudioPostgresQuery(
  text: string,
  values: unknown[] = [],
): Promise<{ readonly rows: readonly Readonly<Record<string, unknown>>[] }> {
  const result = await defaultQuery(text, values);
  return { rows: result.rows };
}
