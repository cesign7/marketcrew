export const PRODUCT_IMAGE_STUDIO_PRODUCT_FAMILIES = [
  "folded_card",
  "postcard",
  "business_card",
  "envelope",
  "seal_sticker",
] as const;
export type ProductImageStudioProductFamily = (typeof PRODUCT_IMAGE_STUDIO_PRODUCT_FAMILIES)[number];

export const PRODUCT_IMAGE_STUDIO_FOLD_AXES = ["vertical", "horizontal"] as const;
export type ProductImageStudioFoldAxis = (typeof PRODUCT_IMAGE_STUDIO_FOLD_AXES)[number];

export const PRODUCT_IMAGE_STUDIO_FOLD_OPEN_DIRECTIONS = [
  "opens_left",
  "opens_right",
  "opens_up",
  "opens_down",
] as const;
export type ProductImageStudioFoldOpenDirection = (typeof PRODUCT_IMAGE_STUDIO_FOLD_OPEN_DIRECTIONS)[number];

export const PRODUCT_IMAGE_STUDIO_ENVELOPE_FLAP_POSITIONS = ["top", "bottom", "left", "right"] as const;
export type ProductImageStudioEnvelopeFlapPosition = (typeof PRODUCT_IMAGE_STUDIO_ENVELOPE_FLAP_POSITIONS)[number];

export const PRODUCT_IMAGE_STUDIO_ENVELOPE_FLAP_SHAPES = ["square", "triangle", "jacket", "round"] as const;
export type ProductImageStudioEnvelopeFlapShape = (typeof PRODUCT_IMAGE_STUDIO_ENVELOPE_FLAP_SHAPES)[number];

export const PRODUCT_IMAGE_STUDIO_SEAL_STICKER_SHAPES = ["circle", "rectangle"] as const;
export type ProductImageStudioSealStickerShape = (typeof PRODUCT_IMAGE_STUDIO_SEAL_STICKER_SHAPES)[number];

export type ProductImageStudioSizeMm = {
  readonly height: number;
  readonly width: number;
};

type ProductImageStudioProductSpecBase = {
  readonly family: ProductImageStudioProductFamily;
  readonly id: string;
  readonly name: string;
};

export type ProductImageStudioFoldedCardProductSpec = ProductImageStudioProductSpecBase & {
  readonly family: "folded_card";
  readonly foldAxis: ProductImageStudioFoldAxis;
  readonly foldedSizeMm: ProductImageStudioSizeMm;
  readonly openDirection: ProductImageStudioFoldOpenDirection;
  readonly openSizeMm: ProductImageStudioSizeMm;
};

export type ProductImageStudioFlatProductSpec = ProductImageStudioProductSpecBase & {
  readonly family: "postcard" | "business_card";
  readonly sizeMm: ProductImageStudioSizeMm;
};

export type ProductImageStudioEnvelopeProductSpec = ProductImageStudioProductSpecBase & {
  readonly family: "envelope";
  readonly flapPosition: ProductImageStudioEnvelopeFlapPosition;
  readonly flapShape: ProductImageStudioEnvelopeFlapShape;
  readonly sizeMm: ProductImageStudioSizeMm;
};

export type ProductImageStudioSealStickerProductSpec = ProductImageStudioProductSpecBase & {
  readonly family: "seal_sticker";
  readonly shape: ProductImageStudioSealStickerShape;
  readonly sizeMm: ProductImageStudioSizeMm;
};

export type ProductImageStudioProductSpec =
  | ProductImageStudioFoldedCardProductSpec
  | ProductImageStudioFlatProductSpec
  | ProductImageStudioEnvelopeProductSpec
  | ProductImageStudioSealStickerProductSpec;

export type ProductImageStudioProductSpecParseErrorCode =
  | "PRODUCT_SPEC_REQUIRED"
  | "PRODUCT_SPEC_ID_REQUIRED"
  | "PRODUCT_SPEC_NAME_REQUIRED"
  | "INVALID_PRODUCT_FAMILY"
  | "INVALID_SIZE"
  | "INVALID_FOLD_AXIS"
  | "INVALID_FOLD_OPEN_DIRECTION"
  | "INVALID_FOLDED_CARD_GEOMETRY"
  | "INVALID_ENVELOPE_FLAP_POSITION"
  | "INVALID_ENVELOPE_FLAP_SHAPE"
  | "INVALID_SEAL_STICKER_SHAPE";

export type ProductImageStudioProductSpecParseResult =
  | { readonly ok: true; readonly spec: ProductImageStudioProductSpec }
  | {
      readonly error: {
        readonly code: ProductImageStudioProductSpecParseErrorCode;
        readonly message: string;
      };
      readonly ok: false;
    };

export type ProductImageStudioProductSpecParseFailure = Extract<
  ProductImageStudioProductSpecParseResult,
  { readonly ok: false }
>;
