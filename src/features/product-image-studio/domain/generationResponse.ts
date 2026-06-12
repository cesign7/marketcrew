import { listOutputContracts } from "@/features/product-image-studio/domain/outputContracts";
import { getProductImageStudioGenerationBlockedMessage } from "@/features/product-image-studio/domain/generationMessages";
import {
  FOLDED_CARD_DISPLAY_POSES,
  POSTCARD_DISPLAY_POSES,
  PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES,
  PRODUCT_IMAGE_STUDIO_RATIO_PRESETS,
  type CardDisplayPose,
  type ProductImageStudioOutputType,
  type ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";
import type {
  ProductImageStudioGenerationResultPreview,
  ProductImageStudioGenerationState,
} from "@/features/product-image-studio/domain/generationWorkflow";

export function readProductImageStudioGenerationResponse(payload: unknown): ProductImageStudioGenerationState {
  if (!isRecord(payload) || !isRecord(payload["data"])) {
    return createFailedState(readGenerationErrorMessage(payload) ?? "생성 응답을 읽지 못했습니다.");
  }

  const generation = payload["data"]["generation"];
  if (!isRecord(generation)) {
    return createFailedState("생성 상태를 확인하지 못했습니다.");
  }

  const status = generation["status"];
  const generationId = typeof generation["id"] === "string" ? generation["id"] : "generation-unknown";
  if (status === "blocked") {
    return createBlockedState(parseBlockedReason(generation["reason"]));
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

function readGenerationErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const error = payload["error"];
  if (isRecord(error) && typeof error["message"] === "string" && error["message"].trim().length > 0) {
    return error["message"];
  }

  const message = payload["message"];
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  return null;
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

function createBlockedState(reason: ProductImageStudioGenerationState["blockedReason"]): ProductImageStudioGenerationState {
  return {
    blockedReason: reason,
    message: getProductImageStudioGenerationBlockedMessage(reason),
    phase: "blocked",
    results: [],
    selectedConceptId: null,
  };
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
