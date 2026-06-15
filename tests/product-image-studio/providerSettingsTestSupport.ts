import { vi } from "vitest";
import { resetProductImageStudioProviderSettingsForTests } from "@/features/product-image-studio/server/providerSettingsStore";

export const TEST_GEMINI_API_KEY = "AIza.not-a-real-key.x";
export const TEST_OPENAI_API_KEY = "sk-.not-a-real-key.x";

export function resetProviderSettingsTestState(): void {
  resetProductImageStudioProviderSettingsForTests();
  vi.doUnmock("@/features/product-image-studio/server/providerSettingsPostgresStore");
  vi.resetModules();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
}
