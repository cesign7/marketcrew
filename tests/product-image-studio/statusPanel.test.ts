import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProductImageStudioPage from "@/app/product-image-studio/page";
import { ProductImageStudioStatusPanel } from "@/components/product-image-studio/ProductImageStudioStatusPanel";
import { getProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";

describe("product image studio status panel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("shows default blocked generation state, storage mode, and export status without secrets", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioStatusPanel, {
        fileStorageMode: "local",
        metadataStorageMode: "memory",
        status: getProductImageStudioProviderStatus({}),
      }),
    );

    expect(html).toContain("스튜디오 상태");
    expect(html).toContain("차단됨");
    expect(html).toContain("게이트 닫힘");
    expect(html).toContain("로컬");
    expect(html).toContain("메모리");
    expect(html).toContain("다운로드");
    expect(html).not.toContain("OPENAI_API_KEY");
    expect(html).not.toContain("PRODUCT_IMAGE_STUDIO");
    expect(html).not.toContain("configured-test-secret");
    expect(html).not.toContain("gpt-image-1");
  });

  it("summarizes enabled generation without printing model or credential values", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioStatusPanel, {
        fileStorageMode: "blob",
        metadataStorageMode: "postgres",
        status: getProductImageStudioProviderStatus({
          OPENAI_API_KEY: "configured-test-secret",
          PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED: "1",
          PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL: "gpt-image-1",
          PRODUCT_IMAGE_STUDIO_PROVIDER: "openai",
        }),
      }),
    );

    expect(html).toContain("가능");
    expect(html).toContain("연결됨");
    expect(html).toContain("Blob");
    expect(html).toContain("DB");
    expect(html).not.toContain("configured-test-secret");
    expect(html).not.toContain("gpt-image-1");
    expect(html).not.toContain("OPENAI_API_KEY");
  });

  it("uses the Railway provider state on the main studio page in hosted frontend runtime", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "https://api.marketcrew.app");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "bridge-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            settings: {
              generationEnabled: true,
              hasCredential: true,
              model: "hidden-gemini-model",
              provider: "gemini",
              storageMode: "postgres",
              updatedAt: "2026-06-12T00:00:00.000Z",
            },
            status: {
              generation: { enabled: true, status: "enabled" },
              provider: {
                configured: true,
                credentialConfigured: true,
                modelConfigured: true,
                name: "gemini",
              },
            },
            storageMode: "postgres",
          },
          ok: true,
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
    );

    const html = renderToStaticMarkup(await ProductImageStudioPage());

    expect(html).toContain("가능");
    expect(html).not.toContain("차단됨");
    expect(html).not.toContain("hidden-gemini-model");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://api.marketcrew.app/api/product-image-studio/provider-settings",
    );
  });
});
