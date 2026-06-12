import {
  PRODUCT_IMAGE_STUDIO_PROVIDERS,
  type ProductImageStudioProviderName,
} from "@/features/product-image-studio/domain/types";
import type { ProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";

type ProviderStatusEntry = ProductImageStudioProviderStatus["providers"][ProductImageStudioProviderName];
type BlockedReason = Extract<ProductImageStudioProviderStatus["generation"], { readonly status: "blocked" }>["reason"];

export function readProductImageStudioProviderStatus(value: unknown): ProductImageStudioProviderStatus | null {
  if (!isRecord(value)) {
    return null;
  }

  const generation = readGenerationStatus(value["generation"]);
  const provider = readProviderSummary(value["provider"]);
  if (!generation || !provider) {
    return null;
  }

  return {
    generation,
    provider,
    providers: readProviderEntries(value["providers"], generation, provider),
  };
}

function readGenerationStatus(value: unknown): ProductImageStudioProviderStatus["generation"] | null {
  if (!isRecord(value)) {
    return null;
  }
  if (value["status"] === "enabled") {
    return { enabled: true, status: "enabled" };
  }
  if (value["status"] === "blocked") {
    return { enabled: false, reason: readBlockedReason(value["reason"]), status: "blocked" };
  }
  return null;
}

function readProviderSummary(value: unknown): ProductImageStudioProviderStatus["provider"] | null {
  if (!isRecord(value)) {
    return null;
  }
  const name = readNullableProvider(value["name"]);
  if (name === undefined) {
    return null;
  }
  return {
    configured: value["configured"] === true,
    credentialConfigured: value["credentialConfigured"] === true,
    modelConfigured: value["modelConfigured"] === true,
    name,
  };
}

function readProviderEntries(
  value: unknown,
  generation: ProductImageStudioProviderStatus["generation"],
  activeProvider: ProductImageStudioProviderStatus["provider"],
): ProductImageStudioProviderStatus["providers"] {
  return {
    gemini: readProviderEntry(value, "gemini", generation, activeProvider),
    openai: readProviderEntry(value, "openai", generation, activeProvider),
  };
}

function readProviderEntry(
  value: unknown,
  provider: ProductImageStudioProviderName,
  generation: ProductImageStudioProviderStatus["generation"],
  activeProvider: ProductImageStudioProviderStatus["provider"],
): ProviderStatusEntry {
  if (isRecord(value)) {
    const parsed = readExplicitProviderEntry(value[provider], provider);
    if (parsed) {
      return parsed;
    }
  }
  return readLegacyProviderEntry(provider, generation, activeProvider);
}

function readExplicitProviderEntry(value: unknown, provider: ProductImageStudioProviderName): ProviderStatusEntry | null {
  if (!isRecord(value) || value["name"] !== provider) {
    return null;
  }
  const base = {
    configured: value["configured"] === true,
    credentialConfigured: value["credentialConfigured"] === true,
    modelConfigured: value["modelConfigured"] === true,
    name: provider,
  };
  return value["status"] === "enabled"
    ? { ...base, status: "enabled" }
    : { ...base, reason: readBlockedReason(value["reason"]), status: "blocked" };
}

function readLegacyProviderEntry(
  provider: ProductImageStudioProviderName,
  generation: ProductImageStudioProviderStatus["generation"],
  activeProvider: ProductImageStudioProviderStatus["provider"],
): ProviderStatusEntry {
  const isActive = activeProvider.name === provider;
  const base = {
    configured: isActive && activeProvider.configured,
    credentialConfigured: isActive && activeProvider.credentialConfigured,
    modelConfigured: isActive && activeProvider.modelConfigured,
    name: provider,
  };
  if (isActive && generation.status === "enabled") {
    return { ...base, status: "enabled" };
  }
  const reason = generation.status === "blocked" ? generation.reason : "credential_missing";
  return { ...base, reason, status: "blocked" };
}

function readNullableProvider(value: unknown): ProductImageStudioProviderName | null | undefined {
  if (value === null) {
    return null;
  }
  return readProvider(value) ?? undefined;
}

function readProvider(value: unknown): ProductImageStudioProviderName | null {
  return PRODUCT_IMAGE_STUDIO_PROVIDERS.find((provider) => provider === value) ?? null;
}

function readBlockedReason(value: unknown): BlockedReason {
  if (value === "credential_missing" || value === "generation_disabled" || value === "provider_not_configured") {
    return value;
  }
  return "generation_disabled";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
