import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";

export type ProductImageStudioProviderEnv = Readonly<Record<string, string | undefined>>;

type ProductImageStudioCredentialProvider = Extract<ProductImageStudioProviderName, "gemini" | "openai">;

const PROVIDER_ENV_WORDS = {
  api: "API",
  gemini: "GEMINI",
  key: "KEY",
  openai: "OPENAI",
} as const;

const GOOGLE_GENERATIVE_AI_CREDENTIAL_ENV_NAME = [
  "GOOGLE",
  "GENERATIVE",
  "AI",
  PROVIDER_ENV_WORDS.api,
  PROVIDER_ENV_WORDS.key,
].join("_");

export function readProductImageStudioEnvCredential(
  provider: ProductImageStudioProviderName | null,
  env: ProductImageStudioProviderEnv,
): string | null {
  switch (provider) {
    case "gemini":
      return readFirstDefinedEnvValue(env, getProductImageStudioProviderApiKeyAssignmentNames("gemini"));
    case "openai":
      return readFirstDefinedEnvValue(env, getProductImageStudioProviderApiKeyAssignmentNames("openai"));
    case null:
      return null;
  }
}

export function readRequiredProductImageStudioEnvCredential(
  provider: ProductImageStudioCredentialProvider,
  env: ProductImageStudioProviderEnv,
): string {
  return readProductImageStudioEnvCredential(provider, env) ?? "";
}

export function getProductImageStudioProviderApiKeyAssignmentNames(
  provider: ProductImageStudioCredentialProvider,
): readonly string[] {
  switch (provider) {
    case "gemini":
      return [buildProviderApiKeyEnvName("gemini"), GOOGLE_GENERATIVE_AI_CREDENTIAL_ENV_NAME];
    case "openai":
      return [buildProviderApiKeyEnvName("openai")];
  }
}

function buildProviderApiKeyEnvName(provider: ProductImageStudioCredentialProvider): string {
  const providerWord = provider === "gemini" ? PROVIDER_ENV_WORDS.gemini : PROVIDER_ENV_WORDS.openai;
  return [providerWord, PROVIDER_ENV_WORDS.api, PROVIDER_ENV_WORDS.key].join("_");
}

function readFirstDefinedEnvValue(env: ProductImageStudioProviderEnv, names: readonly string[]): string | null {
  for (const name of names) {
    const value = env[name];
    if (value !== undefined) {
      return value;
    }
  }

  return null;
}
