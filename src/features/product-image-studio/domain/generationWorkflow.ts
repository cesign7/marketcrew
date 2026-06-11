import { listOutputContracts } from "@/features/product-image-studio/domain/outputContracts";
import {
  FOLDED_CARD_DISPLAY_POSES,
  POSTCARD_DISPLAY_POSES,
  PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES,
  PRODUCT_IMAGE_STUDIO_RATIO_PRESETS,
  type CardDisplayPose,
  type ProductImageStudioOutputType,
  type ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";
import {
  getProductImageStudioAvailableOutputs,
  getProductImageStudioPoseOptions,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import type { ProductImageStudioProductionSettings } from "@/features/product-image-studio/domain/productionSettings";

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
    message: getBlockedMessage(reason),
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

export function readProductImageStudioGenerationResponse(payload: unknown): ProductImageStudioGenerationState {
  if (!isRecord(payload) || !isRecord(payload["data"])) {
    return createFailedState("생성 응답을 읽지 못했습니다.");
  }

  const generation = payload["data"]["generation"];
  if (!isRecord(generation)) {
    return createFailedState("생성 상태를 확인하지 못했습니다.");
  }

  const status = generation["status"];
  const generationId = typeof generation["id"] === "string" ? generation["id"] : "generation-unknown";
  if (status === "blocked") {
    return createBlockedProductImageStudioGenerationState(
      createInitialProductImageStudioGenerationState(),
      parseBlockedReason(generation["reason"]),
    );
  }

  if (status === "ready") {
    return {
      message: "초안 이미지가 준비되었습니다.",
      phase: "ready",
      results: readResultPreviews(payload["data"]["results"], generationId),
      selectedConceptId: null,
    };
  }

  if (typeof status === "string") {
    return {
      message: "생성 요청을 보냈습니다. 결과가 준비되면 이어서 확인합니다.",
      phase: "generating",
      results: [],
      selectedConceptId: null,
    };
  }

  return createFailedState("생성 상태를 확인하지 못했습니다.");
}

function readResultPreviews(value: unknown, fallbackGenerationId: string): readonly ProductImageStudioGenerationResultPreview[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    const id = item["id"];
    const generationRequestId = item["generationRequestId"];
    const outputType = parseOutputType(item["outputType"]);
    if (typeof id !== "string" || !outputType) {
      return [];
    }
    return [
      {
        cardPose: parseCardPose(item["cardPose"]),
        generationRequestId: typeof generationRequestId === "string" ? generationRequestId : fallbackGenerationId,
        id,
        label: getOutputLabel(outputType),
        outputType,
        previewUrl: parsePreviewUrl(item["previewUrl"]),
        ratio: parseRatio(item["ratio"]),
      },
    ];
  });
}

function parsePreviewUrl(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("/api/product-image-studio/") ? value : undefined;
}

function getOutputLabel(outputType: ProductImageStudioOutputType): string {
  return listOutputContracts().find((contract) => contract.outputType === outputType)?.label ?? outputType;
}

function getBlockedMessage(reason: ProductImageStudioGenerationState["blockedReason"]): string {
  switch (reason) {
    case "credential_missing":
      return "이미지 생성 차단됨: provider 키가 설정되지 않았습니다.";
    case "generation_disabled":
      return "이미지 생성 차단됨: 생성 게이트가 닫혀 있습니다.";
    case "provider_not_configured":
      return "이미지 생성 차단됨: 이미지 provider가 설정되지 않았습니다.";
    case undefined:
      return "이미지 생성 차단됨: 생성 상태를 확인해 주세요.";
  }
}

function createFailedState(message: string): ProductImageStudioGenerationState {
  return {
    message,
    phase: "failed",
    results: [],
    selectedConceptId: null,
  };
}

function parseBlockedReason(value: unknown): ProductImageStudioGenerationState["blockedReason"] {
  if (value === "credential_missing" || value === "generation_disabled" || value === "provider_not_configured") {
    return value;
  }
  return undefined;
}

function parseOutputType(value: unknown): ProductImageStudioOutputType | null {
  if (typeof value !== "string") {
    return null;
  }
  return PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES.find((outputType) => outputType === value) ?? null;
}

function parseCardPose(value: unknown): CardDisplayPose | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  for (const pose of FOLDED_CARD_DISPLAY_POSES) {
    if (pose === value) {
      return pose;
    }
  }

  for (const pose of POSTCARD_DISPLAY_POSES) {
    if (pose === value) {
      return pose;
    }
  }

  return undefined;
}

function parseRatio(value: unknown): ProductImageStudioRatioPreset {
  if (typeof value !== "string") {
    return "1:1";
  }

  return PRODUCT_IMAGE_STUDIO_RATIO_PRESETS.find((ratio) => ratio === value) ?? "1:1";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
