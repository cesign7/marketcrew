import {
  PRODUCT_IMAGE_STUDIO_PROVIDERS,
  type ProductImageStudioProviderName,
} from "@/features/product-image-studio/domain/types";
import {
  runProductImageStudioPostgresQuery,
  type ProductImageStudioSqlQuery,
} from "@/lib/persistence/productImageStudioPostgresSchema";

export type PostgresProviderSettingsRow = {
  readonly encryptedApiKey: string;
  readonly generationEnabled: boolean;
  readonly model: string;
  readonly provider: ProductImageStudioProviderName;
  readonly updatedAt: string;
};

const SETTINGS_ROW_ID = "default";

export async function readPostgresProviderSettingsRow(): Promise<PostgresProviderSettingsRow | null> {
  await ensureProductImageStudioProviderSettingsTable();
  const result = await runProductImageStudioPostgresQuery(
    `
      SELECT provider, model, encrypted_api_key, generation_enabled, updated_at
      FROM product_image_studio_provider_settings
      WHERE id = $1
    `,
    [SETTINGS_ROW_ID],
  );
  const row = result.rows[0];
  return row ? parseProviderSettingsRow(row) : null;
}

export async function upsertPostgresProviderSettingsRow(input: {
  readonly encryptedApiKey: string;
  readonly generationEnabled: boolean;
  readonly model: string;
  readonly provider: ProductImageStudioProviderName;
  readonly updatedAt: string;
}): Promise<void> {
  await ensureProductImageStudioProviderSettingsTable();
  await runProductImageStudioPostgresQuery(
    `
      INSERT INTO product_image_studio_provider_settings (
        id, provider, model, encrypted_api_key, generation_enabled, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        provider = EXCLUDED.provider,
        model = EXCLUDED.model,
        encrypted_api_key = EXCLUDED.encrypted_api_key,
        generation_enabled = EXCLUDED.generation_enabled,
        updated_at = EXCLUDED.updated_at
    `,
    [SETTINGS_ROW_ID, input.provider, input.model, input.encryptedApiKey, input.generationEnabled, input.updatedAt],
  );
}

export async function deletePostgresProviderSettingsRow(): Promise<void> {
  await ensureProductImageStudioProviderSettingsTable();
  await runProductImageStudioPostgresQuery("DELETE FROM product_image_studio_provider_settings WHERE id = $1", [
    SETTINGS_ROW_ID,
  ]);
}

export async function ensureProductImageStudioProviderSettingsTable(
  runQuery: ProductImageStudioSqlQuery = runProductImageStudioPostgresQuery,
): Promise<void> {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS product_image_studio_provider_settings (
      id TEXT PRIMARY KEY CHECK (id = 'default'),
      provider TEXT NOT NULL CHECK (provider IN ('openai', 'gemini')),
      model TEXT NOT NULL,
      encrypted_api_key TEXT NOT NULL,
      generation_enabled BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

function parseProviderSettingsRow(row: Readonly<Record<string, unknown>>): PostgresProviderSettingsRow | null {
  const provider = parseProviderName(row["provider"]);
  if (!provider || typeof row["model"] !== "string" || typeof row["encrypted_api_key"] !== "string") {
    return null;
  }

  return {
    encryptedApiKey: row["encrypted_api_key"],
    generationEnabled: row["generation_enabled"] === true,
    model: row["model"],
    provider,
    updatedAt: toIsoString(row["updated_at"]),
  };
}

function parseProviderName(value: unknown): ProductImageStudioProviderName | null {
  for (const provider of PRODUCT_IMAGE_STUDIO_PROVIDERS) {
    if (provider === value) {
      return provider;
    }
  }
  return null;
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}
