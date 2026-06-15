import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductImageStudioUploadSection } from "@/components/product-image-studio/ProductImageStudioUploadSection";
import { ProductImageStudioAiMaterialSelectionPanel } from "@/components/product-image-studio/ProductImageStudioAiMaterialSelectionPanel";
import { ProductImageStudioWizard } from "@/components/product-image-studio/ProductImageStudioWizard";
import { readProductImageStudioConceptCards } from "@/features/product-image-studio/client/projectWizardApi";
import {
  createProductImageStudioMaterialRecord,
  type ProductImageStudioMaterialRecord,
  type ProductImageStudioMaterialTarget,
} from "@/features/product-image-studio/domain/materialLibrary";
import { getProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import {
  canRequestProductImageStudioConcepts,
  buildProductImageStudioCreateProjectPayload,
  changeProductImageStudioCardFormat,
  createInitialProductImageStudioWizardState,
  getProductImageStudioAvailableOutputs,
  getProductImageStudioOutputChoices,
  getProductImageStudioPoseOptions,
  getProductImageStudioUploadSlots,
  recordProductImageStudioUploadedRole,
} from "@/features/product-image-studio/domain/projectWizard";
import { manualCardOnlyProductionSettings } from "./manualProductionSettings";

describe("product image studio project wizard UI", () => {
  it("renders the usable Korean wizard controls on the first studio screen", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioWizard, {
        initialProviderSettings: null,
        providerStatus: getProductImageStudioProviderStatus({}),
      }),
    );

    expect(html).toContain("프로젝트 이름");
    expect(html).toContain("상품컷 작업대");
    expect(html).toContain("빠르게 만들 이미지");
    expect(html).toContain("상품 캔버스");
    expect(html).toContain("업로드");
    expect(html).toContain("규격");
    expect(html).toContain("배경");
    expect(html).toContain("0.5K 초안");
    expect(html).toContain("카드만으로 시작");
    expect(html).toContain("세트컷으로 확장");
    expect(html).toContain("목록용 상품컷");
    expect(html).toContain("카드 슬롯");
    expect(html).toContain("봉투 슬롯");
    expect(html).toContain("봉합스티커 슬롯");
    expect(html).toContain("접이식 카드");
    expect(html).toContain("엽서형 카드");
    expect(html).toContain("설정샷 자세 조정");
    expect(html).toContain("디자인 업로드");
    expect(html).toContain("접이식 카드 디자인");
    expect(html).toContain("봉투와 봉합스티커");
    expect(html).toContain("상품 사양");
    expect(html).toContain("저장한 규격");
    expect(html).toContain("저장된 규격 선택");
    expect(html).toContain("상품 규격 관리");
    expect(html).toContain("규격 편집");
    expect(html).toContain("불러오기");
    expect(html).toContain("접은 카드 가로(mm)");
    expect(html).toContain("펼친 카드 가로(mm)");
    expect(html).toContain("봉투 가로(mm)");
    expect(html).toContain("스티커 지름(mm)");
    expect(html).toContain("목업 합성 우선");
    expect(html).toContain("자동 검수 기준");
    expect(html).toContain("콘셉트 추천");
    expect(html).toContain("추천 콘셉트");
    expect(html).toContain("생성 명령");
    expect(html).toContain("용지·재질 선택");
    expect(html).toContain("상품 규격 관리에서 용지·재질을 먼저 저장해 주세요.");
    expect(html).toContain("용지·재질 관리로 이동");
    expect(html).toContain("빠른 초안");
    expect(html).toContain("고품질");
    expect(html).toMatch(/<button[^>]*disabled/);
    expect(html).not.toContain("접이식 100x150");
    expect(html).not.toContain("네이버 검색광고");
    expect(html).not.toContain("광고유형");
  });

  it("groups saved materials into AI-ready material choices", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioAiMaterialSelectionPanel, {
        initialMaterials: [
          createMaterial("material-card", "랑데뷰 내추럴 240g", ["folded_card", "postcard"]),
          createMaterial("material-envelope", "미색 봉투지 120g", ["envelope"]),
          createMaterial("material-sticker", "무광 스티커지", ["sticker"]),
          createMaterial("material-business-card", "명함 매트 코팅지", ["business_card"]),
        ],
      }),
    );

    expect(html).toContain("용지·재질 선택");
    expect(html).toContain("카드·엽서");
    expect(html).toContain("봉투");
    expect(html).toContain("스티커");
    expect(html).toContain("명함");
    expect(html).toContain("랑데뷰 내추럴 240g");
    expect(html).toContain("미색 봉투지 120g");
    expect(html).toContain("무광 스티커지");
    expect(html).toContain("명함 매트 코팅지");
    expect(html).toContain("카드·엽서 재질 고정");
    expect(html).toContain("봉투 재질 변경");
  });

  it("separates postcard upload slots from folded-card upload copy", () => {
    const postcardState = changeProductImageStudioCardFormat(createInitialProductImageStudioWizardState(), "postcard_flat");

    const html = renderToStaticMarkup(
      createElement(ProductImageStudioUploadSection, {
        busyRole: null,
        onUpload: () => undefined,
        state: postcardState,
      }),
    );

    expect(html).toContain("엽서형 카드 디자인");
    expect(html).toContain("엽서 앞면");
    expect(html).toContain("봉투와 봉합스티커");
    expect(html).not.toContain("접이식 카드 디자인");
  });

  it("enables card-only recommendation after card specs and the card image are ready", () => {
    const state = {
      ...createInitialProductImageStudioWizardState(),
      projectName: "봄 초대장 세트",
      productionSettings: manualCardOnlyProductionSettings(),
    };

    const requiredLabels = getProductImageStudioUploadSlots(state)
      .filter((slot) => slot.required)
      .map((slot) => slot.label);

    expect(requiredLabels).toEqual(["접이식 카드 앞면"]);
    expect(canRequestProductImageStudioConcepts(state)).toBe(false);

    const uploadedState = recordProductImageStudioUploadedRole(state, "folded_card_outer_front");

    expect(canRequestProductImageStudioConcepts(uploadedState)).toBe(true);
    expect(getProductImageStudioAvailableOutputs(uploadedState)).toEqual(["card_single"]);
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

    expect(requiredLabels).toEqual(["엽서 앞면"]);
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
    expect(payload.productionSettings.card.foldedSizeMm).toEqual({ height: 0, width: 0 });
    expect(payload.productionSettings.envelope.sizeMm).toEqual({ height: 0, width: 0 });
    expect(payload.productionSettings.specSource).toBe("manual_input");
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

function createMaterial(
  id: string,
  name: string,
  compatibleTargets: readonly ProductImageStudioMaterialTarget[],
): ProductImageStudioMaterialRecord {
  const material = createProductImageStudioMaterialRecord({
    colorHex: "#F7F1E3",
    colorName: "내추럴 화이트",
    compatibleTargets,
    createdAt: "2026-06-15T00:00:00.000Z",
    id,
    name,
    surface: "매트",
    thickness: { unit: "gsm", value: 240 },
  });
  if (!material) {
    throw new Error("Expected valid material fixture");
  }
  return material;
}
