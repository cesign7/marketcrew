import type { CardFormat } from "@/features/product-image-studio/domain/types";
import { isProductImageStudioSpecPresetAllowedForCardFormat } from "@/features/product-image-studio/domain/productionSettingsPresets";
import {
  PRODUCT_IMAGE_STUDIO_DESIGN_PRESERVATION_MODES,
  PRODUCT_IMAGE_STUDIO_GENERATION_METHODS,
  PRODUCT_IMAGE_STUDIO_OUTPUT_PURPOSES,
  PRODUCT_IMAGE_STUDIO_SHOT_ANGLES,
  PRODUCT_IMAGE_STUDIO_SPEC_PRESET_IDS,
  type ProductImageStudioCardSpec,
  type ProductImageStudioEnvelopeSpec,
  type ProductImageStudioProductionSettings,
  type ProductImageStudioProductionSettingsParseResult,
  type ProductImageStudioSceneProductionSettings,
  type ProductImageStudioSealStickerSpec,
  type ProductImageStudioSizeMm,
} from "@/features/product-image-studio/domain/productionSettingsTypes";

export {
  applyProductImageStudioSpecPreset,
  createDefaultProductImageStudioProductionSettings,
  listProductImageStudioSpecPresets,
} from "@/features/product-image-studio/domain/productionSettingsPresets";
export type {
  ProductImageStudioCardSpec,
  ProductImageStudioEnvelopeSpec,
  ProductImageStudioGenerationMethod,
  ProductImageStudioOutputPurpose,
  ProductImageStudioProductionSettings,
  ProductImageStudioSceneProductionSettings,
  ProductImageStudioSealStickerSpec,
  ProductImageStudioShotAngle,
  ProductImageStudioSpecPreset,
  ProductImageStudioSpecPresetId,
} from "@/features/product-image-studio/domain/productionSettingsTypes";
export {
  PRODUCT_IMAGE_STUDIO_GENERATION_METHOD_OPTIONS,
  PRODUCT_IMAGE_STUDIO_OUTPUT_PURPOSE_OPTIONS,
  PRODUCT_IMAGE_STUDIO_SHOT_ANGLE_OPTIONS,
} from "@/features/product-image-studio/domain/productionSettingsTypes";

export function buildProductImageStudioProductionPromptLines(
  settings: ProductImageStudioProductionSettings,
): readonly string[] {
  const cardLines =
    settings.card.format === "folded_card"
      ? [`cardFoldedSize=${toSizeLabel(settings.card.foldedSizeMm)}`, `cardOpenSize=${toSizeLabel(settings.card.openSizeMm)}`]
      : [`cardFlatSize=${toSizeLabel(settings.card.sizeMm)}`];
  return [
    `specPreset=${settings.presetId}`,
    ...cardLines,
    `envelopeSize=${toSizeLabel(settings.envelope.sizeMm)}`,
    `sealStickerShape=${settings.sealSticker.shape}`,
    `sealStickerSize=${toSealStickerSizeLabel(settings.sealSticker)}`,
    `sealPlacement=${settings.sealSticker.placement}`,
    `paper=${settings.card.paperFinish}_${settings.card.paperWeightGsm}gsm`,
    `outputPurpose=${settings.scene.outputPurpose}`,
    `shotAngle=${settings.scene.shotAngle}`,
    `generationMethod=${settings.scene.generationMethod}`,
    `designPreservation=${settings.scene.designPreservation}`,
  ];
}

export function buildProductImageStudioValidationChecklist(
  settings: ProductImageStudioProductionSettings,
): readonly string[] {
  return [
    "카드와 봉투의 상대 크기가 실제 사양과 맞아야 합니다.",
    "봉합스티커 크기와 부착 위치가 선택한 사양과 맞아야 합니다.",
    "글자, 로고, 패턴은 다시 그리지 않고 업로드 이미지를 보존해야 합니다.",
    "소품은 상품 인쇄면과 안전 영역을 가리지 않아야 합니다.",
    settings.card.format === "folded_card"
      ? "접이식 카드는 접힘, 종이 두께, 접지 그림자가 자연스러워야 합니다."
      : "엽서형 카드는 접힌 카드처럼 보이면 안 됩니다.",
    "스마트스토어 대표이미지 비율에서 상품이 잘리지 않아야 합니다.",
  ];
}

export function parseProductImageStudioProductionSettings(
  value: unknown,
  cardFormat: CardFormat,
): ProductImageStudioProductionSettingsParseResult {
  if (!isRecord(value)) {
    return invalidProductionSettings("PRODUCTION_SETTINGS_REQUIRED", "상품 사양을 선택해 주세요.");
  }
  const presetId = parseOneOf(value["presetId"], PRODUCT_IMAGE_STUDIO_SPEC_PRESET_IDS);
  const card = parseCardSpec(value["card"], cardFormat);
  const envelope = parseEnvelopeSpec(value["envelope"]);
  const sealSticker = parseSealStickerSpec(value["sealSticker"]);
  const scene = parseSceneSettings(value["scene"]);
  if (!presetId || !card || !envelope || !sealSticker || !scene) {
    return invalidProductionSettings("INVALID_PRODUCTION_SETTINGS", "상품 사양 형식이 올바르지 않습니다.");
  }
  if (!isProductImageStudioSpecPresetAllowedForCardFormat(cardFormat, presetId)) {
    return invalidProductionSettings("INVALID_SPEC_PRESET", "카드 형식에 맞는 상품 사양을 선택해 주세요.");
  }
  if (!isEnvelopeLargeEnough(card, envelope)) {
    return invalidProductionSettings("ENVELOPE_TOO_SMALL", "봉투는 카드보다 크게 설정해 주세요.");
  }
  return { ok: true, settings: { card, envelope, presetId, scene, sealSticker } };
}

function parseCardSpec(value: unknown, cardFormat: CardFormat): ProductImageStudioCardSpec | null {
  if (!isRecord(value) || value["format"] !== cardFormat) {
    return null;
  }
  const paperFinish = parseOneOf(value["paperFinish"], ["matte", "glossy", "textured"] as const);
  const paperWeightGsm = parsePositiveNumber(value["paperWeightGsm"]);
  if (!paperFinish || !paperWeightGsm) {
    return null;
  }
  if (cardFormat === "folded_card") {
    const foldedSizeMm = parseSize(value["foldedSizeMm"]);
    const openSizeMm = parseSize(value["openSizeMm"]);
    const foldDirection = parseOneOf(value["foldDirection"], ["left_fold", "top_fold"] as const);
    return foldedSizeMm && openSizeMm && foldDirection
      ? { foldedSizeMm, foldDirection, format: "folded_card", openSizeMm, paperFinish, paperWeightGsm }
      : null;
  }
  const sizeMm = parseSize(value["sizeMm"]);
  return sizeMm ? { format: "postcard_flat", paperFinish, paperWeightGsm, sizeMm } : null;
}

function parseEnvelopeSpec(value: unknown): ProductImageStudioEnvelopeSpec | null {
  if (!isRecord(value)) {
    return null;
  }
  const sizeMm = parseSize(value["sizeMm"]);
  const flapDirection = parseOneOf(value["flapDirection"], ["top_flap", "side_flap"] as const);
  return sizeMm && flapDirection ? { flapDirection, sizeMm } : null;
}

function parseSealStickerSpec(value: unknown): ProductImageStudioSealStickerSpec | null {
  if (!isRecord(value)) {
    return null;
  }
  const placement = parseOneOf(value["placement"], ["envelope_flap_center", "envelope_corner", "cylindrical_surface"] as const);
  if (value["shape"] === "circle" && placement && isRecord(value["sizeMm"])) {
    const diameter = parsePositiveNumber(value["sizeMm"]["diameter"]);
    return diameter ? { placement, shape: "circle", sizeMm: { diameter } } : null;
  }
  if (value["shape"] === "rectangle" && placement) {
    const sizeMm = parseSize(value["sizeMm"]);
    return sizeMm ? { placement, shape: "rectangle", sizeMm } : null;
  }
  return null;
}

function parseSceneSettings(value: unknown): ProductImageStudioSceneProductionSettings | null {
  if (!isRecord(value)) {
    return null;
  }
  const designPreservation = parseOneOf(value["designPreservation"], PRODUCT_IMAGE_STUDIO_DESIGN_PRESERVATION_MODES);
  const generationMethod = parseOneOf(value["generationMethod"], PRODUCT_IMAGE_STUDIO_GENERATION_METHODS);
  const outputPurpose = parseOneOf(value["outputPurpose"], PRODUCT_IMAGE_STUDIO_OUTPUT_PURPOSES);
  const shotAngle = parseOneOf(value["shotAngle"], PRODUCT_IMAGE_STUDIO_SHOT_ANGLES);
  return designPreservation && generationMethod && outputPurpose && shotAngle
    ? { designPreservation, generationMethod, outputPurpose, shotAngle }
    : null;
}

function isEnvelopeLargeEnough(card: ProductImageStudioCardSpec, envelope: ProductImageStudioEnvelopeSpec): boolean {
  const cardSize = card.format === "folded_card" ? card.foldedSizeMm : card.sizeMm;
  return envelope.sizeMm.width > cardSize.width && envelope.sizeMm.height > cardSize.height;
}

function parseSize(value: unknown): ProductImageStudioSizeMm | null {
  if (!isRecord(value)) {
    return null;
  }
  const height = parsePositiveNumber(value["height"]);
  const width = parsePositiveNumber(value["width"]);
  return height && width ? { height, width } : null;
}

function parsePositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function parseOneOf<Value extends string>(value: unknown, values: readonly Value[]): Value | null {
  return typeof value === "string" ? values.find((candidate) => candidate === value) ?? null : null;
}

function toSizeLabel(size: ProductImageStudioSizeMm): string {
  return `${size.width}x${size.height}mm`;
}

function toSealStickerSizeLabel(sealSticker: ProductImageStudioSealStickerSpec): string {
  return sealSticker.shape === "circle" ? `${sealSticker.sizeMm.diameter}mm` : toSizeLabel(sealSticker.sizeMm);
}

function invalidProductionSettings(
  code: string,
  message: string,
): Extract<ProductImageStudioProductionSettingsParseResult, { readonly ok: false }> {
  return { error: { code, message }, ok: false };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
