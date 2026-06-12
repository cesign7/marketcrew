import type {
  CardDisplayPose,
  ProductImageStudioOutputType,
  ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";
import {
  getProductImageStudioAvailableOutputs,
  getProductImageStudioPoseOptions,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import { getProductImageStudioGenerationBlockedMessage } from "@/features/product-image-studio/domain/generationMessages";
import type { ProductImageStudioProductionSettings } from "@/features/product-image-studio/domain/productionSettings";
export { readProductImageStudioGenerationResponse } from "@/features/product-image-studio/domain/generationResponse";

export type ProductImageStudioGenerationPhase = "idle" | "generating" | "blocked" | "ready" | "failed";

export type ProductImageStudioGenerationResultPreview = {
  readonly cardPose?: CardDisplayPose;
  readonly generationRequestId: string;
  readonly id: string;
  readonly label: string;
  readonly outputType: ProductImageStudioOutputType;
  readonly previewUrl?: string;
  readonly ratio: ProductImageStudioRatioPreset;
};

export type ProductImageStudioGenerationState = {
  readonly blockedReason?: "credential_missing" | "generation_disabled" | "provider_not_configured";
  readonly message: string;
  readonly phase: ProductImageStudioGenerationPhase;
  readonly results: readonly ProductImageStudioGenerationResultPreview[];
  readonly selectedConceptId: string | null;
};

export type ProductImageStudioGenerationPayload = {
  readonly conceptId: string;
  readonly outputs: readonly ProductImageStudioOutputType[];
  readonly productionSettings: ProductImageStudioProductionSettings;
  readonly qualityMode: ProductImageStudioWizardState["qualityMode"];
};

export function createInitialProductImageStudioGenerationState(): ProductImageStudioGenerationState {
  return {
    message: "콘셉트를 선택하면 초안 생성을 시작할 수 있습니다.",
    phase: "idle",
    results: [],
    selectedConceptId: null,
  };
}

export function selectProductImageStudioConcept(
  state: ProductImageStudioGenerationState,
  conceptId: string,
): ProductImageStudioGenerationState {
  return {
    ...state,
    message: "선택한 콘셉트로 초안을 생성할 수 있습니다.",
    selectedConceptId: conceptId,
  };
}

export function createGeneratingProductImageStudioGenerationState(
  state: ProductImageStudioGenerationState,
): ProductImageStudioGenerationState {
  return {
    ...state,
    message: "선택한 콘셉트로 상품 이미지를 준비하는 중입니다.",
    phase: "generating",
    results: state.results,
  };
}

export function createBlockedProductImageStudioGenerationState(
  state: ProductImageStudioGenerationState,
  reason: ProductImageStudioGenerationState["blockedReason"],
): ProductImageStudioGenerationState {
  return {
    ...state,
    blockedReason: reason,
    message: getProductImageStudioGenerationBlockedMessage(reason),
    phase: "blocked",
    results: [],
  };
}

export function mergeProductImageStudioGenerationResultState(
  previousState: ProductImageStudioGenerationState,
  nextState: ProductImageStudioGenerationState,
): ProductImageStudioGenerationState {
  if (nextState.phase !== "ready") {
    return { ...nextState, results: previousState.results };
  }

  const previousIds = new Set(previousState.results.map((result) => result.id));
  const newResults = nextState.results.filter((result) => !previousIds.has(result.id));
  return {
    ...nextState,
    results: [...previousState.results, ...newResults],
  };
}

export function buildProductImageStudioGenerationPayload(
  wizardState: ProductImageStudioWizardState,
  generationState: ProductImageStudioGenerationState,
): ProductImageStudioGenerationPayload | null {
  if (!generationState.selectedConceptId) {
    return null;
  }
  const outputs = getProductImageStudioAvailableOutputs(wizardState);
  if (outputs.length === 0) {
    return null;
  }

  return {
    conceptId: generationState.selectedConceptId,
    outputs,
    productionSettings: wizardState.productionSettings,
    qualityMode: wizardState.qualityMode,
  };
}

export function describeProductImageStudioGenerationPoseSummary(
  wizardState: ProductImageStudioWizardState,
): string {
  const formatLabel = wizardState.cardFormat === "folded_card" ? "접이식 카드" : "엽서형 카드";
  const poseLabels = getProductImageStudioPoseOptions(wizardState.cardFormat)
    .filter((option) => wizardState.selectedCardPoses.some((pose) => pose === option.pose))
    .map((option) => option.label);

  return `${formatLabel}: ${poseLabels.join(", ")}`;
}
