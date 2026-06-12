import {
  PRODUCT_IMAGE_STUDIO_PROVIDERS,
  type ProductImageStudioProviderGate,
  type ProductImageStudioProviderName,
} from "@/features/product-image-studio/domain/types";
import { getActiveProductImageStudioProviderSettings } from "@/features/product-image-studio/server/providerSettingsStore";

export type ProductImageStudioProviderEnv = Readonly<Record<string, string | undefined>>;

export type ProductImageStudioProviderRuntimeSettings = {
  readonly apiKey: string | null;
  readonly generationEnabled: boolean;
  readonly model: string | null;
  readonly provider: ProductImageStudioProviderName | null;
};

export type ProductImageStudioProviderConfig = {
  readonly gate: ProductImageStudioProviderGate;
  readonly generationEnabled: boolean;
  readonly hasCredential: boolean;
  readonly modelConfigured: boolean;
  readonly provider: ProductImageStudioProviderName | null;
};

export type ProductImageStudioProviderStatus = {
  readonly generation:
    | {
        readonly enabled: false;
        readonly reason: ProductImageStudioProviderGateBlockedReason;
        readonly status: "blocked";
      }
    | {
        readonly enabled: true;
        readonly status: "enabled";
      };
  readonly provider: {
    readonly configured: boolean;
    readonly credentialConfigured: boolean;
    readonly modelConfigured: boolean;
    readonly name: ProductImageStudioProviderName | null;
  };
};

type ProductImageStudioProviderGateBlockedReason = Extract<
  ProductImageStudioProviderGate,
  { readonly kind: "blocked" }
>["reason"];

export function parseProductImageStudioProviderConfig(
  env: ProductImageStudioProviderEnv = process.env,
): ProductImageStudioProviderConfig {
  return parseProductImageStudioProviderRuntimeConfig({
    apiKey: readEnvCredential(env),
    generationEnabled: env.PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED === "1",
    model: readEnvModel(env),
    provider: readProviderName(env.PRODUCT_IMAGE_STUDIO_PROVIDER),
  });
}

export function parseProductImageStudioProviderRuntimeConfig(
  settings: ProductImageStudioProviderRuntimeSettings,
): ProductImageStudioProviderConfig {
  const model = settings.model?.trim() ?? "";
  const modelConfigured = model.length > 0;
  const hasCredential = Boolean(settings.apiKey?.trim());

  if (!settings.generationEnabled) {
    return {
      gate: { kind: "blocked", reason: "generation_disabled" },
      generationEnabled: settings.generationEnabled,
      hasCredential,
      modelConfigured,
      provider: settings.provider,
    };
  }

  if (!settings.provider || !modelConfigured) {
    return {
      gate: { kind: "blocked", reason: "provider_not_configured" },
      generationEnabled: settings.generationEnabled,
      hasCredential,
      modelConfigured,
      provider: settings.provider,
    };
  }

  if (!hasCredential) {
    return {
      gate: { kind: "blocked", reason: "credential_missing" },
      generationEnabled: settings.generationEnabled,
      hasCredential,
      modelConfigured,
      provider: settings.provider,
    };
  }

  return {
    gate: { kind: "enabled", model, provider: settings.provider },
    generationEnabled: settings.generationEnabled,
    hasCredential,
    modelConfigured,
    provider: settings.provider,
  };
}

export function getProductImageStudioProviderStatus(
  env: ProductImageStudioProviderEnv = process.env,
): ProductImageStudioProviderStatus {
  const config = parseProductImageStudioProviderConfig(env);
  return toSafeProviderStatus(config);
}

export async function getConfiguredProductImageStudioProviderStatus(
  env: ProductImageStudioProviderEnv = process.env,
): Promise<ProductImageStudioProviderStatus> {
  const savedSettings = await getActiveProductImageStudioProviderSettings(env);
  if (savedSettings) {
    return toSafeProviderStatus(parseProductImageStudioProviderRuntimeConfig(savedSettings));
  }

  return getProductImageStudioProviderStatus(env);
}

function toSafeProviderStatus(config: ProductImageStudioProviderConfig): ProductImageStudioProviderStatus {
  return {
    generation: toSafeGenerationStatus(config.gate),
    provider: {
      configured: config.provider !== null,
      credentialConfigured: config.hasCredential,
      modelConfigured: config.modelConfigured,
      name: config.provider,
    },
  };
}

export function getDefaultProductImageStudioProviderModel(provider: ProductImageStudioProviderName): string {
  switch (provider) {
    case "openai":
      return "gpt-image-1";
    case "gemini":
      return "gemini-3.1-flash-image";
  }
}

function toSafeGenerationStatus(gate: ProductImageStudioProviderGate): ProductImageStudioProviderStatus["generation"] {
  switch (gate.kind) {
    case "blocked":
      return {
        enabled: false,
        reason: gate.reason,
        status: "blocked",
      };
    case "enabled":
      return {
        enabled: true,
        status: "enabled",
      };
  }
}

function readEnvModel(env: ProductImageStudioProviderEnv): string | null {
  const provider = readProviderName(env.PRODUCT_IMAGE_STUDIO_PROVIDER);
  switch (provider) {
    case "openai":
      return env.PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL ?? null;
    case "gemini":
      return env.PRODUCT_IMAGE_STUDIO_GEMINI_IMAGE_MODEL ?? null;
    case null:
      return null;
  }
}

function readEnvCredential(env: ProductImageStudioProviderEnv): string | null {
  const provider = readProviderName(env.PRODUCT_IMAGE_STUDIO_PROVIDER);
  switch (provider) {
    case "openai":
      return env.OPENAI_API_KEY ?? null;
    case "gemini":
      return env.GEMINI_API_KEY ?? env.GOOGLE_GENERATIVE_AI_API_KEY ?? null;
    case null:
      return null;
  }
}

function readProviderName(value: string | undefined): ProductImageStudioProviderName | null {
  for (const provider of PRODUCT_IMAGE_STUDIO_PROVIDERS) {
    if (provider === value) {
      return provider;
    }
  }
  return null;
}
