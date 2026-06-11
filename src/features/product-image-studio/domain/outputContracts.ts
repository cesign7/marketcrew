import {
  FOLDED_CARD_DISPLAY_POSES,
  POSTCARD_DISPLAY_POSES,
  PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES,
  assertNever,
  type CardDisplayPose,
  type CardFormat,
  type ProductImageStudioAssetRole,
  type ProductImageStudioOutputType,
} from "./types";

export type ProductImageStudioOutputContract = {
  readonly outputType: ProductImageStudioOutputType;
  readonly label: string;
  readonly includesCard: boolean;
  readonly includesEnvelope: boolean;
  readonly includesSealSticker: boolean;
  readonly supportsCardPose: boolean;
};

export type CardFormatAssetRoleContract = {
  readonly cardFormat: CardFormat;
  readonly required: readonly ProductImageStudioAssetRole[];
  readonly optional: readonly ProductImageStudioAssetRole[];
};

const CARD_SET_OUTPUT_CONTRACTS = [
  {
    outputType: "set_combined",
    label: "세트컷",
    includesCard: true,
    includesEnvelope: true,
    includesSealSticker: true,
    supportsCardPose: true,
  },
  {
    outputType: "card_single",
    label: "카드 단독컷",
    includesCard: true,
    includesEnvelope: false,
    includesSealSticker: false,
    supportsCardPose: true,
  },
  {
    outputType: "envelope_single",
    label: "봉투 단독컷",
    includesCard: false,
    includesEnvelope: true,
    includesSealSticker: false,
    supportsCardPose: false,
  },
  {
    outputType: "seal_sticker_single",
    label: "봉합스티커 단독컷",
    includesCard: false,
    includesEnvelope: false,
    includesSealSticker: true,
    supportsCardPose: false,
  },
] as const satisfies readonly ProductImageStudioOutputContract[];

export function listOutputContracts(): readonly ProductImageStudioOutputContract[] {
  return CARD_SET_OUTPUT_CONTRACTS;
}

export function getAllowedCardPosesForFormat(cardFormat: CardFormat): readonly CardDisplayPose[] {
  switch (cardFormat) {
    case "folded_card":
      return FOLDED_CARD_DISPLAY_POSES;
    case "postcard_flat":
      return POSTCARD_DISPLAY_POSES;
    default:
      return assertNever(cardFormat);
  }
}

export function getAssetRolesForCardFormat(cardFormat: CardFormat): CardFormatAssetRoleContract {
  switch (cardFormat) {
    case "folded_card":
      return {
        cardFormat,
        required: ["folded_card_outer_front"],
        optional: [
          "envelope_front",
          "seal_sticker",
          "folded_card_fold_metadata",
          "folded_card_inner_spread",
          "folded_card_back",
          "envelope_inside_flap",
          "reference_mood",
        ],
      };
    case "postcard_flat":
      return {
        cardFormat,
        required: ["postcard_front"],
        optional: ["envelope_front", "seal_sticker", "postcard_back", "envelope_inside_flap", "reference_mood"],
      };
    default:
      return assertNever(cardFormat);
  }
}

export function isRequiredOutputType(outputType: ProductImageStudioOutputType): boolean {
  return PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES.includes(outputType);
}
