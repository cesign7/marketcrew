import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductImageStudioWizard } from "@/components/product-image-studio/ProductImageStudioWizard";
import { readProductImageStudioConceptCards } from "@/features/product-image-studio/client/projectWizardApi";
import {
  canRequestProductImageStudioConcepts,
  buildProductImageStudioCreateProjectPayload,
  changeProductImageStudioCardFormat,
  createInitialProductImageStudioWizardState,
  getProductImageStudioOutputChoices,
  getProductImageStudioPoseOptions,
  getProductImageStudioUploadSlots,
  recordProductImageStudioUploadedRole,
} from "@/features/product-image-studio/domain/projectWizard";

describe("product image studio project wizard UI", () => {
  it("renders the usable Korean wizard controls on the first studio screen", () => {
    const html = renderToStaticMarkup(createElement(ProductImageStudioWizard));

    expect(html).toContain("프로젝트 이름");
    expect(html).toContain("접이식 카드");
    expect(html).toContain("엽서형 카드");
    expect(html).toContain("카드 자세");
    expect(html).toContain("디자인 업로드");
    expect(html).toContain("상품 사양");
    expect(html).toContain("목업 합성 우선");
    expect(html).toContain("자동 검수 기준");
    expect(html).toContain("콘셉트 추천");
    expect(html).toMatch(/<button[^>]*disabled/);
    expect(html).not.toContain("네이버 검색광고");
    expect(html).not.toContain("광고유형");
  });

  it("lists folded-card upload slots and keeps concept recommendation disabled before required uploads", () => {
    const state = {
      ...createInitialProductImageStudioWizardState(),
      projectName: "봄 초대장 세트",
    };

    const requiredLabels = getProductImageStudioUploadSlots(state)
      .filter((slot) => slot.required)
      .map((slot) => slot.label);

    expect(requiredLabels).toEqual(["접이식 카드 앞면", "접는 위치 참고", "봉투 앞면", "봉합스티커"]);
    expect(canRequestProductImageStudioConcepts(state)).toBe(false);

    const uploadedState = getProductImageStudioUploadSlots(state)
      .filter((slot) => slot.required)
      .reduce(
        (currentState, slot) => recordProductImageStudioUploadedRole(currentState, slot.role),
        state,
      );

    expect(canRequestProductImageStudioConcepts(uploadedState)).toBe(true);
  });

  it("switches postcard projects to postcard slots and pose choices", () => {
    const foldedState = recordProductImageStudioUploadedRole(
      createInitialProductImageStudioWizardState(),
      "folded_card_outer_front",
    );

    const postcardState = changeProductImageStudioCardFormat(foldedState, "postcard_flat");
    const requiredLabels = getProductImageStudioUploadSlots(postcardState)
      .filter((slot) => slot.required)
      .map((slot) => slot.label);
    const poseLabels = getProductImageStudioPoseOptions(postcardState.cardFormat).map((pose) => pose.label);

    expect(requiredLabels).toEqual(["엽서 앞면", "봉투 앞면", "봉합스티커"]);
    expect(poseLabels).toEqual(["엽서 앞면 평면컷", "엽서 뒷면 평면컷", "엽서 생활형 겹침컷"]);
    expect(postcardState.uploadedRoles).not.toContain("folded_card_outer_front");
  });

  it("offers all four default output choices for the card set", () => {
    const outputLabels = getProductImageStudioOutputChoices().map((choice) => choice.label);

    expect(outputLabels).toEqual(["세트컷", "카드 단독컷", "봉투 단독컷", "봉합스티커 단독컷"]);
  });

  it("builds the project API payload with the required name field", () => {
    const state = {
      ...createInitialProductImageStudioWizardState(),
      projectName: "봄 초대장 세트",
    };

    const payload = buildProductImageStudioCreateProjectPayload(state);

    expect(payload.name).toBe("봄 초대장 세트");
    expect(payload.productType).toBe("card_envelope_seal_set");
    expect(payload.cardFormat).toBe("folded_card");
    expect(payload.productionSettings.card.format).toBe("folded_card");
    if (payload.productionSettings.card.format !== "folded_card") {
      throw new Error("folded card payload expected");
    }
    expect(payload.productionSettings.card.foldedSizeMm).toEqual({ height: 150, width: 100 });
    expect(payload.productionSettings.envelope.sizeMm).toEqual({ height: 160, width: 110 });
    expect(payload.productionSettings.scene.generationMethod).toBe("mockup_composite_first");
    expect(Object.prototype.hasOwnProperty.call(payload, "projectName")).toBe(false);
  });

  it("reads concept cards from the local API response envelope", () => {
    const concepts = readProductImageStudioConceptCards({
      data: {
        concepts: [
          {
            id: "minimal-studio",
            label: "미니멀 스튜디오",
            styleTags: ["목업", "대표이미지"],
            summary: "디자인과 인쇄물 형태를 또렷하게 보여줍니다.",
          },
        ],
      },
      ok: true,
    });

    expect(concepts).toEqual([
      {
        id: "minimal-studio",
        label: "미니멀 스튜디오",
        styleTags: ["목업", "대표이미지"],
        summary: "디자인과 인쇄물 형태를 또렷하게 보여줍니다.",
      },
    ]);
  });
});
