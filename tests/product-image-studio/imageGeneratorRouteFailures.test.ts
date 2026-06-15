import { afterEach, describe, expect, it, vi } from "vitest";
import { handleProductImageStudioImageGeneratorGeneration } from "@/features/product-image-studio/server/imageGeneratorRunner";
import type {
  ImageGenerationProvider,
  ProductImageStudioProviderCallInput,
  ProductImageStudioProviderImageResult,
} from "@/features/product-image-studio/server/imageProvider";
import {
  enabledImageGeneratorRouteResolver,
  expectNoImageGeneratorRouteArchiveWrites,
  imageGeneratorRouteFile,
  imageGeneratorRouteTestState,
  multipartImageGeneratorRouteRequest,
  recordingImageGeneratorRouteProvider,
  safeImageGeneratorRouteSvg,
  validImageGeneratorRoutePayload,
} from "./imageGeneratorRouteTestSupport";

describe("product image studio image-generator route failures", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 502 with no persisted records when every provider call fails", async () => {
    const state = imageGeneratorRouteTestState();
    const provider = recordingImageGeneratorRouteProvider("gemini", [0, 1]);
    const response = await handleProductImageStudioImageGeneratorGeneration(
      multipartImageGeneratorRouteRequest(validImageGeneratorRoutePayload({ count: 2 }), [
        imageGeneratorRouteFile("card.png", "image/png", "png"),
        imageGeneratorRouteFile("card.jpg", "image/jpeg", "jpeg"),
        imageGeneratorRouteFile("card.webp", "image/webp", "webp"),
        imageGeneratorRouteFile("safe.svg", "image/svg+xml", safeImageGeneratorRouteSvg()),
      ]),
      { ...state, resolveProvider: enabledImageGeneratorRouteResolver("gemini-3.1-flash-image", provider) },
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: { code: "IMAGE_PROVIDER_FAILED" }, ok: false });
    expect(provider.calls).toHaveLength(2);
    await expectNoImageGeneratorRouteArchiveWrites(state);
  });

  it("redacts provider failure messages before returning the API error", async () => {
    const state = imageGeneratorRouteTestState();
    const response = await handleProductImageStudioImageGeneratorGeneration(
      multipartImageGeneratorRouteRequest(validImageGeneratorRoutePayload()),
      {
        ...state,
        resolveProvider: enabledImageGeneratorRouteResolver("gpt-image-2", leakingProvider()),
      },
    );
    const bodyText = await response.text();

    expect(response.status).toBe(502);
    expect(bodyText).toContain("IMAGE_PROVIDER_FAILED");
    expect(bodyText).toContain("req-redacted-provider");
    expect(bodyText).toContain("이미지 provider 요청이 실패했습니다.");
    expect(bodyText).not.toContain("OPENAI_API_KEY");
    expect(bodyText).not.toContain("sk-live-route-leak");
    expect(bodyText).not.toContain("internal.marketcrew.local");
    expect(bodyText).not.toContain("token=route-token");
    await expectNoImageGeneratorRouteArchiveWrites(state);
  });
});

function leakingProvider(): ImageGenerationProvider {
  const run = async (_input: ProductImageStudioProviderCallInput): Promise<ProductImageStudioProviderImageResult> => {
    throw Object.assign(
      new Error("provider failed with OPENAI_API_KEY=sk-live-route-leak at internal.marketcrew.local token=route-token"),
      { requestId: "req-redacted-provider" },
    );
  };
  return {
    editWithReferences: run,
    generateScene: run,
    name: "openai",
    regenerateRatio: run,
  };
}
