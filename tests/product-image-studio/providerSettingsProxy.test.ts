import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as GET_PROVIDER_SETTINGS } from "@/app/api/product-image-studio/provider-settings/route";
import { POST as START_GENERATION } from "@/app/api/product-image-studio/projects/[id]/generations/route";
import { GET as LIST_PROJECT_RESULTS } from "@/app/api/product-image-studio/projects/[id]/results/route";
import { GET as LIST_PROJECTS } from "@/app/api/product-image-studio/projects/route";
import { GET as LIST_RESULTS } from "@/app/api/product-image-studio/results/route";
import { GET as GET_PROVIDER_STATUS } from "@/app/api/product-image-studio/provider-status/route";
import { POST as SVG_CONVERSION } from "@/app/api/product-image-studio/svg-conversions/route";
import { loadProductImageStudioProviderSettingsState } from "@/features/product-image-studio/server/providerSettingsState";

describe("product image studio provider settings backend bridge", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
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

    const response = await GET_PROVIDER_SETTINGS(
      new Request("https://marketcrew.app/api/product-image-studio/provider-settings"),
    );
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

  it("proxies archive GET requests to the Railway backend in hosted frontend runtime", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "https://api.marketcrew.app");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "bridge-token");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, projects: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, results: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, project: { id: "project-remote" }, results: [] }), { status: 200 }));

    await LIST_PROJECTS(new Request("https://marketcrew.app/api/product-image-studio/projects"));
    await LIST_RESULTS(new Request("https://marketcrew.app/api/product-image-studio/results"));
    await LIST_PROJECT_RESULTS(
      new Request("https://marketcrew.app/api/product-image-studio/projects/project-remote/results"),
      { params: Promise.resolve({ id: "project-remote" }) },
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://api.marketcrew.app/api/product-image-studio/projects");
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://api.marketcrew.app/api/product-image-studio/results");
    expect(String(fetchMock.mock.calls[2]?.[0])).toBe(
      "https://api.marketcrew.app/api/product-image-studio/projects/project-remote/results",
    );
  });

  it("proxies SVG conversion API requests to the Railway backend in hosted frontend runtime", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "https://api.marketcrew.app");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "bridge-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            contentType: "image/svg+xml",
            downloadUrl: "/remote.svg",
            fileName: "remote-line.svg",
            svg: "<svg viewBox=\"0 0 10 10\"><path d=\"M1 1H9\" /></svg>",
          },
          ok: true,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );

    const response = await SVG_CONVERSION(svgConversionRequest());
    const bodyText = await response.text();
    const requestInit = fetchMock.mock.calls[0]?.[1];
    const requestHeaders = requestInit?.headers;

    expect(response.status).toBe(200);
    expect(bodyText).toContain("remote-line.svg");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://api.marketcrew.app/api/product-image-studio/svg-conversions",
    );
    expect(requestInit).toMatchObject({ method: "POST" });
    expect(requestHeaders).toMatchObject({
      accept: "application/json",
      authorization: "Bearer bridge-token",
    });
    expect(readHeaderValue(requestHeaders, "content-type")).toContain("multipart/form-data");
  });

  it("fails closed for SVG conversion requests when hosted frontend has no backend API URL", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "");
    vi.stubEnv("MARKETCREW_API_BASE_URL", "");
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const response = await SVG_CONVERSION(svgConversionRequest());
    const bodyText = await response.text();

    expect(response.status).toBe(503);
    expect(bodyText).toContain("Railway 백엔드 API 주소가 설정되지 않았습니다.");
    expect(fetchMock).not.toHaveBeenCalled();
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

function svgConversionRequest(): Request {
  const formData = new FormData();
  formData.set("file", new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "card.png", { type: "image/png" }));
  formData.set("style", "line_art");
  return new Request("https://marketcrew.app/api/product-image-studio/svg-conversions", {
    body: formData,
    method: "POST",
  });
}

function readHeaderValue(headers: HeadersInit | undefined, key: string): string {
  if (headers instanceof Headers) {
    return headers.get(key) ?? "";
  }
  if (Array.isArray(headers)) {
    return headers.find(([candidate]) => candidate.toLowerCase() === key.toLowerCase())?.[1] ?? "";
  }
  return headers?.[key] ?? "";
}
