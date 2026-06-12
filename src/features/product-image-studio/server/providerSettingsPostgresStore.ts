import { PRODUCT_IMAGE_STUDIO_PROVIDERS, type ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";
import { runProductImageStudioPostgresQuery, type ProductImageStudioSqlQuery } from "@/lib/persistence/productImageStudioPostgresSchema";

export type PostgresProviderSettingsRow = {
  readonly encryptedApiKey: string;
  readonly generationEnabled: boolean;
  readonly model: string;
  readonly provider: ProductImageStudioProviderName;
  readonly updatedAt: string;
};

type PostgresProviderCredentialRow = Omit<PostgresProviderSettingsRow, "generationEnabled">;

export type PostgresProviderSettingsState = {
  readonly defaultProvider: ProductImageStudioProviderName;
  readonly generationEnabled: boolean;
  readonly providers: Partial<Record<ProductImageStudioProviderName, PostgresProviderCredentialRow>>;
  readonly updatedAt: string;
};

const SETTINGS_ROW_ID = "default";

export async function readPostgresProviderSettingsState(): Promise<PostgresProviderSettingsState | null> {
  await ensureProductImageStudioProviderSettingsTable();
  const defaultsResult = await runProductImageStudioPostgresQuery(
    `
      SELECT default_provider, generation_enabled, updated_at
      FROM product_image_studio_provider_setting_defaults
      WHERE id = $1
    `,
    [SETTINGS_ROW_ID],
  );
  const rowsResult = await runProductImageStudioPostgresQuery(`
    SELECT provider, model, encrypted_api_key, updated_at
    FROM product_image_studio_provider_settings
  `);
  const providers = toProviderRows(rowsResult.rows);
  const defaultRow = parseProviderSettingsDefaultRow(defaultsResult.rows[0]);
  const fallbackProvider = providers.openai?.provider ?? providers.gemini?.provider;
  if (!defaultRow && !fallbackProvider) {
    return null;
  }

  const defaultProvider = defaultRow?.defaultProvider ?? fallbackProvider;
  if (!defaultProvider) {
    return null;
  }

  return {
    defaultProvider,
    generationEnabled: defaultRow?.generationEnabled ?? false,
    providers,
    updatedAt: defaultRow?.updatedAt ?? new Date(0).toISOString(),
  };
}

export async function readPostgresProviderSettingsRow(
  provider?: ProductImageStudioProviderName,
): Promise<PostgresProviderSettingsRow | null> {
  const state = await readPostgresProviderSettingsState();
  if (!state) {
    return null;
  }

  const providerName = provider ?? state.defaultProvider;
  const row = state.providers[providerName];
  return row ? { ...row, generationEnabled: state.generationEnabled } : null;
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
        provider, model, encrypted_api_key, updated_at
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (provider) DO UPDATE SET
        model = EXCLUDED.model,
        encrypted_api_key = EXCLUDED.encrypted_api_key,
        updated_at = EXCLUDED.updated_at
    `,
    [input.provider, input.model, input.encryptedApiKey, input.updatedAt],
  );
  await runProductImageStudioPostgresQuery(
    `
      INSERT INTO product_image_studio_provider_setting_defaults (
        id, default_provider, generation_enabled, updated_at
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        default_provider = EXCLUDED.default_provider,
        generation_enabled = EXCLUDED.generation_enabled,
        updated_at = EXCLUDED.updated_at
    `,
    [SETTINGS_ROW_ID, input.provider, input.generationEnabled, input.updatedAt],
  );
}

export async function deletePostgresProviderSettingsRow(provider?: ProductImageStudioProviderName): Promise<void> {
  await ensureProductImageStudioProviderSettingsTable();
  if (!provider) {
    await runProductImageStudioPostgresQuery("DELETE FROM product_image_studio_provider_setting_defaults WHERE id = $1", [SETTINGS_ROW_ID]);
    await runProductImageStudioPostgresQuery("DELETE FROM product_image_studio_provider_settings");
    return;
  }

  await runProductImageStudioPostgresQuery("DELETE FROM product_image_studio_provider_settings WHERE provider = $1", [provider]);
  const remaining = await runProductImageStudioPostgresQuery("SELECT provider FROM product_image_studio_provider_settings LIMIT 1");
  const fallbackProvider = parseProviderName(remaining.rows[0]?.["provider"]);
  if (!fallbackProvider) {
    await runProductImageStudioPostgresQuery("DELETE FROM product_image_studio_provider_setting_defaults WHERE id = $1", [SETTINGS_ROW_ID]);
    return;
  }
  await runProductImageStudioPostgresQuery(
    `
      INSERT INTO product_image_studio_provider_setting_defaults (id, default_provider, generation_enabled, updated_at)
      VALUES ($1, $2, false, now())
      ON CONFLICT (id) DO UPDATE SET
        default_provider = EXCLUDED.default_provider,
        generation_enabled = false,
        updated_at = EXCLUDED.updated_at
    `,
    [SETTINGS_ROW_ID, fallbackProvider],
  );
}

export async function ensureProductImageStudioProviderSettingsTable(
  runQuery: ProductImageStudioSqlQuery = runProductImageStudioPostgresQuery,
): Promise<void> {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS product_image_studio_provider_setting_defaults (
      id TEXT PRIMARY KEY CHECK (id = 'default'),
      default_provider TEXT NOT NULL CHECK (default_provider IN ('openai', 'gemini')),
      generation_enabled BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await runQuery(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'product_image_studio_provider_settings'
          AND column_name = 'id'
      ) THEN
        CREATE TABLE IF NOT EXISTS product_image_studio_provider_settings_v2 (
          provider TEXT PRIMARY KEY CHECK (provider IN ('openai', 'gemini')),
          model TEXT NOT NULL,
          encrypted_api_key TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        INSERT INTO product_image_studio_provider_settings_v2 (
          provider, model, encrypted_api_key, updated_at
        )
        SELECT provider, model, encrypted_api_key, updated_at
        FROM product_image_studio_provider_settings
        WHERE provider IN ('openai', 'gemini')
        ON CONFLICT (provider) DO UPDATE SET
          model = EXCLUDED.model,
          encrypted_api_key = EXCLUDED.encrypted_api_key,
          updated_at = EXCLUDED.updated_at;

        INSERT INTO product_image_studio_provider_setting_defaults (
          id, default_provider, generation_enabled, updated_at
        )
        SELECT 'default', provider, generation_enabled, updated_at
        FROM product_image_studio_provider_settings
        WHERE id = 'default'
          AND provider IN ('openai', 'gemini')
        ON CONFLICT (id) DO UPDATE SET
          default_provider = EXCLUDED.default_provider,
          generation_enabled = EXCLUDED.generation_enabled,
          updated_at = EXCLUDED.updated_at;

        DROP TABLE product_image_studio_provider_settings;
        ALTER TABLE product_image_studio_provider_settings_v2
        RENAME TO product_image_studio_provider_settings;
      END IF;
    END $$;
  `);
  await runQuery(`
    CREATE TABLE IF NOT EXISTS product_image_studio_provider_settings (
      provider TEXT PRIMARY KEY CHECK (provider IN ('openai', 'gemini')),
      model TEXT NOT NULL,
      encrypted_api_key TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

function toProviderRows(
  rows: readonly Readonly<Record<string, unknown>>[],
): Partial<Record<ProductImageStudioProviderName, PostgresProviderCredentialRow>> {
  const providers: Partial<Record<ProductImageStudioProviderName, PostgresProviderCredentialRow>> = {};
  for (const row of rows) {
    const parsed = parseProviderSettingsRow(row);
    if (parsed) {
      switch (parsed.provider) {
        case "gemini":
          providers.gemini = parsed;
          break;
        case "openai":
          providers.openai = parsed;
          break;
      }
    }
  }
  return providers;
}

function parseProviderSettingsRow(row: Readonly<Record<string, unknown>>): PostgresProviderCredentialRow | null {
  const provider = parseProviderName(row["provider"]);
  if (!provider || typeof row["model"] !== "string" || typeof row["encrypted_api_key"] !== "string") {
    return null;
  }

  return {
    encryptedApiKey: row["encrypted_api_key"],
    model: row["model"],
    provider,
    updatedAt: toIsoString(row["updated_at"]),
  };
}

function parseProviderSettingsDefaultRow(
  row: Readonly<Record<string, unknown>> | undefined,
): { readonly defaultProvider: ProductImageStudioProviderName; readonly generationEnabled: boolean; readonly updatedAt: string } | null {
  if (!row) {
    return null;
  }

  const defaultProvider = parseProviderName(row["default_provider"]);
  if (!defaultProvider) {
    return null;
  }

  return {
    defaultProvider,
    generationEnabled: row["generation_enabled"] === true,
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
