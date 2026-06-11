import {
  PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES,
  PRODUCT_IMAGE_STUDIO_QUALITY_MODES,
  type CardFormat,
  type ProductImageStudioAssetRole,
  type ProductImageStudioOutputType,
  type ProductImageStudioQualityMode,
} from "@/features/product-image-studio/domain/types";
import {
  getProductImageStudioProductionSettingsIssueForOutput,
  parseProductImageStudioProductionSettings,
  type ProductImageStudioProductionSettings,
} from "@/features/product-image-studio/domain/productionSettings";

export type ParsedProductImageStudioGenerationPayload = {
  readonly conceptId: string;
  readonly outputs: readonly ProductImageStudioOutputType[];
  readonly productionSettings: ProductImageStudioProductionSettings;
  readonly qualityMode: ProductImageStudioQualityMode;
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
  if (!qualityMode) {
    return invalidPayload("QUALITY_MODE_REQUIRED", "생성 품질을 선택해 주세요.");
  }

  return {
    ok: true,
    payload: {
      conceptId,
      outputs,
      productionSettings: productionSettings.settings,
      qualityMode,
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
