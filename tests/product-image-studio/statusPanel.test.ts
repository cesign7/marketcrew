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

  it("renders blocked generation as compact app-frame status badges without secrets", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioStatusPanel, {
        fileStorageMode: "local",
        metadataStorageMode: "memory",
        status: getProductImageStudioProviderStatus({}),
      }),
    );

    expect(html).toContain("작업 상태");
    expect(html).toContain('data-status-badge="generation"');
    expect(html).toContain('data-status-badge="provider"');
    expect(html).toContain('data-status-badge="file-storage"');
    expect(html).toContain('data-status-badge="metadata"');
    expect(html).toContain('data-status-badge="download"');
    expect(html).toContain("생성");
    expect(html).toContain("차단");
    expect(html).toContain("연결");
    expect(html).toContain("설정 필요");
    expect(html).toContain("저장");
    expect(html).toContain("로컬");
    expect(html).toContain("기록");
    expect(html).toContain("메모리");
    expect(html).toContain("다운로드");
    expect(html).not.toContain("상품 이미지 스튜디오 상태 요약");
    expect(html).not.toContain("게이트 닫힘");
    expect(html).not.toContain("OPENAI_API_KEY");
    expect(html).not.toContain("PRODUCT_IMAGE_STUDIO");
    expect(html).not.toContain("configured-test-secret");
    expect(html).not.toContain("gpt-image-1");
    expect(html).not.toContain("Lovable");
    expect(html).not.toContain("Photoroom");
  });

  it("renders enabled generation and durable stores as compact status badges without model values", () => {
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

    expect(html).toContain("작업 상태");
    expect(html).toContain('data-status-badge="generation"');
    expect(html).toContain("생성");
    expect(html).toContain("가능");
    expect(html).toContain('data-status-badge="provider"');
    expect(html).toContain("연결");
    expect(html).toContain("연결됨");
    expect(html).toContain('data-status-badge="file-storage"');
    expect(html).toContain("저장");
    expect(html).toContain("Blob");
    expect(html).toContain('data-status-badge="metadata"');
    expect(html).toContain("기록");
    expect(html).toContain("DB");
    expect(html).toContain("다운로드");
    expect(html).not.toContain("상품 이미지 스튜디오 상태 요약");
    expect(html).not.toContain("configured-test-secret");
    expect(html).not.toContain("gpt-image-1");
    expect(html).not.toContain("OPENAI_API_KEY");
    expect(html).not.toContain("PRODUCT_IMAGE_STUDIO");
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

    expect(html).toContain("작업 상태");
    expect(html).toContain("생성");
    expect(html).toContain("가능");
    expect(html).toContain("연결");
    expect(html).toContain("저장");
    expect(html).toContain("기록");
    expect(html).not.toContain("차단됨");
    expect(html).not.toContain("hidden-gemini-model");
    expect(html).not.toContain("Lovable");
    expect(html).not.toContain("Photoroom");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://api.marketcrew.app/api/product-image-studio/provider-settings",
    );
  });
});
