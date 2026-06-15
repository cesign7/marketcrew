import {
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_RATIOS,
  type ProductImageStudioImageGeneratorCount,
  type ProductImageStudioImageGeneratorModelLabel,
  type ProductImageStudioImageGeneratorRatio,
  type ProductImageStudioImageGeneratorResolution,
} from "@/features/product-image-studio/domain/imageGenerator";
import { getProductImageStudioGenerationBlockedMessage } from "@/features/product-image-studio/domain/generationMessages";
import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";

type ProductImageStudioImageGeneratorProviderName = "fake" | ProductImageStudioProviderName;

export type ProductImageStudioImageGeneratorGenerationInput = {
  readonly count: ProductImageStudioImageGeneratorCount;
  readonly modelLabel: ProductImageStudioImageGeneratorModelLabel;
  readonly prompt: string;
  readonly ratio: ProductImageStudioImageGeneratorRatio;
  readonly referenceImages: readonly File[];
  readonly resolution: ProductImageStudioImageGeneratorResolution;
};

export type ProductImageStudioImageGeneratorResultPreview = {
  readonly downloadUrl?: string;
  readonly generationRequestId: string;
  readonly id: string;
  readonly label: string;
  readonly previewUrl?: string;
  readonly ratio: ProductImageStudioImageGeneratorRatio;
};

export type ProductImageStudioImageGeneratorGenerationSummary = {
  readonly completedCount: number | null;
  readonly id: string | null;
  readonly projectId: string | null;
  readonly provider: ProductImageStudioImageGeneratorProviderName | null;
  readonly requestedCount: number | null;
  readonly status: "partial" | "ready";
};

export type ProductImageStudioImageGeneratorGenerationClientResult =
  | {
      readonly generation: ProductImageStudioImageGeneratorGenerationSummary;
      readonly message: string;
      readonly ok: true;
      readonly results: readonly ProductImageStudioImageGeneratorResultPreview[];
    }
  | {
      readonly kind: "blocked" | "failed";
      readonly message: string;
      readonly ok: false;
    };

export async function startProductImageStudioImageGeneratorGeneration(
  input: ProductImageStudioImageGeneratorGenerationInput,
): Promise<ProductImageStudioImageGeneratorGenerationClientResult> {
  const response = await fetch("/api/product-image-studio/image-generator/generations", {
    body: buildProductImageStudioImageGeneratorRequestFormData(input),
    method: "POST",
    signal: AbortSignal.timeout(130_000),
  });
  const payload = await readJsonPayload(response);
  return readProductImageStudioImageGeneratorGenerationResponse(payload, response.status);
}

export function buildProductImageStudioImageGeneratorRequestFormData(
  input: ProductImageStudioImageGeneratorGenerationInput,
): FormData {
  const formData = new FormData();
  formData.append(
    "payload",
    JSON.stringify({
      count: input.count,
      modelLabel: input.modelLabel,
      prompt: input.prompt,
      ratio: input.ratio,
      resolution: input.resolution,
    }),
  );
  for (const referenceImage of input.referenceImages) {
    formData.append("referenceImages", referenceImage);
  }
  return formData;
}

export function readProductImageStudioImageGeneratorGenerationResponse(
  payload: unknown,
  httpStatus = 200,
): ProductImageStudioImageGeneratorGenerationClientResult {
  if (!isRecord(payload)) {
    return {
      kind: "failed",
      message: httpStatus === 404 ? "이미지 생성 API가 아직 준비되지 않았습니다." : "생성 응답을 읽지 못했습니다.",
      ok: false,
    };
  }

  if (payload["ok"] !== true) {
    return { kind: "failed", message: toSafeErrorMessage(readErrorCode(payload), httpStatus), ok: false };
  }

  const data = payload["data"];
  if (!isRecord(data) || !isRecord(data["generation"])) {
    return { kind: "failed", message: "생성 상태를 확인하지 못했습니다.", ok: false };
  }

  const generation = data["generation"];
  if (generation["status"] === "blocked") {
    return {
      kind: "blocked",
      message: getProductImageStudioGenerationBlockedMessage(readBlockedReason(generation["reason"])),
      ok: false,
    };
  }

  if (generation["status"] !== "ready" && generation["status"] !== "partial") {
    return { kind: "failed", message: "생성 상태를 확인하지 못했습니다.", ok: false };
  }

  const summary = readGenerationSummary(generation);
  return {
    generation: summary,
    message: summary.status === "partial" ? "일부 이미지만 준비되었습니다." : "생성 이미지가 준비되었습니다.",
    ok: true,
    results: readResults(data["results"], summary.projectId),
  };
}

async function readJsonPayload(response: Response): Promise<unknown | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return null;
    }
    throw error;
  }
}

function readGenerationSummary(
  generation: Readonly<Record<string, unknown>>,
): ProductImageStudioImageGeneratorGenerationSummary {
  return {
    completedCount: readInteger(generation["completedCount"]),
    id: readString(generation["id"]),
    projectId: readString(generation["projectId"]),
    provider: readProviderName(generation["provider"]),
    requestedCount: readInteger(generation["requestedCount"]),
    status: generation["status"] === "partial" ? "partial" : "ready",
  };
}

function readResults(
  value: unknown,
  projectId: string | null,
): readonly ProductImageStudioImageGeneratorResultPreview[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    const id = readString(item["id"]);
    if (!id) {
      return [];
    }
    const generationRequestId = readString(item["generationRequestId"]) ?? "image-generator";
    const downloadUrl = readSafeApiPath(item["downloadUrl"]) ?? toDownloadUrl(projectId, id);
    return [
      {
        downloadUrl,
        generationRequestId,
        id,
        label: "AI 생성 이미지",
        previewUrl: readSafeApiPath(item["previewUrl"]),
        ratio: readRatio(item["ratio"]),
      },
    ];
  });
}

function toDownloadUrl(projectId: string | null, resultId: string): string | undefined {
  if (!projectId) {
    return undefined;
  }
  return `/api/product-image-studio/projects/${encodeURIComponent(projectId)}/results/${encodeURIComponent(resultId)}/download`;
}

function readErrorCode(payload: Readonly<Record<string, unknown>>): string | null {
  const error = payload["error"];
  if (!isRecord(error)) {
    return null;
  }
  return readString(error["code"]);
}

function toSafeErrorMessage(code: string | null, httpStatus: number): string {
  if (code === "IMAGE_PROVIDER_FAILED") {
    return "이미지 생성 서비스가 응답하지 않았습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (httpStatus === 400) {
    return "입력값을 다시 확인해 주세요.";
  }
  if (httpStatus === 423) {
    return "이미지 생성 차단됨: 생성 상태를 확인해 주세요.";
  }
  return "이미지를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function readBlockedReason(
  value: unknown,
): "credential_missing" | "generation_disabled" | "provider_not_configured" | undefined {
  if (value === "credential_missing" || value === "generation_disabled" || value === "provider_not_configured") {
    return value;
  }
  return undefined;
}

function readRatio(value: unknown): ProductImageStudioImageGeneratorRatio {
  for (const ratio of PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_RATIOS) {
    if (ratio === value) {
      return ratio;
    }
  }
  return "1:1";
}

function readProviderName(value: unknown): ProductImageStudioImageGeneratorProviderName | null {
  if (value === "fake" || value === "gemini" || value === "openai") {
    return value;
  }
  return null;
}

function readSafeApiPath(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("/api/product-image-studio/") ? value : undefined;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
