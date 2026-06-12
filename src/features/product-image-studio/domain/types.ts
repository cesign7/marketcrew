declare const productImageStudioBrand: unique symbol;

export type Brand<Value, Name extends string> = Value & {
  readonly [productImageStudioBrand]: Name;
};

export type ProductImageStudioProjectId = Brand<string, "ProductImageStudioProjectId">;
export type ProductImageStudioAssetId = Brand<string, "ProductImageStudioAssetId">;
export type ProductImageStudioGenerationRequestId = Brand<string, "ProductImageStudioGenerationRequestId">;
export type ProductImageStudioResultId = Brand<string, "ProductImageStudioResultId">;

export const PRODUCT_IMAGE_STUDIO_PRODUCT_TYPES = ["card_envelope_seal_set"] as const;
export type ProductImageStudioProductType = (typeof PRODUCT_IMAGE_STUDIO_PRODUCT_TYPES)[number];

export const CARD_FORMATS = ["folded_card", "postcard_flat"] as const;
export type CardFormat = (typeof CARD_FORMATS)[number];

export const FOLDED_CARD_DISPLAY_POSES = [
  "folded_closed",
  "folded_open_spread",
  "folded_half_open",
  "folded_standing",
] as const;
export type FoldedCardDisplayPose = (typeof FOLDED_CARD_DISPLAY_POSES)[number];

export const POSTCARD_DISPLAY_POSES = ["postcard_front_flat", "postcard_back_flat", "postcard_lifestyle_stack"] as const;
export type PostcardDisplayPose = (typeof POSTCARD_DISPLAY_POSES)[number];

export type CardDisplayPose = FoldedCardDisplayPose | PostcardDisplayPose;

export const PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES = [
  "set_combined",
  "card_single",
  "envelope_single",
  "seal_sticker_single",
] as const;
export type ProductImageStudioOutputType = (typeof PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES)[number];

export const PRODUCT_IMAGE_STUDIO_ASSET_ROLES = [
  "folded_card_outer_front",
  "folded_card_inner_spread",
  "folded_card_back",
  "folded_card_fold_metadata",
  "postcard_front",
  "postcard_back",
  "envelope_front",
  "envelope_inside_flap",
  "seal_sticker",
  "reference_mood",
] as const;
export type ProductImageStudioAssetRole = (typeof PRODUCT_IMAGE_STUDIO_ASSET_ROLES)[number];

export const PRODUCT_IMAGE_STUDIO_RATIO_PRESETS = ["1:1", "4:5", "3:4", "16:9", "custom"] as const;
export type ProductImageStudioRatioPreset = (typeof PRODUCT_IMAGE_STUDIO_RATIO_PRESETS)[number];

export const PRODUCT_IMAGE_STUDIO_QUALITY_MODES = ["draft", "high"] as const;
export type ProductImageStudioQualityMode = (typeof PRODUCT_IMAGE_STUDIO_QUALITY_MODES)[number];

export const PRODUCT_IMAGE_STUDIO_PROVIDERS = ["openai", "gemini"] as const;
export type ProductImageStudioProviderName = (typeof PRODUCT_IMAGE_STUDIO_PROVIDERS)[number];

export const PRODUCT_IMAGE_STUDIO_GENERATION_STATUSES = [
  "queued",
  "generating_scene",
  "compositing_design",
  "ready",
  "blocked",
  "failed",
] as const;
export type ProductImageStudioGenerationStatus = (typeof PRODUCT_IMAGE_STUDIO_GENERATION_STATUSES)[number];

export type ProductImageStudioProviderGate =
  | {
      readonly kind: "blocked";
      readonly reason: "provider_not_configured" | "generation_disabled" | "credential_missing";
    }
  | {
      readonly kind: "enabled";
      readonly provider: ProductImageStudioProviderName;
      readonly model: string;
    };

export type CardEnvelopeSealProjectSpec = {
  readonly productType: "card_envelope_seal_set";
  readonly cardFormat: CardFormat;
  readonly requestedCardPoses: readonly CardDisplayPose[];
  readonly requestedOutputs: readonly ProductImageStudioOutputType[];
  readonly ratios: readonly ProductImageStudioRatioPreset[];
  readonly qualityMode: ProductImageStudioQualityMode;
};

export class ProductImageStudioContractError extends Error {
  readonly variant: string;

  constructor(variant: string) {
    super(`Unexpected product image studio contract variant: ${variant}`);
    this.name = "ProductImageStudioContractError";
    this.variant = variant;
  }
}

export function assertNever(value: never): never {
  throw new ProductImageStudioContractError(String(value));
}
