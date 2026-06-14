import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProductImageStudioPage from "@/app/product-image-studio/page";
import ProductImageStudioSettingsPage from "@/app/product-image-studio/settings/page";
import { ProductImageStudioStatusPanel } from "@/components/product-image-studio/ProductImageStudioStatusPanel";
import { getProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";

vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve(
      new Headers([
        ["cookie", "studio_session=fixture"],
        ["x-forwarded-host", "marketcrew.app"],
        ["x-forwarded-proto", "https"],
      ]),
    ),
}));

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

  it("renders settings route copy while preserving provider safety surfaces without secrets", async () => {
    // Given: the settings route is rendered with env-backed provider state and no remote bridge.
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "");
    vi.stubEnv("OPENAI_API_KEY", "configured-route-secret");
    vi.stubEnv("GEMINI_API_KEY", "configured-gemini-route-secret");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "0");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL", "hidden-route-model");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER", "openai");

    // When: the settings page is rendered through the real route component.
    const html = renderToStaticMarkup(await ProductImageStudioSettingsPage());

    // Then: the user-facing page label moves to 환경설정 while safety controls stay visible.
    expect(html).toContain("환경설정");
    expect(html).toContain("이미지 생성 연결과 생성 게이트를 관리합니다.");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("작업 상태");
    expect(html).toContain('data-status-badge="generation"');
    expect(html).toContain("생성");
    expect(html).toContain("차단");
    expect(html).toContain('data-status-badge="provider"');
    expect(html).toContain("연결");
    expect(html).toContain("연결됨");
    expect(html).toContain('data-status-badge="file-storage"');
    expect(html).toContain("저장");
    expect(html).toContain('data-status-badge="metadata"');
    expect(html).toContain("기록");
    expect(html).toContain("이미지 생성 연결");
    expect(html).toContain("기본 생성 엔진");
    expect(html).toContain("전체 생성 게이트");
    expect(html).toContain("실제 생성 차단 중");
    expect(html).toContain("게이트 열기");
    expect(html).toContain("게이트 닫기");
    expect(html).not.toContain("연결 리소스");
    expect(html).not.toContain("OPENAI_API_KEY");
    expect(html).not.toContain("GEMINI_API_KEY");
    expect(html).not.toContain("API_KEY=");
    expect(html).not.toContain("SECRET");
    expect(html).not.toContain("TOKEN");
    expect(html).not.toContain("configured-route-secret");
    expect(html).not.toContain("configured-gemini-route-secret");
    expect(html).not.toContain("hidden-route-model");
    expect(html).not.toContain("sk-");
    expect(html).not.toContain("Photoroom");
    expect(html).not.toContain("Vercel");
  });

  it("uses the Railway provider state on the main studio page in hosted frontend runtime", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "https://api.marketcrew.app");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "bridge-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/product-image-studio/provider-settings")) {
        return new Response(
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
        );
      }

      if (url.endsWith("/api/product-image-studio/projects")) {
        return new Response(JSON.stringify({ ok: true, projects: [] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ ok: true, results: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });

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
