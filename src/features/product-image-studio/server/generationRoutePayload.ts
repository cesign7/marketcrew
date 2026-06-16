import {
  PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES,
  PRODUCT_IMAGE_STUDIO_PROVIDERS,
  PRODUCT_IMAGE_STUDIO_QUALITY_MODES,
  type CardFormat,
  type ProductImageStudioAssetRole,
  type ProductImageStudioOutputType,
  type ProductImageStudioProviderName,
  type ProductImageStudioQualityMode,
} from "@/features/product-image-studio/domain/types";
import {
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_COUNTS,
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_CONTRACTS,
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_LABELS,
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_RATIOS,
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_RESOLUTIONS,
  getProductImageStudioImageGeneratorModelLabelForProvider,
  type ProductImageStudioImageGeneratorCount,
  type ProductImageStudioImageGeneratorModelLabel,
  type ProductImageStudioImageGeneratorRatio,
  type ProductImageStudioImageGeneratorResolution,
} from "@/features/product-image-studio/domain/imageGenerator";
import {
  getProductImageStudioProductionSettingsIssueForOutput,
  parseProductImageStudioProductionSettings,
  type ProductImageStudioProductionSettings,
} from "@/features/product-image-studio/domain/productionSettings";

export type ParsedProductImageStudioGenerationPayload = {
  readonly conceptId: string;
  readonly count: ProductImageStudioImageGeneratorCount;
  readonly modelLabel?: ProductImageStudioImageGeneratorModelLabel;
  readonly outputs: readonly ProductImageStudioOutputType[];
  readonly productionSettings: ProductImageStudioProductionSettings;
  readonly provider?: ProductImageStudioProviderName;
  readonly qualityMode: ProductImageStudioQualityMode;
  readonly ratio?: ProductImageStudioImageGeneratorRatio;
  readonly resolution?: ProductImageStudioImageGeneratorResolution;
};

export function parseProductImageStudioGenerationPayload(
  payload: unknown,
  cardFormat: CardFormat,
):
  | {
      readonly ok: true;
      readonly payload: ParsedProductImageStudioGenerationPayload;
    }
  | {
      readonly error: { readonly code: string; readonly message: string };
      readonly ok: false;
    } {
  if (!isRecord(payload)) {
    return invalidPayload("INVALID_JSON", "생성 요청 형식이 올바르지 않습니다.");
  }

  const conceptId = payload["conceptId"];
  const outputs = parseOutputs(payload["outputs"]);
  const productionSettings = parseProductImageStudioProductionSettings(payload["productionSettings"], cardFormat);
  const provider = parseOptionalProvider(payload["provider"]);
  const count = parseOptionalCount(payload["count"]);
  const modelLabel = parseOptionalModelLabel(payload["modelLabel"], provider || undefined);
  const ratio = parseOptionalRatio(payload["ratio"]);
  const resolution = parseOptionalResolution(payload["resolution"]);
  const qualityMode = parseQualityMode(payload["qualityMode"]);
  if (typeof conceptId !== "string" || conceptId.length === 0) {
    return invalidPayload("CONCEPT_REQUIRED", "생성할 콘셉트를 선택해 주세요.");
  }
  if (outputs.length === 0) {
    return invalidPayload("OUTPUTS_REQUIRED", "생성할 이미지 종류를 선택해 주세요.");
  }
  if (!productionSettings.ok) {
    return productionSettings;
  }
  if (provider === false) {
    return invalidPayload("PROVIDER_REQUIRED", "OpenAI 또는 Gemini provider를 선택해 주세요.");
  }
  if (!count) {
    return invalidPayload("COUNT_INVALID", "이미지 개수는 1개부터 4개까지 선택해 주세요.");
  }
  if (modelLabel === false) {
    return invalidPayload("MODEL_LABEL_INVALID", "이미지 생성 모델을 다시 선택해 주세요.");
  }
  if (provider && modelLabel && PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_CONTRACTS[modelLabel].provider !== provider) {
    return invalidPayload("MODEL_PROVIDER_MISMATCH", "모델과 provider 선택이 서로 맞지 않습니다.");
  }
  if (ratio === false) {
    return invalidPayload("RATIO_INVALID", "이미지 비율을 다시 선택해 주세요.");
  }
  if (resolution === false) {
    return invalidPayload("RESOLUTION_INVALID", "이미지 해상도를 다시 선택해 주세요.");
  }
  if (!qualityMode) {
    return invalidPayload("QUALITY_MODE_REQUIRED", "생성 품질을 선택해 주세요.");
  }

  return {
    ok: true,
    payload: {
      conceptId,
      count,
      ...(modelLabel ? { modelLabel } : {}),
      outputs,
      productionSettings: productionSettings.settings,
      ...(provider ? { provider } : {}),
      qualityMode,
      ...(ratio ? { ratio } : {}),
      ...(resolution ? { resolution } : {}),
    },
  };
}

export function getProductImageStudioGenerationOutputBlockReason(
  cardFormat: CardFormat,
  assetRoles: readonly ProductImageStudioAssetRole[],
  productionSettings: ProductImageStudioProductionSettings,
  outputType: ProductImageStudioOutputType,
): string | null {
  const settingsIssue = getProductImageStudioProductionSettingsIssueForOutput(productionSettings, outputType);
  if (settingsIssue) {
    return settingsIssue;
  }
  if ((outputType === "set_combined" || outputType === "card_single") && !hasCardAsset(cardFormat, assetRoles)) {
    return "카드 이미지를 먼저 업로드해 주세요.";
  }
  if ((outputType === "set_combined" || outputType === "envelope_single") && !hasAsset(assetRoles, "envelope_front")) {
    return "봉투 이미지를 먼저 업로드해 주세요.";
  }
  if ((outputType === "set_combined" || outputType === "seal_sticker_single") && !hasAsset(assetRoles, "seal_sticker")) {
    return "봉합스티커 이미지를 먼저 업로드해 주세요.";
  }
  return null;
}

function parseOutputs(value: unknown): readonly ProductImageStudioOutputType[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const outputs: ProductImageStudioOutputType[] = [];
  for (const item of value) {
    const output = parseOutputType(item);
    if (!output) {
      return [];
    }
    outputs.push(output);
  }
  return outputs;
}

function parseOutputType(value: unknown): ProductImageStudioOutputType | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const outputType of PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES) {
    if (outputType === value) {
      return outputType;
    }
  }

  return null;
}

function parseOptionalProvider(value: unknown): ProductImageStudioProviderName | false | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    return false;
  }

  for (const provider of PRODUCT_IMAGE_STUDIO_PROVIDERS) {
    if (provider === value) {
      return provider;
    }
  }
  return false;
}

function parseOptionalCount(value: unknown): ProductImageStudioImageGeneratorCount | null {
  if (value === undefined || value === null || value === "") {
    return 1;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }
  return PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_COUNTS.find((count) => count === value) ?? null;
}

function parseOptionalModelLabel(
  value: unknown,
  provider: ProductImageStudioProviderName | undefined,
): ProductImageStudioImageGeneratorModelLabel | false | undefined {
  if (value === undefined || value === null || value === "") {
    return provider ? getProductImageStudioImageGeneratorModelLabelForProvider(provider) : undefined;
  }
  if (typeof value !== "string") {
    return false;
  }
  return PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_LABELS.find((modelLabel) => modelLabel === value) ?? false;
}

function parseOptionalRatio(value: unknown): ProductImageStudioImageGeneratorRatio | false | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    return false;
  }
  return PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_RATIOS.find((ratio) => ratio === value) ?? false;
}

function parseOptionalResolution(value: unknown): ProductImageStudioImageGeneratorResolution | false | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    return false;
  }
  return PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_RESOLUTIONS.find((resolution) => resolution === value) ?? false;
}

function parseQualityMode(value: unknown): ProductImageStudioQualityMode | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const qualityMode of PRODUCT_IMAGE_STUDIO_QUALITY_MODES) {
    if (qualityMode === value) {
      return qualityMode;
    }
  }

  return null;
}

function hasCardAsset(cardFormat: CardFormat, assetRoles: readonly ProductImageStudioAssetRole[]): boolean {
  return cardFormat === "folded_card" ? hasAsset(assetRoles, "folded_card_outer_front") : hasAsset(assetRoles, "postcard_front");
}

function hasAsset(assetRoles: readonly ProductImageStudioAssetRole[], role: ProductImageStudioAssetRole): boolean {
  return assetRoles.some((candidate) => candidate === role);
}

function invalidPayload(code: string, message: string): {
  readonly error: { readonly code: string; readonly message: string };
  readonly ok: false;
} {
  return { error: { code, message }, ok: false };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
