import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createProductImageStudioAiToolGenerationRunGuard,
  hasProductImageStudioAiToolRenderableGeneratedResult,
  readProductImageStudioAiToolGenerationInput,
} from "@/components/product-image-studio/ProductImageStudioAiToolGenerationRuntime";
import { createProductImageStudioAiToolUploadObjectUrlRuntime } from "@/components/product-image-studio/ProductImageStudioAiToolUploadObjectUrlRuntime";
import { findProductImageStudioAiTool } from "@/components/product-image-studio/ProductImageStudioAiToolLookup";
import { ProductImageStudioAiToolPreviewPanel } from "@/components/product-image-studio/ProductImageStudioAiToolPreviewPanel";
import type { ProductImageStudioImageGeneratorResultPreview } from "@/features/product-image-studio/client/imageGeneratorApi";
import type { ProductImageStudioAiToolUploadedAsset } from "@/components/product-image-studio/ProductImageStudioAiToolUploads";

type Deferred<T> = {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolveDeferred: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolveDeferred = resolve;
  });
  if (resolveDeferred === undefined) {
    throw new Error("Deferred promise resolver was not initialized.");
  }
  return { promise, resolve: resolveDeferred };
}

describe("product image studio AI tool runtime", () => {
  it("does not present an uploaded object URL as generated output when the modal is ready", () => {
    // Given: an uploaded reference image has only an input preview object URL.
    const tool = findProductImageStudioAiTool("image-generator");
    if (tool === null) {
      throw new Error("AI image generator fixture is missing.");
    }
    const uploadedReference: ProductImageStudioAiToolUploadedAsset = {
      file: new File(["card-front"], "card-front.png", { type: "image/png" }),
      fileName: "card-front.png",
      fileSizeLabel: "24KB",
      id: "reference-image-card-front",
      mimeTypeLabel: "PNG",
      previewUrl: "blob:uploaded-reference-preview",
      slotId: "reference-image",
      slotTitle: "참고 이미지",
    };

    // When: the result panel is asked to render a ready generation state.
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioAiToolPreviewPanel, {
        countLabel: "1컷",
        featuredAsset: uploadedReference,
        generatedResults: [],
        message: "생성 이미지가 준비되었습니다.",
        phase: "ready",
        quality: "1k",
        ratioLabel: "정사각형 1:1",
        ratioValue: "1:1",
        tool,
        uploadedCount: 1,
      }),
    );

    // Then: the uploaded object URL is not shown as if it were generated API output.
    expect(html).toContain("생성 완료");
    expect(html).not.toContain("blob:uploaded-reference-preview");
  });

  it("renders generated API preview, download, and vector URLs in the right panel", () => {
    // Given: the API returned generated output URLs that differ from the uploaded input preview.
    const tool = findProductImageStudioAiTool("image-generator");
    if (tool === null) {
      throw new Error("AI image generator fixture is missing.");
    }
    const uploadedReference: ProductImageStudioAiToolUploadedAsset = {
      file: new File(["card-front"], "card-front.png", { type: "image/png" }),
      fileName: "card-front.png",
      fileSizeLabel: "24KB",
      id: "reference-image-card-front",
      mimeTypeLabel: "PNG",
      previewUrl: "blob:uploaded-reference-preview",
      slotId: "reference-image",
      slotTitle: "참고 이미지",
    };

    // When: the result panel receives generated API output.
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioAiToolPreviewPanel, {
        countLabel: "1컷",
        featuredAsset: uploadedReference,
        generatedResults: [
          {
            downloadUrl: "/api/product-image-studio/projects/project-1/results/result-1/download",
            generationRequestId: "generation-1",
            id: "result-1",
            label: "AI 생성 이미지",
            previewUrl: "/api/product-image-studio/projects/project-1/results/result-1/preview.png",
            ratio: "1:1",
            vectorSvgUrl: "/api/product-image-studio/projects/project-1/results/result-1/vector.svg",
          },
        ],
        message: "생성 이미지가 준비되었습니다.",
        phase: "ready",
        quality: "1k",
        ratioLabel: "정사각형 1:1",
        ratioValue: "1:1",
        tool,
        uploadedCount: 1,
      }),
    );

    // Then: generated links render and the uploaded object URL stays out of result markup.
    expect(html).toContain("/api/product-image-studio/projects/project-1/results/result-1/preview.png");
    expect(html).toContain("/api/product-image-studio/projects/project-1/results/result-1/download");
    expect(html).toContain("/api/product-image-studio/projects/project-1/results/result-1/vector.svg");
    expect(html).toContain('data-ai-tool-generated-result="true"');
    expect(html).not.toContain("blob:uploaded-reference-preview");
  });

  it("builds generator input from controlled prompt, instruction, and uploaded files", () => {
    // Given: the modal has controlled text and a preserved uploaded File.
    const referenceImage = new File(["card-front"], "card-front.png", { type: "image/png" });

    // When: the runtime reads the generation input.
    const result = readProductImageStudioAiToolGenerationInput({
      count: 1,
      instruction: "상품이 잘 보이도록 밝은 조명을 유지합니다.",
      modelLabel: "gpt2",
      prompt: "연하장 카드 프리미엄 테이블 설정샷",
      quality: "1k",
      ratio: "1:1",
      referenceImages: [referenceImage],
    });

    // Then: the existing generator client can receive prompt text and multipart files.
    if (result.ok === false) {
      throw new Error(result.message);
    }
    expect(result.value.prompt).toContain("연하장 카드 프리미엄 테이블 설정샷");
    expect(result.value.prompt).toContain("추가 지시: 상품이 잘 보이도록 밝은 조명을 유지합니다.");
    expect(result.value.referenceImages).toEqual([referenceImage]);
  });

  it("blocks malformed modal input before calling the generator client", () => {
    // Given: the modal input is missing prompt text or contains unsupported options.
    const baseInput = {
      count: 1,
      instruction: "",
      modelLabel: "gpt2",
      prompt: "연하장 카드 프리미엄 테이블 설정샷",
      quality: "1k",
      ratio: "1:1",
      referenceImages: [],
    } as const;

    // When: malformed values are read.
    const emptyPrompt = readProductImageStudioAiToolGenerationInput({ ...baseInput, prompt: "   " });
    const unsupportedCount = readProductImageStudioAiToolGenerationInput({ ...baseInput, count: 8 });
    const unsupportedRatio = readProductImageStudioAiToolGenerationInput({ ...baseInput, ratio: "original" });
    const unsupportedQuality = readProductImageStudioAiToolGenerationInput({ ...baseInput, quality: "4k" });

    // Then: each case returns concise Korean blocked copy instead of a fake ready state.
    expect(emptyPrompt).toEqual({ message: "프롬프트를 입력하면 생성할 수 있습니다.", ok: false });
    expect(unsupportedCount).toEqual({ message: "이미지 개수는 1개부터 4개까지 선택해 주세요.", ok: false });
    expect(unsupportedRatio).toEqual({ message: "이 비율은 현재 생성기에서 아직 지원하지 않습니다.", ok: false });
    expect(unsupportedQuality).toEqual({ message: "이 화질은 현재 생성기에서 아직 지원하지 않습니다.", ok: false });
  });

  it("treats generated results without preview, download, or vector URLs as missing output", () => {
    // Given: the API response parser produced a result shell without usable output URLs.
    const resultWithoutUrls: ProductImageStudioImageGeneratorResultPreview = {
      generationRequestId: "generation-1",
      id: "result-1",
      label: "AI 생성 이미지",
      ratio: "1:1",
    };

    // When: the modal filters generated output for display.
    const renderable = hasProductImageStudioAiToolRenderableGeneratedResult(resultWithoutUrls);

    // Then: missing result URLs are handled as absent output, not successful preview content.
    expect(renderable).toBe(false);
  });

  it("keeps the newer generated result when an older generation promise resolves later", async () => {
    // Given: two generation runs are in flight and the second run is the current one.
    const runGuard = createProductImageStudioAiToolGenerationRunGuard();
    const olderRun = runGuard.start();
    const olderGeneration = createDeferred<{ readonly id: string }>();
    const newerRun = runGuard.start();
    const newerGeneration = createDeferred<{ readonly id: string }>();
    let currentResult: { readonly id: string } | null = null;

    async function applyGenerationResult(
      run: typeof olderRun,
      promise: Promise<{ readonly id: string }>,
    ): Promise<void> {
      const result = await promise;
      if (runGuard.isCurrent(run)) {
        currentResult = result;
      }
    }

    const olderApplication = applyGenerationResult(olderRun, olderGeneration.promise);
    const newerApplication = applyGenerationResult(newerRun, newerGeneration.promise);

    // When: the newer run resolves first and the older run resolves after it.
    newerGeneration.resolve({ id: "newer-result" });
    await newerApplication;
    olderGeneration.resolve({ id: "older-result" });
    await olderApplication;

    // Then: the older stale result cannot overwrite the current generated result.
    expect(currentResult).toEqual({ id: "newer-result" });
  });

  it("revokes upload object URLs on replace, remove, and cleanup", () => {
    // Given: uploaded preview URLs are tracked by slot with injected create/revoke callbacks.
    const revokedUrls: string[] = [];
    const objectUrls = createProductImageStudioAiToolUploadObjectUrlRuntime({
      createObjectUrl: (file) => `blob:${file.name}`,
      revokeObjectUrl: (previewUrl) => {
        revokedUrls.push(previewUrl);
      },
    });

    // When: a slot is replaced, a current asset is removed, and the workspace cleans up.
    const firstFrontUrl = objectUrls.createForSlot("front", new File(["front-a"], "front-a.png", { type: "image/png" }));
    const secondFrontUrl = objectUrls.createForSlot("front", new File(["front-b"], "front-b.png", { type: "image/png" }));
    const backUrl = objectUrls.createForSlot("back", new File(["back"], "back.png", { type: "image/png" }));
    objectUrls.revokeForSlot("front");
    objectUrls.revokeAll();

    // Then: replaced, removed, and remaining cleanup URLs are each revoked once.
    expect(firstFrontUrl).toBe("blob:front-a.png");
    expect(secondFrontUrl).toBe("blob:front-b.png");
    expect(backUrl).toBe("blob:back.png");
    expect(revokedUrls).toEqual(["blob:front-a.png", "blob:front-b.png", "blob:back.png"]);
  });
});
