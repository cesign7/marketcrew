import { getProductImageStudioPoseLabel } from "@/features/product-image-studio/domain/projectWizardLabels";
import {
  assertNever,
  type CardDisplayPose,
  type CardFormat,
  type ProductImageStudioOutputType,
  type ProductImageStudioProductType,
} from "@/features/product-image-studio/domain/types";

export const PRODUCT_IMAGE_STUDIO_ARCHIVE_OUTPUT_GROUPS = [
  "set_combined",
  "card_single",
  "envelope_single",
  "seal_sticker_single",
] as const satisfies readonly ProductImageStudioOutputType[];

export function formatProductImageStudioArchiveDate(value: string | null): string {
  if (!value) {
    return "기록 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function getProductImageStudioArchiveCardFormatLabel(cardFormat: CardFormat): string {
  switch (cardFormat) {
    case "folded_card":
      return "접이식 카드";
    case "postcard_flat":
      return "엽서형 카드";
    default:
      return assertNever(cardFormat);
  }
}

export function getProductImageStudioArchiveOutputLabel(outputType: ProductImageStudioOutputType): string {
  switch (outputType) {
    case "set_combined":
      return "세트컷";
    case "card_single":
      return "카드 단독컷";
    case "envelope_single":
      return "봉투 단독컷";
    case "seal_sticker_single":
      return "봉합스티커 단독컷";
    default:
      return assertNever(outputType);
  }
}

export function getProductImageStudioArchivePoseLabel(cardPose?: CardDisplayPose): string {
  return cardPose ? getProductImageStudioPoseLabel(cardPose) : "자세 기록 없음";
}

export function getProductImageStudioArchiveProductTypeLabel(productType: ProductImageStudioProductType): string {
  switch (productType) {
    case "card_envelope_seal_set":
      return "카드+봉투+봉합스티커 세트";
    default:
      return assertNever(productType);
  }
}

export function formatProductImageStudioProviderValue(value: string | null): string {
  return value && value.trim().length > 0 ? value : "기록 없음";
}
