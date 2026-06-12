import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DELETE,
  GET,
  POST,
} from "@/app/api/product-image-studio/provider-settings/route";
import { ProductImageStudioProviderSettingsForm } from "@/components/product-image-studio/ProductImageStudioProviderSettingsForm";
import {
  getProductImageStudioProviderStatus,
  getConfiguredProductImageStudioProviderStatus,
} from "@/features/product-image-studio/server/providerConfig";
import {
  resetProductImageStudioProviderSettingsForTests,
  saveProductImageStudioProviderSettings,
} from "@/features/product-image-studio/server/providerSettingsStore";
import { resolveConfiguredProductImageStudioImageProvider } from "@/features/product-image-studio/server/imageProvider";

describe("product image studio provider settings", () => {
  afterEach(() => {
    resetProductImageStudioProviderSettingsForTests();
    vi.unstubAllEnvs();
  });

  it("stores provider keys server-side without echoing the key", async () => {
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/product-image-studio/provider-settings", {
        body: JSON.stringify({
          apiKey: "secret-gemini-key",
          generationEnabled: true,
          model: "gemini-3.1-flash-image",
          provider: "gemini",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const bodyText = await response.text();

    expect(response.status).toBe(200);
    expect(bodyText).toContain("\"provider\":\"gemini\"");
    expect(bodyText).toContain("\"hasCredential\":true");
    expect(bodyText).not.toContain("secret-gemini-key");

    const status = await getConfiguredProductImageStudioProviderStatus({});
    expect(status).toMatchObject({
      generation: { status: "enabled" },
      provider: { credentialConfigured: true, name: "gemini" },
    });
  });

  it("keeps an existing key when only provider settings change", async () => {
    await saveProductImageStudioProviderSettings({
      apiKey: "secret-openai-key",
      generationEnabled: false,
      model: "gpt-image-1",
      provider: "openai",
    });

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/product-image-studio/provider-settings", {
        body: JSON.stringify({
          apiKey: "",
          generationEnabled: true,
          model: "gpt-image-2",
          provider: "openai",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const bodyText = await response.text();

    expect(response.status).toBe(200);
    expect(bodyText).toContain("gpt-image-2");
    expect(bodyText).not.toContain("secret-openai-key");

    const resolved = await resolveConfiguredProductImageStudioImageProvider({});
    expect(resolved.kind).toBe("enabled");
    if (resolved.kind === "enabled") {
      expect(resolved.provider.name).toBe("openai");
    }
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

  it("renders the provider settings UI without exposing credentials", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioProviderSettingsForm, {
        initialSettings: {
          generationEnabled: true,
          hasCredential: true,
          model: "gemini-3.1-flash-image",
          provider: "gemini",
          storageMode: "memory",
          updatedAt: "2026-06-12T00:00:00.000Z",
        },
        initialStorageMode: "memory",
      }),
    );

    expect(html).toContain("생성 연결 설정");
    expect(html).toContain("OpenAI");
    expect(html).toContain("Gemini");
    expect(html).toContain("실제 이미지 생성 허용");
    expect(html).toContain("키 저장됨");
    expect(html).not.toContain("secret");
    expect(html).not.toContain("OPENAI_API_KEY");
  });
});
