import type { ProductImageStudioSizeMm } from "@/features/product-image-studio/domain/productionSettings";
import { assertNever } from "@/features/product-image-studio/domain/types";
import type { ProductImageStudioSpecItem, ProductImageStudioSpecItemType } from "./specLibraryTypes";

export function getProductImageStudioSpecItemTypeLabel(type: ProductImageStudioSpecItemType): string {
  switch (type) {
    case "postcard":
      return "엽서(비접이)";
    case "folded_card":
      return "카드(접이식)";
    case "envelope":
      return "봉투";
    case "sticker":
      return "스티커";
    case "business_card":
      return "명함";
    default:
      return assertNever(type);
  }
}

export function getProductImageStudioSpecItemSummary(item: ProductImageStudioSpecItem): string {
  switch (item.type) {
    case "postcard":
    case "business_card":
    case "envelope":
      return formatSize(item.sizeMm);
    case "folded_card":
      return `${formatSize(item.foldedSizeMm)} 접힘`;
    case "sticker":
      return "diameter" in item.sizeMm ? `${item.sizeMm.diameter}mm 원형` : formatSize(item.sizeMm);
    default:
      return assertNever(item);
  }
}

function formatSize(size: ProductImageStudioSizeMm): string {
  return `${size.width} x ${size.height}mm`;
}
