import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";
import { normalizeProductImageStudioProviderModel } from "@/features/product-image-studio/domain/providerModels";
import {
  decryptProductImageStudioCredential,
  encryptProductImageStudioCredential,
  getProductImageStudioCredentialSecret,
  ProductImageStudioCredentialCryptoError,
} from "@/features/product-image-studio/server/providerCredentialCrypto";
import {
  deletePostgresProviderSettingsRow,
  readPostgresProviderSettingsRow,
  readPostgresProviderSettingsState,
  upsertPostgresProviderSettingsRow,
} from "@/features/product-image-studio/server/providerSettingsPostgresStore";
import {
  buildProductImageStudioProviderSettingsSummary,
  buildProductImageStudioProviderSettingsSummaryFromSingleProvider,
  type ProductImageStudioProviderCredentialSummary,
  type ProductImageStudioProviderCredentialSummaryInput,
  type ProductImageStudioProviderSettingsStorageMode,
  type ProductImageStudioProviderSettingsSummary,
} from "@/features/product-image-studio/server/providerSettingsSummary";
import { hasDatabaseUrl } from "@/lib/persistence/postgres";

export type {
  ProductImageStudioProviderCredentialSummary,
  ProductImageStudioProviderSettingsStorageMode,
  ProductImageStudioProviderSettingsSummary,
} from "@/features/product-image-studio/server/providerSettingsSummary";

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

type MemoryProviderSettings = ProductImageStudioProviderCredentialSummaryInput & {
  readonly apiKey: string;
};

type MemoryProviderSettingsState = {
  readonly defaultProvider: ProductImageStudioProviderName;
  readonly generationEnabled: boolean;
  readonly providers: Partial<Record<ProductImageStudioProviderName, MemoryProviderSettings>>;
};

let memoryProviderSettings: MemoryProviderSettingsState | null = null;

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
  return hasDatabaseUrl(env) ? "postgres" : "memory";
}

export async function getProductImageStudioProviderSettingsSummary(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<ProductImageStudioProviderSettingsSummary | null> {
  if (getProductImageStudioProviderSettingsStorageMode(env) === "memory") {
    return memoryProviderSettings ? buildProductImageStudioProviderSettingsSummary(memoryProviderSettings, "memory") : null;
  }

  const state = await readPostgresProviderSettingsState();
  return state ? buildProductImageStudioProviderSettingsSummary(state, "postgres") : null;
}

export async function getActiveProductImageStudioProviderSettings(
  env: Readonly<Record<string, string | undefined>> = process.env,
  requestedProvider?: ProductImageStudioProviderName,
): Promise<ProductImageStudioProviderSecretSettings | null> {
  if (getProductImageStudioProviderSettingsStorageMode(env) === "memory") {
    return memoryProviderSettings ? toSecretSettings(memoryProviderSettings, requestedProvider) : null;
  }

  const secret = getProductImageStudioCredentialSecret(env);
  if (!secret) {
    return null;
  }

  const row = await readPostgresProviderSettingsRow(requestedProvider);
  if (!row) {
    return null;
  }

  try {
    return {
      apiKey: decryptProductImageStudioCredential(row.encryptedApiKey, secret),
      generationEnabled: row.generationEnabled,
      model: normalizeProductImageStudioProviderModel(row.provider, row.model),
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
  const model = normalizeProductImageStudioProviderModel(input.provider, input.model);
  const storageMode = getProductImageStudioProviderSettingsStorageMode(env);
  if (storageMode === "memory") {
    if (isPersistentProviderSettingsStorageRequired(env)) {
      return providerSettingsError(
        "PROVIDER_SETTINGS_DATABASE_REQUIRED",
        "운영에서는 provider 키를 서버 메모리에 저장하지 않습니다. Railway DB 또는 DATABASE_URL 연결을 확인해 주세요.",
      );
    }

    return saveMemoryProviderSettings({ ...input, model });
  }

  const secret = getProductImageStudioCredentialSecret(env);
  if (!secret) {
    return providerSettingsError(
      "PROVIDER_SETTINGS_SECRET_REQUIRED",
      "운영 DB에 저장하려면 provider 설정 암호화 키가 필요합니다.",
    );
  }

  const existing = await readPostgresProviderSettingsRow(input.provider);
  const nextApiKey = input.apiKey?.trim();
  const encryptedApiKey = nextApiKey
    ? encryptProductImageStudioCredential(nextApiKey, secret)
    : existing?.provider === input.provider
      ? existing.encryptedApiKey
      : undefined;
  if (!encryptedApiKey) {
    return providerSettingsError("API_KEY_REQUIRED", "API 키를 입력해 주세요.");
  }

  const updatedAt = new Date().toISOString();
  await upsertPostgresProviderSettingsRow({
    encryptedApiKey,
    generationEnabled: input.generationEnabled,
    model,
    provider: input.provider,
    updatedAt,
  });

  return {
    ok: true,
    settings: buildProductImageStudioProviderSettingsSummaryFromSingleProvider(
      {
        generationEnabled: input.generationEnabled,
        model,
        provider: input.provider,
        updatedAt,
      },
      storageMode,
    ),
  };
}

export async function deleteProductImageStudioProviderSettings(
  provider?: ProductImageStudioProviderName,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  if (getProductImageStudioProviderSettingsStorageMode(env) === "memory") {
    memoryProviderSettings = provider ? deleteMemoryProviderSettings(provider) : null;
    return;
  }

  await deletePostgresProviderSettingsRow(provider);
}

async function saveMemoryProviderSettings(
  input: SaveProductImageStudioProviderSettingsInput,
): Promise<SaveProductImageStudioProviderSettingsResult> {
  const apiKey = input.apiKey?.trim() || memoryProviderSettings?.providers[input.provider]?.apiKey;
  if (!apiKey) {
    return providerSettingsError("API_KEY_REQUIRED", "API 키를 입력해 주세요.");
  }

  const updatedAt = new Date().toISOString();
  memoryProviderSettings = {
    defaultProvider: input.provider,
    generationEnabled: input.generationEnabled,
    providers: {
      ...memoryProviderSettings?.providers,
      [input.provider]: {
        apiKey,
        model: input.model,
        provider: input.provider,
        updatedAt,
      },
    },
  };

  return { ok: true, settings: buildProductImageStudioProviderSettingsSummary(memoryProviderSettings, "memory") };
}

function deleteMemoryProviderSettings(provider: ProductImageStudioProviderName): MemoryProviderSettingsState | null {
  if (!memoryProviderSettings) {
    return null;
  }
  const providers = { ...memoryProviderSettings.providers };
  delete providers[provider];
  const fallbackProvider = providers.openai?.provider ?? providers.gemini?.provider;
  return fallbackProvider ? { defaultProvider: fallbackProvider, generationEnabled: false, providers } : null;
}

function toSecretSettings(
  settings: MemoryProviderSettingsState,
  requestedProvider: ProductImageStudioProviderName | undefined,
): ProductImageStudioProviderSecretSettings | null {
  const provider = requestedProvider ?? settings.defaultProvider;
  const providerSettings = settings.providers[provider];
  if (!providerSettings) {
    return null;
  }

  return {
    apiKey: providerSettings.apiKey,
    generationEnabled: settings.generationEnabled,
    model: normalizeProductImageStudioProviderModel(providerSettings.provider, providerSettings.model),
    provider: providerSettings.provider,
    source: "saved",
  };
}

function isPersistentProviderSettingsStorageRequired(env: Readonly<Record<string, string | undefined>>): boolean {
  if (env.PRODUCT_IMAGE_STUDIO_PROVIDER_SETTINGS_STORE === "memory") {
    return false;
  }

  return (
    env.PRODUCT_IMAGE_STUDIO_PROVIDER_SETTINGS_STORE === "postgres" ||
    env.VERCEL === "1" ||
    env.MARKETCREW_BACKEND_MODE === "1" ||
    env.RAILWAY_SERVICE_NAME === "marketcrew-api"
  );
}

function providerSettingsError(
  code: string,
  message: string,
): Extract<SaveProductImageStudioProviderSettingsResult, { readonly ok: false }> {
  return { error: { code, message }, ok: false };
}
