import type { ProductImageStudioGenerationResultPreview } from "@/features/product-image-studio/domain/generationWorkflow";
import { getProductImageStudioPoseOptions, type ProductImageStudioWizardState } from "@/features/product-image-studio/domain/projectWizard";
import { assertNever, type ProductImageStudioOutputType } from "@/features/product-image-studio/domain/types";

export type ProductImageStudioGalleryResult = ProductImageStudioGenerationResultPreview;
export type ProductImageStudioResultGroupKey = "set" | "card" | "envelope" | "seal";

export type ProductImageStudioResultGalleryItem = {
  readonly detailLabel: string;
  readonly result: ProductImageStudioGalleryResult;
  readonly versionLabel: string;
};

export type ProductImageStudioResultGalleryGroup = {
  readonly emptyMessage: string;
  readonly emphasis: "combined" | "separate";
  readonly items: readonly ProductImageStudioResultGalleryItem[];
  readonly key: ProductImageStudioResultGroupKey;
  readonly label: string;
  readonly summary: string;
};

const RESULT_GROUPS = [
  {
    emphasis: "combined",
    key: "set",
    label: "세트컷",
    summary: "카드, 봉투, 봉합스티커를 한 장면에 함께 배치한 이미지입니다.",
  },
  {
    emphasis: "separate",
    key: "card",
    label: "카드",
    summary: "카드 형식과 자세를 확인하는 단독 이미지입니다.",
  },
  {
    emphasis: "separate",
    key: "envelope",
    label: "봉투",
    summary: "봉투 디자인과 질감을 확인하는 단독 이미지입니다.",
  },
  {
    emphasis: "separate",
    key: "seal",
    label: "봉합스티커",
    summary: "봉합스티커가 상품 사진에서 보이는 방식을 확인합니다.",
  },
] as const satisfies readonly Omit<ProductImageStudioResultGalleryGroup, "emptyMessage" | "items">[];

export function groupProductImageStudioResultsForGallery(
  results: readonly ProductImageStudioGalleryResult[],
  wizardState: ProductImageStudioWizardState,
): readonly ProductImageStudioResultGalleryGroup[] {
  const versionLabels = buildVersionLabels(results);
  return RESULT_GROUPS.map((group) => {
    const items = results
      .filter((result) => getResultGroupKey(result.outputType) === group.key)
      .map((result) => ({
        detailLabel: describeResultDetail(result, wizardState),
        result,
        versionLabel: versionLabels.get(result.generationRequestId) ?? "원본안",
      }));

    return {
      ...group,
      emptyMessage: `아직 ${group.label} 결과가 없습니다.`,
      items,
    };
  });
}

function buildVersionLabels(results: readonly ProductImageStudioGalleryResult[]): ReadonlyMap<string, string> {
  const generationIds: string[] = [];
  for (const result of results) {
    if (!generationIds.includes(result.generationRequestId)) {
      generationIds.push(result.generationRequestId);
    }
  }

  return new Map(generationIds.map((generationId, index) => [generationId, index === 0 ? "원본안" : `비교안 ${index + 1}`]));
}

function describeResultDetail(result: ProductImageStudioGalleryResult, wizardState: ProductImageStudioWizardState): string {
  if (getResultGroupKey(result.outputType) !== "card") {
    return result.ratio;
  }

  const cardFormatLabel = wizardState.cardFormat === "folded_card" ? "접이식 카드" : "엽서형 카드";
  const poseLabel =
    getProductImageStudioPoseOptions(wizardState.cardFormat).find((poseOption) => poseOption.pose === result.cardPose)?.label ??
    "자세 미지정";
  return `${cardFormatLabel} - ${poseLabel}`;
}

function getResultGroupKey(outputType: ProductImageStudioOutputType): ProductImageStudioResultGroupKey {
  switch (outputType) {
    case "set_combined":
      return "set";
    case "card_single":
      return "card";
    case "envelope_single":
      return "envelope";
    case "seal_sticker_single":
      return "seal";
    default:
      return assertNever(outputType);
  }
}
