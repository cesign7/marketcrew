import {
  assertNever,
  type CardDisplayPose,
  type CardFormat,
  type ProductImageStudioOutputType,
} from "./types";

export type CardPoseSceneRule = {
  readonly cardFormat: CardFormat;
  readonly pose: CardDisplayPose;
  readonly label: string;
  readonly geometryPrompt: string;
  readonly allowedOutputTypes: readonly ProductImageStudioOutputType[];
  readonly showsInsideArtwork: boolean;
};

const CARD_POSE_SCENE_RULES = [
  {
    cardFormat: "folded_card",
    pose: "folded_closed",
    label: "접이식 카드 - 닫힌 컷",
    geometryPrompt: "closed folded card with visible paper thickness, crease shadow, and natural tabletop perspective",
    allowedOutputTypes: ["set_combined", "card_single"],
    showsInsideArtwork: false,
  },
  {
    cardFormat: "folded_card",
    pose: "folded_open_spread",
    label: "접이식 카드 - 펼친 컷",
    geometryPrompt: "open folded card spread with a clear crease axis, realistic inner paper plane, and soft fold shadow",
    allowedOutputTypes: ["set_combined", "card_single"],
    showsInsideArtwork: true,
  },
  {
    cardFormat: "folded_card",
    pose: "folded_half_open",
    label: "접이식 카드 - 반열림 컷",
    geometryPrompt: "half-open folded card standing at a natural angle with visible front plane and inner fold shadow",
    allowedOutputTypes: ["set_combined", "card_single"],
    showsInsideArtwork: true,
  },
  {
    cardFormat: "folded_card",
    pose: "folded_standing",
    label: "접이식 카드 - 세움 컷",
    geometryPrompt: "folded greeting card standing upright with balanced weight, paper thickness, and realistic contact shadow",
    allowedOutputTypes: ["set_combined", "card_single"],
    showsInsideArtwork: false,
  },
  {
    cardFormat: "postcard_flat",
    pose: "postcard_front_flat",
    label: "엽서형 카드 - 앞면 컷",
    geometryPrompt: "flat postcard front on a tabletop without any crease, fold line, or inner spread",
    allowedOutputTypes: ["set_combined", "card_single"],
    showsInsideArtwork: false,
  },
  {
    cardFormat: "postcard_flat",
    pose: "postcard_back_flat",
    label: "엽서형 카드 - 뒷면 컷",
    geometryPrompt: "flat postcard back view with realistic paper edge and no folded-card geometry",
    allowedOutputTypes: ["card_single"],
    showsInsideArtwork: false,
  },
  {
    cardFormat: "postcard_flat",
    pose: "postcard_lifestyle_stack",
    label: "엽서형 카드 - 여러 장 컷",
    geometryPrompt: "small stack of flat postcards with visible paper edges and no fold crease",
    allowedOutputTypes: ["set_combined", "card_single"],
    showsInsideArtwork: false,
  },
] as const satisfies readonly CardPoseSceneRule[];

export function listCardPoseSceneRules(): readonly CardPoseSceneRule[] {
  return CARD_POSE_SCENE_RULES;
}

export function getCardPoseSceneRulesForFormat(cardFormat: CardFormat): readonly CardPoseSceneRule[] {
  switch (cardFormat) {
    case "folded_card":
    case "postcard_flat":
      return CARD_POSE_SCENE_RULES.filter((rule) => rule.cardFormat === cardFormat);
    default:
      return assertNever(cardFormat);
  }
}
