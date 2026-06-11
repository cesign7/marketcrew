import type { ProductImageStudioProviderGate } from "@/features/product-image-studio/domain/types";

export type ProductImageStudioProviderEnv = Readonly<Record<string, string | undefined>>;

export type ProductImageStudioProviderConfig = {
  readonly gate: ProductImageStudioProviderGate;
  readonly generationEnabled: boolean;
  readonly hasCredential: boolean;
  readonly modelConfigured: boolean;
  readonly provider: "openai" | null;
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
    readonly modelConfigured: boolean;
    readonly name: "openai" | null;
  };
};

type ProductImageStudioProviderGateBlockedReason = Extract<
  ProductImageStudioProviderGate,
  { readonly kind: "blocked" }
>["reason"];

export function parseProductImageStudioProviderConfig(
  env: ProductImageStudioProviderEnv = process.env,
): ProductImageStudioProviderConfig {
  const provider = env.PRODUCT_IMAGE_STUDIO_PROVIDER === "openai" ? "openai" : null;
  const generationEnabled = env.PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED === "1";
  const model = env.PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL;
  const modelConfigured = Boolean(model);
  const hasCredential = Boolean(env.OPENAI_API_KEY);

  if (!generationEnabled) {
    return {
      gate: { kind: "blocked", reason: "generation_disabled" },
      generationEnabled,
      hasCredential,
      modelConfigured,
      provider,
    };
  }

  if (provider !== "openai" || !modelConfigured || !model) {
    return {
      gate: { kind: "blocked", reason: "provider_not_configured" },
      generationEnabled,
      hasCredential,
      modelConfigured,
      provider,
    };
  }

  if (!hasCredential) {
    return {
      gate: { kind: "blocked", reason: "credential_missing" },
      generationEnabled,
      hasCredential,
      modelConfigured,
      provider,
    };
  }

  return {
    gate: { kind: "enabled", model, provider: "openai" },
    generationEnabled,
    hasCredential,
    modelConfigured,
    provider,
  };
}

export function getProductImageStudioProviderStatus(
  env: ProductImageStudioProviderEnv = process.env,
): ProductImageStudioProviderStatus {
  const config = parseProductImageStudioProviderConfig(env);

  return {
    generation: toSafeGenerationStatus(config.gate),
    provider: {
      configured: config.provider === "openai",
      modelConfigured: config.modelConfigured,
      name: config.provider,
    },
  };
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
