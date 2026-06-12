import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductImageStudioGenerationPanel } from "@/components/product-image-studio/ProductImageStudioGenerationPanel";
import { listCardSetConceptRecommendations } from "@/features/product-image-studio/domain/concepts";
import { PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES } from "@/features/product-image-studio/domain/types";
import {
  buildProductImageStudioGenerationPayload,
  createBlockedProductImageStudioGenerationState,
  createInitialProductImageStudioGenerationState,
  describeProductImageStudioGenerationPoseSummary,
  readProductImageStudioGenerationResponse,
  selectProductImageStudioConcept,
  selectProductImageStudioGenerationProvider,
} from "@/features/product-image-studio/domain/generationWorkflow";
import {
  createInitialProductImageStudioWizardState,
  recordProductImageStudioUploadedRole,
  setProductImageStudioQualityMode,
  setProductImageStudioProjectName,
} from "@/features/product-image-studio/domain/projectWizard";
import { manualCardOnlyProductionSettings } from "./manualProductionSettings";

describe("product image studio generation UI", () => {
  it("keeps only available outputs in the selected concept generation payload", () => {
    const wizardState = setProductImageStudioQualityMode(
      recordProductImageStudioUploadedRole(
        {
          ...setProductImageStudioProjectName(createInitialProductImageStudioWizardState(), "봄 초대장 세트"),
          productionSettings: manualCardOnlyProductionSettings(),
        },
        "folded_card_outer_front",
      ),
      "high",
    );
    const generationState = selectProductImageStudioConcept(
      createInitialProductImageStudioGenerationState(),
      "minimal-studio",
    );

    const payload = buildProductImageStudioGenerationPayload(wizardState, generationState);

    expect(payload).toEqual({
      conceptId: "minimal-studio",
      outputs: ["card_single"],
      productionSettings: manualCardOnlyProductionSettings(),
      provider: "openai",
      qualityMode: "high",
    });
  });

  it("includes selected provider in generation payload", () => {
    const wizardState = recordProductImageStudioUploadedRole(
      {
        ...setProductImageStudioProjectName(createInitialProductImageStudioWizardState(), "봄 초대장 세트"),
        productionSettings: manualCardOnlyProductionSettings(),
      },
      "folded_card_outer_front",
    );
    const generationState = selectProductImageStudioConcept(
      createInitialProductImageStudioGenerationState(),
      "minimal-studio",
    );
    const selectedProviderState = selectProductImageStudioGenerationProvider(generationState, "gemini");

    const payload = buildProductImageStudioGenerationPayload(wizardState, selectedProviderState);

    expect(payload).toEqual(expect.objectContaining({ provider: "gemini" }));
  });

  it("summarizes folded-card and postcard poses in Korean", () => {
    const foldedSummary = describeProductImageStudioGenerationPoseSummary(createInitialProductImageStudioWizardState());
    const postcardSummary = describeProductImageStudioGenerationPoseSummary({
      ...createInitialProductImageStudioWizardState(),
      cardFormat: "postcard_flat",
      selectedCardPoses: ["postcard_front_flat"],
    });

    expect(foldedSummary).toBe("접이식 카드: 접은 카드 닫힌 컷, 접이식 카드 펼친 컷");
    expect(postcardSummary).toBe("엽서형 카드: 엽서 앞면 평면컷");
  });

  it("renders selected concept, blocked provider message, retry, and similar-version actions", () => {
    const concepts = listCardSetConceptRecommendations();
    const wizardState = createInitialProductImageStudioWizardState();
    const generationState = createBlockedProductImageStudioGenerationState(
      selectProductImageStudioConcept(createInitialProductImageStudioGenerationState(), "minimal-studio"),
      "generation_disabled",
    );

    const html = renderToStaticMarkup(
      createElement(ProductImageStudioGenerationPanel, {
        concepts,
        generationState,
        onGenerate: () => undefined,
        onRegeneratedResult: () => undefined,
        onRetry: () => undefined,
        onSelectConcept: () => undefined,
        onSelectProvider: () => undefined,
        onSimilarVersion: () => undefined,
        providerOptions: [
          {
            connected: true,
            disabled: false,
            helper: "생성 게이트가 닫혀 있어 실제 호출은 차단됩니다.",
            label: "OpenAI",
            provider: "openai",
          },
          {
            connected: false,
            disabled: true,
            helper: "Gemini API 키가 연결되지 않았습니다.",
            label: "Gemini",
            provider: "gemini",
          },
        ],
        providerStatus: "blocked",
        projectId: null,
        wizardState,
      }),
    );

    expect(html).toContain("미니멀 스튜디오");
    expect(html).toContain("선택됨");
    expect(html).toContain("이미지 생성 차단됨");
    expect(html).toContain("이번 생성 provider");
    expect(html).toContain("OpenAI 연결됨");
    expect(html).toContain("Gemini 연결 안됨");
    expect(html).toContain("초안 생성 · OpenAI");
    expect(html).toContain("다시 시도");
    expect(html).toContain("비슷한 버전 생성");
    expect(html).toContain("접이식 카드: 접은 카드 닫힌 컷, 접이식 카드 펼친 컷");
  });

  it("reads fake-provider generation results with Korean output labels", () => {
    const state = readProductImageStudioGenerationResponse({
      data: {
        generation: { id: "generation-1", status: "ready" },
        results: PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES.map((outputType) => ({
          id: `result-${outputType}`,
          outputType,
        })),
      },
      ok: true,
    });

    expect(state.phase).toBe("ready");
    expect(state.results.map((result) => result.label)).toEqual([
      "세트컷",
      "카드 단독컷",
      "봉투 단독컷",
      "봉합스티커 단독컷",
    ]);
  });

  it("shows the backend generation error message when generation fails before results", () => {
    const state = readProductImageStudioGenerationResponse({
      error: {
        code: "UNAUTHORIZED",
        message: "Railway 백엔드 API 인증을 확인해 주세요.",
      },
      ok: false,
    });

    expect(state.phase).toBe("failed");
    expect(state.message).toBe("Railway 백엔드 API 인증을 확인해 주세요.");
  });
});
