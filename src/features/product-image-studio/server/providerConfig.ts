import {
  PRODUCT_IMAGE_STUDIO_PROVIDERS,
  type ProductImageStudioProviderGate,
  type ProductImageStudioProviderName,
} from "@/features/product-image-studio/domain/types";
import {
  getProductImageStudioProviderSettingsSummary,
  type ProductImageStudioProviderSettingsSummary,
} from "@/features/product-image-studio/server/providerSettingsStore";

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
  readonly providers: Record<ProductImageStudioProviderName, ProductImageStudioProviderStatusEntry>;
};

type ProductImageStudioProviderGateBlockedReason = Extract<
  ProductImageStudioProviderGate,
  { readonly kind: "blocked" }
>["reason"];

type ProductImageStudioProviderStatusEntryBase = {
  readonly configured: boolean;
  readonly credentialConfigured: boolean;
  readonly modelConfigured: boolean;
  readonly name: ProductImageStudioProviderName;
};

type ProductImageStudioProviderStatusEntry =
  | (ProductImageStudioProviderStatusEntryBase & { readonly status: "enabled" })
  | (ProductImageStudioProviderStatusEntryBase & {
      readonly reason: ProductImageStudioProviderGateBlockedReason;
      readonly status: "blocked";
    });

export function parseProductImageStudioProviderConfig(
  env: ProductImageStudioProviderEnv = process.env,
  requestedProvider?: ProductImageStudioProviderName,
): ProductImageStudioProviderConfig {
  const provider = requestedProvider ?? readProviderName(env.PRODUCT_IMAGE_STUDIO_PROVIDER);
  return parseProductImageStudioProviderRuntimeConfig({
    apiKey: readEnvCredential(provider, env),
    generationEnabled: env.PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED === "1",
    model: readEnvModel(provider, env),
    provider,
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
  requestedProvider?: ProductImageStudioProviderName,
): ProductImageStudioProviderStatus {
  const config = parseProductImageStudioProviderConfig(env, requestedProvider);
  return toSafeProviderStatus(config, buildEnvProviderStatusEntries(env));
}

export async function getConfiguredProductImageStudioProviderStatus(
  env: ProductImageStudioProviderEnv = process.env,
  requestedProvider?: ProductImageStudioProviderName,
): Promise<ProductImageStudioProviderStatus> {
  const savedSummary = await getProductImageStudioProviderSettingsSummary(env);
  if (savedSummary) {
    const provider = requestedProvider ?? savedSummary.defaultProvider;
    return toSafeProviderStatus(
      parseProductImageStudioProviderRuntimeConfig(toRuntimeSettingsFromSummary(savedSummary, provider)),
      buildSavedProviderStatusEntries(savedSummary),
    );
  }

  return getProductImageStudioProviderStatus(env, requestedProvider);
}

function toSafeProviderStatus(
  config: ProductImageStudioProviderConfig,
  providers: Record<ProductImageStudioProviderName, ProductImageStudioProviderStatusEntry>,
): ProductImageStudioProviderStatus {
  return {
    generation: toSafeGenerationStatus(config.gate),
    provider: {
      configured: config.provider !== null,
      credentialConfigured: config.hasCredential,
      modelConfigured: config.modelConfigured,
      name: config.provider,
    },
    providers,
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

function buildSavedProviderStatusEntries(
  summary: ProductImageStudioProviderSettingsSummary,
): Record<ProductImageStudioProviderName, ProductImageStudioProviderStatusEntry> {
  return {
    gemini: toProviderStatusEntry(
      parseProductImageStudioProviderRuntimeConfig(toRuntimeSettingsFromSummary(summary, "gemini")),
      "gemini",
    ),
    openai: toProviderStatusEntry(
      parseProductImageStudioProviderRuntimeConfig(toRuntimeSettingsFromSummary(summary, "openai")),
      "openai",
    ),
  };
}

function buildEnvProviderStatusEntries(
  env: ProductImageStudioProviderEnv,
): Record<ProductImageStudioProviderName, ProductImageStudioProviderStatusEntry> {
  return {
    gemini: toProviderStatusEntry(parseProductImageStudioProviderConfig(env, "gemini"), "gemini"),
    openai: toProviderStatusEntry(parseProductImageStudioProviderConfig(env, "openai"), "openai"),
  };
}

function toProviderStatusEntry(
  config: ProductImageStudioProviderConfig,
  provider: ProductImageStudioProviderName,
): ProductImageStudioProviderStatusEntry {
  const base = {
    configured: config.provider !== null,
    credentialConfigured: config.hasCredential,
    modelConfigured: config.modelConfigured,
    name: provider,
  };
  switch (config.gate.kind) {
    case "blocked":
      return { ...base, reason: config.gate.reason, status: "blocked" };
    case "enabled":
      return { ...base, status: "enabled" };
  }
}

function toRuntimeSettingsFromSummary(
  summary: ProductImageStudioProviderSettingsSummary,
  provider: ProductImageStudioProviderName,
): ProductImageStudioProviderRuntimeSettings {
  const providerSummary = summary.providers[provider];
  return {
    apiKey: providerSummary.hasCredential ? "saved-provider-key" : null,
    generationEnabled: summary.generationEnabled,
    model: providerSummary.model,
    provider,
  };
}

function readEnvModel(provider: ProductImageStudioProviderName | null, env: ProductImageStudioProviderEnv): string | null {
  switch (provider) {
    case "openai":
      return env.PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL ?? null;
    case "gemini":
      return env.PRODUCT_IMAGE_STUDIO_GEMINI_IMAGE_MODEL ?? null;
    case null:
      return null;
  }
}

function readEnvCredential(provider: ProductImageStudioProviderName | null, env: ProductImageStudioProviderEnv): string | null {
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
