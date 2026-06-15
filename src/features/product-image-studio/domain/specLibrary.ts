import type {
  ProductImageStudioSealStickerSpec,
  ProductImageStudioSizeMm,
} from "@/features/product-image-studio/domain/productionSettings";
import { assertNever } from "@/features/product-image-studio/domain/types";

export const PRODUCT_IMAGE_STUDIO_SPEC_ITEM_TYPES = [
  "postcard",
  "folded_card",
  "envelope",
  "sticker",
  "business_card",
] as const;

export type ProductImageStudioSpecItemType = (typeof PRODUCT_IMAGE_STUDIO_SPEC_ITEM_TYPES)[number];
export type ProductImageStudioPaperFinish = "glossy" | "matte" | "textured";
export type ProductImageStudioPrintSides = "front_back" | "front_only";
export type ProductImageStudioEnvelopeFlapStyle = "jacket" | "square";

type ProductImageStudioSpecItemBase = {
  readonly createdAt: string;
  readonly id: string;
  readonly name: string;
};

export type ProductImageStudioSpecItemDraft =
  | {
      readonly name: string;
      readonly paperFinish: ProductImageStudioPaperFinish;
      readonly paperWeightGsm: number;
      readonly sides: ProductImageStudioPrintSides;
      readonly sizeMm: ProductImageStudioSizeMm;
      readonly type: "postcard";
    }
  | {
      readonly foldedSizeMm: ProductImageStudioSizeMm;
      readonly foldDirection: "left_fold" | "top_fold";
      readonly name: string;
      readonly openSizeMm: ProductImageStudioSizeMm;
      readonly paperFinish: ProductImageStudioPaperFinish;
      readonly paperWeightGsm: number;
      readonly type: "folded_card";
    }
  | {
      readonly flapDirection: "side_flap" | "top_flap";
      readonly flapStyle: ProductImageStudioEnvelopeFlapStyle;
      readonly name: string;
      readonly sizeMm: ProductImageStudioSizeMm;
      readonly type: "envelope";
    }
  | {
      readonly name: string;
      readonly placement: ProductImageStudioSealStickerSpec["placement"];
      readonly shape: ProductImageStudioSealStickerSpec["shape"];
      readonly sizeMm: ProductImageStudioSealStickerSpec["sizeMm"];
      readonly type: "sticker";
    }
  | {
      readonly name: string;
      readonly sides: ProductImageStudioPrintSides;
      readonly sizeMm: ProductImageStudioSizeMm;
      readonly type: "business_card";
    };

export type ProductImageStudioSpecItem = ProductImageStudioSpecItemBase & ProductImageStudioSpecItemDraft;

export type ProductImageStudioSpecSet = {
  readonly createdAt: string;
  readonly id: string;
  readonly itemIds: readonly string[];
  readonly name: string;
};

export function createDefaultProductImageStudioSpecItemDraft(
  type: ProductImageStudioSpecItemType,
): ProductImageStudioSpecItemDraft {
  switch (type) {
    case "postcard":
      return {
        name: "",
        paperFinish: "matte",
        paperWeightGsm: 260,
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
        paperFinish: "matte",
        paperWeightGsm: 300,
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
  return { ...input, name: input.name.trim() };
}

export function createProductImageStudioSpecSet(input: ProductImageStudioSpecSet): ProductImageStudioSpecSet {
  return {
    createdAt: input.createdAt,
    id: input.id,
    itemIds: [...new Set(input.itemIds)],
    name: input.name.trim(),
  };
}

export function upsertProductImageStudioSpecItem(
  items: readonly ProductImageStudioSpecItem[],
  item: ProductImageStudioSpecItem,
): readonly ProductImageStudioSpecItem[] {
  return [item, ...items.filter((candidate) => candidate.id !== item.id)];
}

export function removeProductImageStudioSpecItem(
  items: readonly ProductImageStudioSpecItem[],
  itemId: string,
): readonly ProductImageStudioSpecItem[] {
  return items.filter((candidate) => candidate.id !== itemId);
}

export function upsertProductImageStudioSpecSet(
  sets: readonly ProductImageStudioSpecSet[],
  set: ProductImageStudioSpecSet,
): readonly ProductImageStudioSpecSet[] {
  return [set, ...sets.filter((candidate) => candidate.id !== set.id)];
}

export function removeProductImageStudioSpecSet(
  sets: readonly ProductImageStudioSpecSet[],
  setId: string,
): readonly ProductImageStudioSpecSet[] {
  return sets.filter((candidate) => candidate.id !== setId);
}

export function removeProductImageStudioSpecItemFromSets(
  sets: readonly ProductImageStudioSpecSet[],
  itemId: string,
): readonly ProductImageStudioSpecSet[] {
  return sets
    .map((set) => ({ ...set, itemIds: set.itemIds.filter((candidate) => candidate !== itemId) }))
    .filter((set) => set.itemIds.length > 0);
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

function hasPositiveSize(size: ProductImageStudioSizeMm): boolean {
  return size.height > 0 && size.width > 0;
}

function hasPositiveStickerSize(size: ProductImageStudioSealStickerSpec["sizeMm"]): boolean {
  return "diameter" in size ? size.diameter > 0 : hasPositiveSize(size);
}

function formatSize(size: ProductImageStudioSizeMm): string {
  return `${size.width} x ${size.height}mm`;
}
