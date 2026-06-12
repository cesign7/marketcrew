import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";
import {
  decryptProductImageStudioCredential,
  encryptProductImageStudioCredential,
  getProductImageStudioCredentialSecret,
  ProductImageStudioCredentialCryptoError,
} from "@/features/product-image-studio/server/providerCredentialCrypto";
import {
  deletePostgresProviderSettingsRow,
  readPostgresProviderSettingsRow,
  type PostgresProviderSettingsRow,
  upsertPostgresProviderSettingsRow,
} from "@/features/product-image-studio/server/providerSettingsPostgresStore";
import { hasDatabaseUrl } from "@/lib/persistence/postgres";

export type ProductImageStudioProviderSettingsStorageMode = "memory" | "postgres";

export type ProductImageStudioProviderSettingsSummary = {
  readonly generationEnabled: boolean;
  readonly hasCredential: boolean;
  readonly model: string;
  readonly provider: ProductImageStudioProviderName;
  readonly storageMode: ProductImageStudioProviderSettingsStorageMode;
  readonly updatedAt: string;
};

export type ProductImageStudioProviderSecretSettings = {
  readonly apiKey: string;
  readonly generationEnabled: boolean;
  readonly model: string;
  readonly provider: ProductImageStudioProviderName;
  readonly source: "saved";
};

export type SaveProductImageStudioProviderSettingsInput = {
  readonly apiKey: string | null;
  readonly generationEnabled: boolean;
  readonly model: string;
  readonly provider: ProductImageStudioProviderName;
};

export type SaveProductImageStudioProviderSettingsResult =
  | {
      readonly ok: true;
      readonly settings: ProductImageStudioProviderSettingsSummary;
    }
  | {
      readonly error: {
        readonly code: string;
        readonly message: string;
      };
      readonly ok: false;
    };

type MemoryProviderSettings = {
  readonly apiKey: string;
  readonly generationEnabled: boolean;
  readonly model: string;
  readonly provider: ProductImageStudioProviderName;
  readonly updatedAt: string;
};

let memoryProviderSettings: MemoryProviderSettings | null = null;

export function resetProductImageStudioProviderSettingsForTests(): void {
  memoryProviderSettings = null;
}

export function getProductImageStudioProviderSettingsStorageMode(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ProductImageStudioProviderSettingsStorageMode {
  if (env.PRODUCT_IMAGE_STUDIO_PROVIDER_SETTINGS_STORE === "memory") {
    return "memory";
  }
  if (env.PRODUCT_IMAGE_STUDIO_PROVIDER_SETTINGS_STORE === "postgres") {
    return hasDatabaseUrl(env) ? "postgres" : "memory";
  }
  return env.VERCEL === "1" && hasDatabaseUrl(env) ? "postgres" : "memory";
}

export async function getProductImageStudioProviderSettingsSummary(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<ProductImageStudioProviderSettingsSummary | null> {
  if (getProductImageStudioProviderSettingsStorageMode(env) === "memory") {
    return memoryProviderSettings ? toSummary(memoryProviderSettings, "memory") : null;
  }

  const row = await readPostgresProviderSettingsRow();
  return row ? toSummary(row, "postgres") : null;
}

export async function getActiveProductImageStudioProviderSettings(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<ProductImageStudioProviderSecretSettings | null> {
  if (getProductImageStudioProviderSettingsStorageMode(env) === "memory") {
    return memoryProviderSettings ? toSecretSettings(memoryProviderSettings) : null;
  }

  const secret = getProductImageStudioCredentialSecret(env);
  if (!secret) {
    return null;
  }

  const row = await readPostgresProviderSettingsRow();
  if (!row) {
    return null;
  }

  try {
    return {
      apiKey: decryptProductImageStudioCredential(row.encryptedApiKey, secret),
      generationEnabled: row.generationEnabled,
      model: row.model,
      provider: row.provider,
      source: "saved",
    };
  } catch (error) {
    if (error instanceof ProductImageStudioCredentialCryptoError) {
      return null;
    }
    throw error;
  }
}

export async function saveProductImageStudioProviderSettings(
  input: SaveProductImageStudioProviderSettingsInput,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<SaveProductImageStudioProviderSettingsResult> {
  const storageMode = getProductImageStudioProviderSettingsStorageMode(env);
  if (storageMode === "memory") {
    return saveMemoryProviderSettings(input);
  }

  const secret = getProductImageStudioCredentialSecret(env);
  if (!secret) {
    return providerSettingsError(
      "PROVIDER_SETTINGS_SECRET_REQUIRED",
      "운영 DB에 저장하려면 provider 설정 암호화 키가 필요합니다.",
    );
  }

  const existing = await readPostgresProviderSettingsRow();
  const nextApiKey = input.apiKey?.trim();
  const encryptedApiKey = nextApiKey
    ? encryptProductImageStudioCredential(nextApiKey, secret)
    : existing?.encryptedApiKey;
  if (!encryptedApiKey) {
    return providerSettingsError("API_KEY_REQUIRED", "API 키를 입력해 주세요.");
  }

  const updatedAt = new Date().toISOString();
  await upsertPostgresProviderSettingsRow({
    encryptedApiKey,
    generationEnabled: input.generationEnabled,
    model: input.model,
    provider: input.provider,
    updatedAt,
  });

  return {
    ok: true,
    settings: {
      generationEnabled: input.generationEnabled,
      hasCredential: true,
      model: input.model,
      provider: input.provider,
      storageMode,
      updatedAt,
    },
  };
}

export async function deleteProductImageStudioProviderSettings(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  if (getProductImageStudioProviderSettingsStorageMode(env) === "memory") {
    memoryProviderSettings = null;
    return;
  }

  await deletePostgresProviderSettingsRow();
}

async function saveMemoryProviderSettings(
  input: SaveProductImageStudioProviderSettingsInput,
): Promise<SaveProductImageStudioProviderSettingsResult> {
  const apiKey = input.apiKey?.trim() || memoryProviderSettings?.apiKey;
  if (!apiKey) {
    return providerSettingsError("API_KEY_REQUIRED", "API 키를 입력해 주세요.");
  }

  memoryProviderSettings = {
    apiKey,
    generationEnabled: input.generationEnabled,
    model: input.model,
    provider: input.provider,
    updatedAt: new Date().toISOString(),
  };

  return { ok: true, settings: toSummary(memoryProviderSettings, "memory") };
}

function toSecretSettings(settings: MemoryProviderSettings): ProductImageStudioProviderSecretSettings {
  return {
    apiKey: settings.apiKey,
    generationEnabled: settings.generationEnabled,
    model: settings.model,
    provider: settings.provider,
    source: "saved",
  };
}

function toSummary(
  settings: MemoryProviderSettings | PostgresProviderSettingsRow,
  storageMode: ProductImageStudioProviderSettingsStorageMode,
): ProductImageStudioProviderSettingsSummary {
  return {
    generationEnabled: settings.generationEnabled,
    hasCredential: true,
    model: settings.model,
    provider: settings.provider,
    storageMode,
    updatedAt: settings.updatedAt,
  };
}

function providerSettingsError(
  code: string,
  message: string,
): Extract<SaveProductImageStudioProviderSettingsResult, { readonly ok: false }> {
  return { error: { code, message }, ok: false };
}
