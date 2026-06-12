import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DELETE,
  GET,
  POST,
} from "@/app/api/product-image-studio/provider-settings/route";
import { POST as START_GENERATION } from "@/app/api/product-image-studio/projects/[id]/generations/route";
import { GET as GET_PROVIDER_STATUS } from "@/app/api/product-image-studio/provider-status/route";
import { ProductImageStudioProviderSettingsForm } from "@/components/product-image-studio/ProductImageStudioProviderSettingsForm";
import {
  getProductImageStudioProviderStatus,
  getConfiguredProductImageStudioProviderStatus,
} from "@/features/product-image-studio/server/providerConfig";
import {
  getProductImageStudioProviderSettingsStorageMode,
  getProductImageStudioProviderSettingsSummary,
  resetProductImageStudioProviderSettingsForTests,
  saveProductImageStudioProviderSettings,
} from "@/features/product-image-studio/server/providerSettingsStore";
import { resolveConfiguredProductImageStudioImageProvider } from "@/features/product-image-studio/server/imageProvider";
import { loadProductImageStudioProviderSettingsState } from "@/features/product-image-studio/server/providerSettingsState";

describe("product image studio provider settings", () => {
  afterEach(() => {
    resetProductImageStudioProviderSettingsForTests();
    vi.restoreAllMocks();
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

  it("proxies provider settings API requests to the Railway backend in hosted frontend runtime", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "https://api.marketcrew.app");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "bridge-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: remoteProviderSettingsState(), ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const response = await GET(new Request("https://marketcrew.app/api/product-image-studio/provider-settings"));
    const bodyText = await response.text();

    expect(response.status).toBe(200);
    expect(bodyText).toContain("remote-gemini-model");
    expect(bodyText).toContain("\"storageMode\":\"postgres\"");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://api.marketcrew.app/api/product-image-studio/provider-settings",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: {
        accept: "application/json",
        authorization: "Bearer bridge-token",
      },
      method: "GET",
    });
  });

  it("proxies provider status API requests to the Railway backend in hosted frontend runtime", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "https://api.marketcrew.app");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "bridge-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: remoteProviderSettingsState().status, ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const response = await GET_PROVIDER_STATUS(
      new Request("https://marketcrew.app/api/product-image-studio/provider-status"),
    );
    const bodyText = await response.text();

    expect(response.status).toBe(200);
    expect(bodyText).toContain("\"name\":\"gemini\"");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://api.marketcrew.app/api/product-image-studio/provider-status",
    );
  });

  it("proxies generation API requests to the Railway backend in hosted frontend runtime", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "https://api.marketcrew.app");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "bridge-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            generation: { id: "generation-remote", status: "ready" },
            results: [],
          },
          ok: true,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );

    const response = await START_GENERATION(
      new Request("https://marketcrew.app/api/product-image-studio/projects/project-remote/generations", {
        body: JSON.stringify({
          conceptId: "minimal-studio",
          outputs: ["card_single"],
          productionSettings: {},
          qualityMode: "draft",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      { params: Promise.resolve({ id: "project-remote" }) },
    );
    const bodyText = await response.text();

    expect(response.status).toBe(200);
    expect(bodyText).toContain("generation-remote");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://api.marketcrew.app/api/product-image-studio/projects/project-remote/generations",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: {
        accept: "application/json",
        authorization: "Bearer bridge-token",
        "content-type": "application/json",
      },
      method: "POST",
    });
  });

  it("loads the provider settings page state from the Railway backend", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "https://api.marketcrew.app");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "bridge-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: remoteProviderSettingsState(), ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const state = await loadProductImageStudioProviderSettingsState();

    expect(state.storageMode).toBe("postgres");
    expect(state.settings).toMatchObject({
      hasCredential: true,
      model: "remote-gemini-model",
      provider: "gemini",
    });
    expect(state.status).toMatchObject({
      generation: { status: "enabled" },
      provider: { credentialConfigured: true, name: "gemini" },
    });
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
    expect(html).toContain("생성 게이트");
    expect(html).toContain("게이트 열기");
    expect(html).toContain("게이트 닫기");
    expect(html).toContain("OpenAI");
    expect(html).toContain("Gemini");
    expect(html).toContain("실제 이미지 생성 허용");
    expect(html).toContain("키 저장됨");
    expect(html).not.toContain("secret");
    expect(html).not.toContain("OPENAI_API_KEY");
  });
});

function remoteProviderSettingsState() {
  return {
    settings: {
      generationEnabled: true,
      hasCredential: true,
      model: "remote-gemini-model",
      provider: "gemini",
      storageMode: "postgres",
      updatedAt: "2026-06-12T00:00:00.000Z",
    },
    status: {
      generation: {
        enabled: true,
        status: "enabled",
      },
      provider: {
        configured: true,
        credentialConfigured: true,
        modelConfigured: true,
        name: "gemini",
      },
    },
    storageMode: "postgres",
  };
}
