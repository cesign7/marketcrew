import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as START_IMAGE_GENERATOR } from "@/app/api/product-image-studio/image-generator/generations/route";

describe("product image studio image generator backend proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("proxies malformed image generator requests before local parsing when backend env is configured", async () => {
    // Given: the hosted frontend has a backend bridge configured.
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "https://api.marketcrew.app");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "bridge-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { generation: { id: "generation-remote", status: "queued" } }, ok: true }), {
        headers: { "content-type": "application/json" },
        status: 202,
      }),
    );

    // When: the request body is malformed but should still be forwarded first.
    const response = await START_IMAGE_GENERATOR(
      new Request("https://marketcrew.app/api/product-image-studio/image-generator/generations", {
        body: "{not-json",
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const bodyText = await response.text();

    // Then: the Railway backend receives the exact generation route before any local validation runs.
    expect(response.status).toBe(202);
    expect(bodyText).toContain("generation-remote");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://api.marketcrew.app/api/product-image-studio/image-generator/generations",
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

  it("returns a clear local blocked response without provider billing when no backend proxy is configured", async () => {
    // Given: local route handling has no backend bridge and provider env values are present.
    vi.stubEnv("OPENAI_API_KEY", "configured-test-secret");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL", "gpt-image-2");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER", "openai");
    const fetchMock = vi.spyOn(globalThis, "fetch");

    // When: the image generator route is invoked without the Railway proxy.
    const response = await START_IMAGE_GENERATOR(
      new Request("http://127.0.0.1:3000/api/product-image-studio/image-generator/generations", {
        body: JSON.stringify({ prompt: "테스트 이미지", modelLabel: "gpt2", count: 1, ratio: "1:1", resolution: "1k" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const bodyText = await response.text();
    const bodyJson: unknown = JSON.parse(bodyText);

    // Then: local fallback is explicitly blocked and does not leak provider configuration.
    expect(response.status).toBe(423);
    expect(bodyJson).toMatchObject({
      data: {
        generation: {
          message: "이미지 생성 차단됨: 운영 백엔드 proxy 연결 후 실행할 수 있습니다.",
          reason: "generation_disabled",
          status: "blocked",
        },
      },
      ok: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(bodyText).not.toContain("configured-test-secret");
    expect(bodyText).not.toContain("gpt-image-2");
    expect(bodyText).not.toContain("OPENAI_API_KEY");
    expect(bodyText).not.toContain("PRODUCT_IMAGE_STUDIO");
  });
});
