import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductImageStudioStatusPanel } from "@/components/product-image-studio/ProductImageStudioStatusPanel";
import { getProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";

describe("product image studio status panel", () => {
  it("shows default blocked generation state, storage mode, and export status without secrets", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioStatusPanel, {
        status: getProductImageStudioProviderStatus({}),
        storageMode: "local",
      }),
    );

    expect(html).toContain("스튜디오 상태");
    expect(html).toContain("이미지 생성 차단됨");
    expect(html).toContain("생성 게이트 닫힘");
    expect(html).toContain("로컬 개발 저장소");
    expect(html).toContain("개별/ZIP 다운로드 가능");
    expect(html).not.toContain("OPENAI_API_KEY");
    expect(html).not.toContain("PRODUCT_IMAGE_STUDIO");
    expect(html).not.toContain("configured-test-secret");
    expect(html).not.toContain("gpt-image-1");
  });

  it("summarizes enabled generation without printing model or credential values", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioStatusPanel, {
        status: getProductImageStudioProviderStatus({
          OPENAI_API_KEY: "configured-test-secret",
          PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED: "1",
          PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL: "gpt-image-1",
          PRODUCT_IMAGE_STUDIO_PROVIDER: "openai",
        }),
        storageMode: "local",
      }),
    );

    expect(html).toContain("이미지 생성 가능");
    expect(html).toContain("생성 연결 준비됨");
    expect(html).not.toContain("configured-test-secret");
    expect(html).not.toContain("gpt-image-1");
    expect(html).not.toContain("OPENAI_API_KEY");
  });
});
