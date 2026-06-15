import type {
  ProductImageStudioSealStickerSpec,
  ProductImageStudioSizeMm,
} from "@/features/product-image-studio/domain/productionSettings";
import { assertNever } from "@/features/product-image-studio/domain/types";
import type {
  ProductImageStudioSpecItem,
  ProductImageStudioSpecItemBase,
  ProductImageStudioSpecItemDraft,
  ProductImageStudioSpecItemType,
} from "./specLibraryTypes";

export function createDefaultProductImageStudioSpecItemDraft(
  type: ProductImageStudioSpecItemType,
): ProductImageStudioSpecItemDraft {
  switch (type) {
    case "postcard":
      return {
        name: "",
        sides: "front_back",
        sizeMm: { height: 0, width: 0 },
        type,
      };
    case "folded_card":
      return {
        foldedSizeMm: { height: 0, width: 0 },
        foldDirection: "left_fold",
        name: "",
        openSizeMm: { height: 0, width: 0 },
        type,
      };
    case "envelope":
      return {
        flapDirection: "top_flap",
        flapStyle: "square",
        name: "",
        sizeMm: { height: 0, width: 0 },
        type,
      };
    case "sticker":
      return {
        name: "",
        placement: "envelope_flap_center",
        shape: "circle",
        sizeMm: { diameter: 0 },
        type,
      };
    case "business_card":
      return {
        name: "",
        sides: "front_back",
        sizeMm: { height: 0, width: 0 },
        type,
      };
    default:
      return assertNever(type);
  }
}

export function createProductImageStudioSpecItem(
  input: ProductImageStudioSpecItemBase & ProductImageStudioSpecItemDraft,
): ProductImageStudioSpecItem {
  const base = {
    createdAt: input.createdAt,
    id: input.id,
    name: input.name.trim(),
  };
  switch (input.type) {
    case "postcard":
      return { ...base, sides: input.sides, sizeMm: input.sizeMm, type: "postcard" };
    case "folded_card":
      return {
        ...base,
        foldedSizeMm: input.foldedSizeMm,
        foldDirection: input.foldDirection,
        openSizeMm: input.openSizeMm,
        type: "folded_card",
      };
    case "envelope":
      return {
        ...base,
        flapDirection: input.flapDirection,
        flapStyle: input.flapStyle,
        sizeMm: input.sizeMm,
        type: "envelope",
      };
    case "sticker":
      return {
        ...base,
        placement: input.placement,
        shape: input.shape,
        sizeMm: input.sizeMm,
        type: "sticker",
      };
    case "business_card":
      return { ...base, sides: input.sides, sizeMm: input.sizeMm, type: "business_card" };
    default:
      return assertNever(input);
  }
}

export function getProductImageStudioSpecItemIssue(draft: ProductImageStudioSpecItemDraft): string | null {
  if (draft.name.trim().length === 0) {
    return "규격 이름을 입력해 주세요.";
  }
  switch (draft.type) {
    case "postcard":
    case "business_card":
    case "envelope":
      return hasPositiveSize(draft.sizeMm) ? null : "가로와 세로를 입력해 주세요.";
    case "folded_card":
      return hasPositiveSize(draft.foldedSizeMm) && hasPositiveSize(draft.openSizeMm)
        ? null
        : "접은 크기와 펼친 크기를 입력해 주세요.";
    case "sticker":
      return hasPositiveStickerSize(draft.sizeMm) ? null : "스티커 크기를 입력해 주세요.";
    default:
      return assertNever(draft);
  }
}

function hasPositiveSize(size: ProductImageStudioSizeMm): boolean {
  return size.height > 0 && size.width > 0;
}

function hasPositiveStickerSize(size: ProductImageStudioSealStickerSpec["sizeMm"]): boolean {
  return "diameter" in size ? size.diameter > 0 : hasPositiveSize(size);
}
