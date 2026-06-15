import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DELETE,
  GET,
  POST,
} from "@/app/api/product-image-studio/provider-settings/route";
import { getProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import {
  getProductImageStudioProviderSettingsStorageMode,
  getProductImageStudioProviderSettingsSummary,
  saveProductImageStudioProviderSettings,
} from "@/features/product-image-studio/server/providerSettingsStore";
import {
  resetProviderSettingsTestState,
  TEST_GEMINI_API_KEY,
  TEST_OPENAI_API_KEY,
} from "./providerSettingsTestSupport";

describe("product image studio provider settings storage", () => {
  afterEach(resetProviderSettingsTestState);

  it("stores OpenAI and Gemini provider settings independently", async () => {
    const openAiResponse = await POST(
      new Request("http://127.0.0.1:3000/api/product-image-studio/provider-settings", {
        body: JSON.stringify({
          apiKey: TEST_OPENAI_API_KEY,
          generationEnabled: true,
          model: "gpt-image-1",
          provider: "openai",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const geminiResponse = await POST(
      new Request("http://127.0.0.1:3000/api/product-image-studio/provider-settings", {
        body: JSON.stringify({
          apiKey: TEST_GEMINI_API_KEY,
          generationEnabled: true,
          model: "gemini-3.1-flash-image",
          provider: "gemini",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    const response = await GET(new Request("http://127.0.0.1:3000/api/product-image-studio/provider-settings"));
    const bodyText = await response.text();

    expect(openAiResponse.status).toBe(200);
    expect(geminiResponse.status).toBe(200);
    expect(response.status).toBe(200);
    expect(bodyText).toContain("\"defaultProvider\":\"gemini\"");
    expect(bodyText).toContain("\"providers\"");
    expect(bodyText).toContain("\"openai\"");
    expect(bodyText).toContain("\"gemini\"");
    expect(bodyText).toContain("\"model\":\"gpt-image-2\"");
    expect(bodyText).toContain("\"model\":\"gemini-3.1-flash-image\"");
    expect(bodyText).toContain("\"hasCredential\":true");
    expect(bodyText).not.toContain(TEST_OPENAI_API_KEY);
    expect(bodyText).not.toContain(TEST_GEMINI_API_KEY);
  });

  it("does not reuse a saved key across providers", async () => {
    let upsertCalls = 0;
    vi.resetModules();
    vi.doMock("@/features/product-image-studio/server/providerSettingsPostgresStore", () => ({
      deletePostgresProviderSettingsRow: vi.fn(async () => undefined),
      readPostgresProviderSettingsRow: vi.fn(async () => ({
        encryptedApiKey: "encrypted-openai-key",
        generationEnabled: true,
        model: "gpt-image-1",
        provider: "openai",
        updatedAt: "2026-06-12T00:00:00.000Z",
      })),
      readPostgresProviderSettingsState: vi.fn(async () => ({
        defaultProvider: "openai",
        generationEnabled: true,
        providers: {
          openai: {
            encryptedApiKey: "encrypted-openai-key",
            model: "gpt-image-1",
            provider: "openai",
            updatedAt: "2026-06-12T00:00:00.000Z",
          },
        },
        updatedAt: "2026-06-12T00:00:00.000Z",
      })),
      upsertPostgresProviderSettingsRow: vi.fn(async () => {
        upsertCalls += 1;
      }),
    }));
    const { saveProductImageStudioProviderSettings: saveWithMockedPostgres } = await import(
      "@/features/product-image-studio/server/providerSettingsStore"
    );

    const saved = await saveWithMockedPostgres(
      {
        apiKey: null,
        generationEnabled: true,
        model: "gemini-3.1-flash-image",
        provider: "gemini",
      },
      {
        MARKETCREW_DATABASE_URL: "postgres://marketcrew:test@127.0.0.1:5432/marketcrew",
        PRODUCT_IMAGE_STUDIO_PROVIDER_SETTINGS_SECRET: "test-provider-settings-secret",
      },
    );

    expect(saved.ok).toBe(false);
    if (!saved.ok) {
      expect(saved.error.code).toBe("API_KEY_REQUIRED");
    }
    expect(upsertCalls).toBe(0);
  });

  it("uses Postgres provider settings storage whenever a database URL is configured", () => {
    expect(
      getProductImageStudioProviderSettingsStorageMode({
        MARKETCREW_DATABASE_URL: "postgres://marketcrew:test@127.0.0.1:5432/marketcrew",
      }),
    ).toBe("postgres");
  });

  it("does not accept ephemeral provider key storage in hosted runtimes", async () => {
    const saved = await saveProductImageStudioProviderSettings(
      {
        apiKey: "secret-openai-key",
        generationEnabled: true,
        model: "gpt-image-1",
        provider: "openai",
      },
      { VERCEL: "1" },
    );

    expect(saved.ok).toBe(false);
    if (!saved.ok) {
      expect(saved.error.code).toBe("PROVIDER_SETTINGS_DATABASE_REQUIRED");
    }
    await expect(getProductImageStudioProviderSettingsSummary({ VERCEL: "1" })).resolves.toBeNull();
  });

  it("clears saved provider settings through the API", async () => {
    await saveProductImageStudioProviderSettings({
      apiKey: "secret-openai-key",
      generationEnabled: true,
      model: "gpt-image-1",
      provider: "openai",
    });

    const deleteResponse = await DELETE(new Request("http://127.0.0.1:3000/api/product-image-studio/provider-settings"));
    const getResponse = await GET(new Request("http://127.0.0.1:3000/api/product-image-studio/provider-settings"));
    const bodyText = await getResponse.text();

    expect(deleteResponse.status).toBe(200);
    expect(bodyText).toContain("\"settings\":null");
    expect(bodyText).not.toContain("secret-openai-key");
    expect(getProductImageStudioProviderStatus({}).generation.status).toBe("blocked");
  });

  it("clears only the requested provider settings through the API", async () => {
    await saveProductImageStudioProviderSettings({
      apiKey: "secret-openai-key",
      generationEnabled: true,
      model: "gpt-image-1",
      provider: "openai",
    });
    await saveProductImageStudioProviderSettings({
      apiKey: "secret-gemini-key",
      generationEnabled: true,
      model: "gemini-3.1-flash-image",
      provider: "gemini",
    });

    const deleteResponse = await DELETE(
      new Request("http://127.0.0.1:3000/api/product-image-studio/provider-settings?provider=gemini"),
    );
    const bodyText = await (
      await GET(new Request("http://127.0.0.1:3000/api/product-image-studio/provider-settings"))
    ).text();

    expect(deleteResponse.status).toBe(200);
    expect(bodyText).toContain("\"defaultProvider\":\"openai\"");
    expect(bodyText).toContain("\"openai\":{\"hasCredential\":true");
    expect(bodyText).toContain("\"gemini\":{\"hasCredential\":false");
    expect(bodyText).not.toContain("secret-openai-key");
    expect(bodyText).not.toContain("secret-gemini-key");
  });
});
