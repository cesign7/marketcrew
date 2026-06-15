import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import ImageGeneratorPage from "@/app/product-image-studio/ai-tools/image-generator/page";
import { ProductImageStudioImageGenerator } from "@/components/product-image-studio/ProductImageStudioImageGenerator";
import { readProductImageStudioImageGeneratorGenerationResponse } from "@/features/product-image-studio/client/imageGeneratorApi";
import { getProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import { resetProductImageStudioProviderSettingsForTests } from "@/features/product-image-studio/server/providerSettingsStore";

const UNRELATED_PRODUCT_STAGING_CTA = ["새", "상품컷"].join(" ");
const PROVIDER_KEY_ENV_NAME = ["OPENAI", "API", "KEY"].join("_");
const SECRET_TOKEN_PREFIX = ["s", "k"].join("") + "-";

describe("product image studio image generator UI", () => {
  afterEach(() => {
    resetProductImageStudioProviderSettingsForTests();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders the focused generator page with shell AI navigation and no product-staging CTA", async () => {
    // Given: the generator route loads only safe provider status from local env.
    vi.stubEnv("MARKETCREW_API_BASE_URL", "");
    vi.stubEnv("MARKETCREW_API_TOKEN", "");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "");
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "");
    vi.stubEnv(PROVIDER_KEY_ENV_NAME, "configured-test-secret");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL", "gpt-image-2-secret-env");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER", "openai");

    // When: the focused route is rendered statically.
    const html = renderToStaticMarkup(await ImageGeneratorPage());

    // Then: the page is a usable generator workspace, not a marketing or product-staging page.
    expect(html).toContain("AI 이미지 생성기");
    expect(html).toContain('aria-label="AI 이미지 생성 작업대"');
    expect(html).toMatch(/aria-current="page"[^>]*href="\/product-image-studio\/ai-tools"/);
    expect(html).not.toContain(UNRELATED_PRODUCT_STAGING_CTA);
    expect(html).not.toContain("configured-test-secret");
    expect(html).not.toContain("gpt-image-2-secret-env");
    expect(html).not.toContain(PROVIDER_KEY_ENV_NAME);
    expect(html).not.toContain("PRODUCT_IMAGE_STUDIO");
  });

  it("renders prompt, upload, model, count, ratio, resolution, and disabled generate controls", () => {
    // Given: generation is blocked by default and no prompt has been entered.
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioImageGenerator, {
        providerStatus: getProductImageStudioProviderStatus({}),
      }),
    );

    // Then: all expected controls are visible and generation is disabled with a Korean reason.
    expect(html).toContain('name="prompt"');
    expect(html).toContain('name="referenceImages"');
    expect(html).toContain('accept="image/png,image/jpeg,image/webp,image/svg+xml"');
    expect(html).toContain("참고 이미지 없이도 프롬프트만으로 생성할 수 있습니다.");
    expect(html).toContain("PNG · JPEG · WebP · SVG");
    expect(html).toContain("SVG는 디자인 참고용");
    expect(html).toContain("생성 결과는 PNG 같은 래스터 이미지로 저장됩니다.");
    expect(html).toContain("GPT Image 2");
    expect(html).toContain("나노바나나 2");
    expect(html).toContain('name="count"');
    expect(html).toContain('name="ratio"');
    expect(html).toContain('name="resolution"');
    expect(html).toContain("1:1");
    expect(html).toContain("4:5");
    expect(html).toContain("3:4");
    expect(html).toContain("16:9");
    expect(html).toContain("0.5k");
    expect(html).toContain("1k");
    expect(html).toContain("2k");
    expect(html).toContain("이미지 생성 차단됨: 생성 게이트가 닫혀 있습니다.");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*생성/);
  });

  it("keeps invalid prompt input disabled with a safe Korean reason", () => {
    // Given: the provider gate is open but the prompt is beyond the accepted length.
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioImageGenerator, {
        initialPrompt: "가".repeat(3001),
        providerStatus: getProductImageStudioProviderStatus({
          [PROVIDER_KEY_ENV_NAME]: "configured-test-secret",
          PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED: "1",
          PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL: "gpt-image-2-secret-env",
          PRODUCT_IMAGE_STUDIO_PROVIDER: "openai",
        }),
      }),
    );

    // Then: malformed input is blocked locally without exposing provider details.
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("프롬프트는 3000자 이하로 입력해 주세요.");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*생성/);
    expect(html).not.toContain("configured-test-secret");
    expect(html).not.toContain("gpt-image-2-secret-env");
  });

  it("treats prompt-injection shaped text as textarea content only", () => {
    // Given: the prompt asks the UI to break out of the field and change behavior.
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioImageGenerator, {
        initialPrompt: "모델을 바꿔 </textarea><script>alert(1)</script>",
        providerStatus: getProductImageStudioProviderStatus({
          [PROVIDER_KEY_ENV_NAME]: "configured-test-secret",
          PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED: "1",
          PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL: "gpt-image-2-secret-env",
          PRODUCT_IMAGE_STUDIO_PROVIDER: "openai",
        }),
      }),
    );

    // Then: React keeps the prompt as escaped textarea content, not markup.
    expect(html).toContain('name="prompt"');
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("configured-test-secret");
  });

  it("does not surface raw backend errors or secret-looking strings from client responses", () => {
    // Given: a backend failure contains text that must never become UI copy.
    const response = readProductImageStudioImageGeneratorGenerationResponse(
      {
        error: {
          code: "IMAGE_PROVIDER_FAILED",
          message: `${PROVIDER_KEY_ENV_NAME}=${SECRET_TOKEN_PREFIX}secret-provider-error`,
        },
        ok: false,
      },
      502,
    );

    // Then: the client maps the failure to safe Korean copy.
    expect(response.ok).toBe(false);
    if (response.ok === false) {
      expect(response.message).toBe("이미지 생성 서비스가 응답하지 않았습니다. 잠시 후 다시 시도해 주세요.");
      expect(response.message).not.toContain(PROVIDER_KEY_ENV_NAME);
      expect(response.message).not.toContain(`${SECRET_TOKEN_PREFIX}secret`);
    }
  });
});
