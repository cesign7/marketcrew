import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/product-image-studio/provider-settings/route";
import {
  getConfiguredProductImageStudioProviderStatus,
} from "@/features/product-image-studio/server/providerConfig";
import {
  getActiveProductImageStudioProviderSettings,
  getProductImageStudioProviderSettingsSummary,
  saveProductImageStudioProviderSettings,
} from "@/features/product-image-studio/server/providerSettingsStore";
import { resolveConfiguredProductImageStudioImageProvider } from "@/features/product-image-studio/server/imageProvider";
import { renderProviderSettingsFormHtml } from "./providerSettingsFormFixture";
import {
  resetProviderSettingsTestState,
  TEST_GEMINI_API_KEY,
} from "./providerSettingsTestSupport";

describe("product image studio provider settings", () => {
  afterEach(resetProviderSettingsTestState);

  it("stores provider keys server-side without echoing the key", async () => {
    const response = await POST(
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
    const bodyText = await response.text();

    expect(response.status).toBe(200);
    expect(bodyText).toContain("\"provider\":\"gemini\"");
    expect(bodyText).toContain("\"hasCredential\":true");
    expect(bodyText).not.toContain(TEST_GEMINI_API_KEY);

    const status = await getConfiguredProductImageStudioProviderStatus({});
    expect(status).toMatchObject({
      generation: { status: "enabled" },
      provider: { credentialConfigured: true, name: "gemini" },
    });
  });

  it("normalizes provider key pasted from an environment variable assignment", async () => {
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/product-image-studio/provider-settings", {
        body: JSON.stringify({
          apiKey: `export GEMINI_API_KEY="${TEST_GEMINI_API_KEY}"`,
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
    expect(bodyText).not.toContain(TEST_GEMINI_API_KEY);
    await expect(getActiveProductImageStudioProviderSettings({}, "gemini")).resolves.toMatchObject({
      apiKey: TEST_GEMINI_API_KEY,
      provider: "gemini",
    });
  });

  it("rejects a key that does not match the selected provider before storing it", async () => {
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/product-image-studio/provider-settings", {
        body: JSON.stringify({
          apiKey: "not-a-gemini-provider-key",
          generationEnabled: true,
          model: "gemini-3.1-flash-image",
          provider: "gemini",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const bodyText = await response.text();

    expect(response.status).toBe(400);
    expect(bodyText).toContain("Gemini API 키는 Google AI Studio에서 발급한 AIza... 형식이어야 합니다.");
    expect(bodyText).not.toContain("not-a-gemini-provider-key");
    await expect(getProductImageStudioProviderSettingsSummary()).resolves.toBeNull();
  });

  it("rejects a masked provider key before storing it", async () => {
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/product-image-studio/provider-settings", {
        body: JSON.stringify({
          apiKey: "AIzaSy****************",
          generationEnabled: true,
          model: "gemini-3.1-flash-image",
          provider: "gemini",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const bodyText = await response.text();

    expect(response.status).toBe(400);
    expect(bodyText).toContain("마스킹된 키는 저장할 수 없습니다.");
    expect(bodyText).not.toContain("AIzaSy****************");
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

  it("renders provider-specific settings cards", () => {
    const html = renderProviderSettingsFormHtml();

    expect(html).toContain("OpenAI 설정 카드");

    expect(html).toContain("Gemini 설정 카드");
    expect(html).toContain("OpenAI 연결됨");
    expect(html).toContain("Gemini 연결 안됨");
    expect(html).toContain("기본 provider");
    expect(html).toContain("전체 생성 게이트");
    expect(html).toContain("키를 저장해도 게이트가 닫혀 있으면 실제 이미지는 생성되지 않습니다.");
    expect(html).not.toContain("secret");
    expect(html).not.toContain("OPENAI_API_KEY");
  });
});
