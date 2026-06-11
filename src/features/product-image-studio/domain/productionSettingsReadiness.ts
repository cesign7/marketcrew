import type { ProductImageStudioAssetRole, ProductImageStudioOutputType } from "@/features/product-image-studio/domain/types";
import type {
  ProductImageStudioCardSpec,
  ProductImageStudioEnvelopeSpec,
  ProductImageStudioProductionSettings,
  ProductImageStudioSealStickerSpec,
  ProductImageStudioSizeMm,
} from "@/features/product-image-studio/domain/productionSettingsTypes";

export function getProductImageStudioProductionSettingsIssueForOutput(
  settings: ProductImageStudioProductionSettings,
  outputType: ProductImageStudioOutputType,
): string | null {
  if (outputType === "card_single") {
    return hasCompleteProductImageStudioCardSpec(settings.card) ? null : "카드 실제 규격을 입력해 주세요.";
  }
  if (outputType === "envelope_single") {
    return hasCompleteProductImageStudioEnvelopeSpec(settings.envelope) ? null : "봉투 실제 규격을 입력해 주세요.";
  }
  if (outputType === "seal_sticker_single") {
    return hasCompleteProductImageStudioSealStickerSpec(settings.sealSticker) ? null : "봉합스티커 실제 규격을 입력해 주세요.";
  }
  if (!hasCompleteProductImageStudioCardSpec(settings.card)) {
    return "카드 실제 규격을 입력해 주세요.";
  }
  if (!hasCompleteProductImageStudioEnvelopeSpec(settings.envelope)) {
    return "봉투 실제 규격을 입력해 주세요.";
  }
  if (!hasCompleteProductImageStudioSealStickerSpec(settings.sealSticker)) {
    return "봉합스티커 실제 규격을 입력해 주세요.";
  }
  return isProductImageStudioEnvelopeLargeEnough(settings.card, settings.envelope)
    ? null
    : "세트컷에서는 봉투가 카드보다 크게 입력되어야 합니다.";
}

export function getProductImageStudioProductionSettingsIssueForAssetRole(
  settings: ProductImageStudioProductionSettings,
  role: ProductImageStudioAssetRole,
): string | null {
  if (role === "envelope_front" || role === "envelope_inside_flap") {
    return hasCompleteProductImageStudioEnvelopeSpec(settings.envelope) ? null : "봉투 규격을 먼저 입력해 주세요.";
  }
  if (role === "seal_sticker") {
    return hasCompleteProductImageStudioSealStickerSpec(settings.sealSticker) ? null : "봉합스티커 규격을 먼저 입력해 주세요.";
  }
  if (role === "reference_mood") {
    return null;
  }
  return hasCompleteProductImageStudioCardSpec(settings.card) ? null : "카드 규격을 먼저 입력해 주세요.";
}

export function isProductImageStudioProductionSettingsReadyForOutput(
  settings: ProductImageStudioProductionSettings,
  outputType: ProductImageStudioOutputType,
): boolean {
  return getProductImageStudioProductionSettingsIssueForOutput(settings, outputType) === null;
}

export function hasCompleteProductImageStudioCardSpec(card: ProductImageStudioCardSpec): boolean {
  if (card.paperWeightGsm <= 0) {
    return false;
  }
  if (card.format === "postcard_flat") {
    return isPositiveSize(card.sizeMm);
  }
  if (!isPositiveSize(card.foldedSizeMm) || !isPositiveSize(card.openSizeMm)) {
    return false;
  }
  if (card.foldDirection === "left_fold") {
    return card.openSizeMm.width > card.foldedSizeMm.width && card.openSizeMm.height >= card.foldedSizeMm.height;
  }
  return card.openSizeMm.height > card.foldedSizeMm.height && card.openSizeMm.width >= card.foldedSizeMm.width;
}

export function hasCompleteProductImageStudioEnvelopeSpec(envelope: ProductImageStudioEnvelopeSpec): boolean {
  return isPositiveSize(envelope.sizeMm);
}

export function hasCompleteProductImageStudioSealStickerSpec(sealSticker: ProductImageStudioSealStickerSpec): boolean {
  if (sealSticker.shape === "circle") {
    return sealSticker.sizeMm.diameter > 0;
  }
  return isPositiveSize(sealSticker.sizeMm);
}

export function isProductImageStudioEnvelopeLargeEnough(
  card: ProductImageStudioCardSpec,
  envelope: ProductImageStudioEnvelopeSpec,
): boolean {
  const cardSize = card.format === "folded_card" ? card.foldedSizeMm : card.sizeMm;
  return envelope.sizeMm.width > cardSize.width && envelope.sizeMm.height > cardSize.height;
}

function isPositiveSize(size: ProductImageStudioSizeMm): boolean {
  return size.width > 0 && size.height > 0;
}
