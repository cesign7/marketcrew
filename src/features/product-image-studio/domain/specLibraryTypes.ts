import type {
  ProductImageStudioSealStickerSpec,
  ProductImageStudioSizeMm,
} from "@/features/product-image-studio/domain/productionSettings";

export const PRODUCT_IMAGE_STUDIO_SPEC_ITEM_TYPES = [
  "postcard",
  "folded_card",
  "envelope",
  "sticker",
  "business_card",
] as const;

export type ProductImageStudioSpecItemType = (typeof PRODUCT_IMAGE_STUDIO_SPEC_ITEM_TYPES)[number];
export type ProductImageStudioPrintSides = "front_back" | "front_only";
export type ProductImageStudioEnvelopeFlapStyle = "jacket" | "square";

export type ProductImageStudioSpecItemBase = {
  readonly createdAt: string;
  readonly id: string;
  readonly name: string;
};

export type ProductImageStudioSpecItemDraft =
  | {
      readonly name: string;
      readonly sides: ProductImageStudioPrintSides;
      readonly sizeMm: ProductImageStudioSizeMm;
      readonly type: "postcard";
    }
  | {
      readonly foldedSizeMm: ProductImageStudioSizeMm;
      readonly foldDirection: "left_fold" | "top_fold";
      readonly name: string;
      readonly openSizeMm: ProductImageStudioSizeMm;
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
