import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/product-image-studio/provider-status/route";
import {
  getProductImageStudioProviderStatus,
  parseProductImageStudioProviderConfig,
} from "@/features/product-image-studio/server/providerConfig";

describe("product image studio provider gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps generation blocked by default", () => {
    const status = getProductImageStudioProviderStatus({});

    expect(status.generation.status).toBe("blocked");
    if (status.generation.status === "blocked") {
      expect(status.generation.reason).toBe("generation_disabled");
    }
    expect(status.provider.configured).toBe(false);
    expect(status.provider.modelConfigured).toBe(false);
  });

  it("blocks generation unless provider, enabled flag, model, and credential are all present", () => {
    const providerOnly = parseProductImageStudioProviderConfig({
      PRODUCT_IMAGE_STUDIO_PROVIDER: "openai",
      PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL: "gpt-image-1",
    });
    const missingCredential = parseProductImageStudioProviderConfig({
      PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED: "1",
      PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL: "gpt-image-1",
      PRODUCT_IMAGE_STUDIO_PROVIDER: "openai",
    });
    const enabled = parseProductImageStudioProviderConfig({
      OPENAI_API_KEY: "configured-test-secret",
      PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED: "1",
      PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL: "gpt-image-1",
      PRODUCT_IMAGE_STUDIO_PROVIDER: "openai",
    });

    expect(providerOnly.gate).toEqual({ kind: "blocked", reason: "generation_disabled" });
    expect(missingCredential.gate).toEqual({ kind: "blocked", reason: "credential_missing" });
    expect(enabled.gate).toEqual({ kind: "enabled", model: "gpt-image-1", provider: "openai" });
  });

  it("supports Gemini generation settings from server env as a fallback", () => {
    const enabled = parseProductImageStudioProviderConfig({
      GEMINI_API_KEY: "configured-gemini-secret",
      PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED: "1",
      PRODUCT_IMAGE_STUDIO_GEMINI_IMAGE_MODEL: "gemini-3.1-flash-image",
      PRODUCT_IMAGE_STUDIO_PROVIDER: "gemini",
    });

    expect(enabled.gate).toEqual({ kind: "enabled", model: "gemini-3.1-flash-image", provider: "gemini" });
  });

  it("returns a safe provider status response without env values", async () => {
    vi.stubEnv("OPENAI_API_KEY", "configured-test-secret");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL", "gpt-image-1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER", "openai");

    const response = await GET(new Request("http://127.0.0.1:3000/api/product-image-studio/provider-status"));
    const bodyText = await response.text();
    const bodyJson: unknown = JSON.parse(bodyText);

    expect(response.status).toBe(200);
    expect(bodyJson).toMatchObject({
      data: {
        generation: { status: "enabled" },
        provider: { configured: true, modelConfigured: true, name: "openai" },
      },
      ok: true,
    });
    expect(bodyText).not.toContain("configured-test-secret");
    expect(bodyText).not.toContain("gpt-image-1");
    expect(bodyText).not.toContain("PRODUCT_IMAGE_STUDIO");
    expect(bodyText).not.toContain("OPENAI_API_KEY");
  });
});
