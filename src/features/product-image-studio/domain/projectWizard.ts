import {
  getAllowedCardPosesForFormat,
  getAssetRolesForCardFormat,
  listOutputContracts,
} from "@/features/product-image-studio/domain/outputContracts";
import {
  PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES,
  type CardDisplayPose,
  type CardFormat,
  type ProductImageStudioAssetRole,
  type ProductImageStudioOutputType,
  type ProductImageStudioQualityMode,
  type ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";

export type ProductImageStudioWizardState = {
  readonly cardFormat: CardFormat;
  readonly projectName: string;
  readonly qualityMode: ProductImageStudioQualityMode;
  readonly ratios: readonly ProductImageStudioRatioPreset[];
  readonly requestedOutputs: readonly ProductImageStudioOutputType[];
  readonly selectedCardPoses: readonly CardDisplayPose[];
  readonly uploadedRoles: readonly ProductImageStudioAssetRole[];
};

export type ProductImageStudioUploadSlot = {
  readonly helper: string;
  readonly label: string;
  readonly required: boolean;
  readonly role: ProductImageStudioAssetRole;
};

export type ProductImageStudioPoseOption = {
  readonly label: string;
  readonly pose: CardDisplayPose;
};

export type ProductImageStudioOutputChoice = {
  readonly label: string;
  readonly outputType: ProductImageStudioOutputType;
};

export type ProductImageStudioCreateProjectPayload = {
  readonly cardFormat: CardFormat;
  readonly name: string;
  readonly productType: "card_envelope_seal_set";
  readonly qualityMode: ProductImageStudioQualityMode;
  readonly ratios: readonly ProductImageStudioRatioPreset[];
  readonly requestedCardPoses: readonly CardDisplayPose[];
  readonly requestedOutputs: readonly ProductImageStudioOutputType[];
};

const DEFAULT_RATIOS = ["1:1"] as const satisfies readonly ProductImageStudioRatioPreset[];

const UPLOAD_SLOT_LABELS = {
  envelope_front: {
    helper: "봉투 앞면 디자인이나 완성 이미지를 올려 주세요.",
    label: "봉투 앞면",
  },
  envelope_inside_flap: {
    helper: "봉투 안쪽 플랩이 중요한 상품일 때만 추가합니다.",
    label: "봉투 안쪽 플랩",
  },
  folded_card_back: {
    helper: "뒷면 인쇄가 있는 접이식 카드라면 추가합니다.",
    label: "접이식 카드 뒷면",
  },
  folded_card_fold_metadata: {
    helper: "접히는 방향이나 기준선을 보여주는 이미지를 올려 주세요.",
    label: "접는 위치 참고",
  },
  folded_card_inner_spread: {
    helper: "펼친 안쪽 면이 필요한 상품일 때 추가합니다.",
    label: "접이식 카드 안쪽 펼침면",
  },
  folded_card_outer_front: {
    helper: "접이식 카드의 대표 앞면 디자인을 올려 주세요.",
    label: "접이식 카드 앞면",
  },
  postcard_back: {
    helper: "엽서 뒷면 인쇄가 있을 때 추가합니다.",
    label: "엽서 뒷면",
  },
  postcard_front: {
    helper: "접히지 않는 엽서형 카드의 앞면 디자인을 올려 주세요.",
    label: "엽서 앞면",
  },
  reference_mood: {
    helper: "원하는 분위기나 비슷한 촬영 느낌을 참고용으로 올립니다.",
    label: "참고 분위기 이미지",
  },
  seal_sticker: {
    helper: "봉합스티커 디자인 또는 실제 스티커 이미지를 올려 주세요.",
    label: "봉합스티커",
  },
} as const satisfies Record<ProductImageStudioAssetRole, { readonly helper: string; readonly label: string }>;

const POSE_LABELS = {
  folded_closed: "접은 카드 닫힌 컷",
  folded_half_open: "접이식 카드 반쯤 열린 컷",
  folded_open_spread: "접이식 카드 펼친 컷",
  folded_standing: "접이식 카드 세운 컷",
  postcard_back_flat: "엽서 뒷면 평면컷",
  postcard_front_flat: "엽서 앞면 평면컷",
  postcard_lifestyle_stack: "엽서 생활형 겹침컷",
} as const satisfies Record<CardDisplayPose, string>;

export function createInitialProductImageStudioWizardState(): ProductImageStudioWizardState {
  return {
    cardFormat: "folded_card",
    projectName: "",
    qualityMode: "draft",
    ratios: DEFAULT_RATIOS,
    requestedOutputs: PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES,
    selectedCardPoses: ["folded_closed", "folded_open_spread"],
    uploadedRoles: [],
  };
}

export function getProductImageStudioUploadSlots(
  state: ProductImageStudioWizardState,
): readonly ProductImageStudioUploadSlot[] {
  const contract = getAssetRolesForCardFormat(state.cardFormat);
  return [...contract.required.map((role) => toUploadSlot(role, true)), ...contract.optional.map((role) => toUploadSlot(role, false))];
}

export function getProductImageStudioPoseOptions(cardFormat: CardFormat): readonly ProductImageStudioPoseOption[] {
  return getAllowedCardPosesForFormat(cardFormat).map((pose) => ({ label: POSE_LABELS[pose], pose }));
}

export function getProductImageStudioOutputChoices(): readonly ProductImageStudioOutputChoice[] {
  return listOutputContracts().map((contract) => ({ label: contract.label, outputType: contract.outputType }));
}

export function changeProductImageStudioCardFormat(
  state: ProductImageStudioWizardState,
  cardFormat: CardFormat,
): ProductImageStudioWizardState {
  const allowedRoles = getAssetRolesForCardFormat(cardFormat);
  const allowedUploadedRoles = state.uploadedRoles.filter(
    (role) => includesRole(allowedRoles.required, role) || includesRole(allowedRoles.optional, role),
  );

  return {
    ...state,
    cardFormat,
    selectedCardPoses: getDefaultPoses(cardFormat),
    uploadedRoles: allowedUploadedRoles,
  };
}

export function recordProductImageStudioUploadedRole(
  state: ProductImageStudioWizardState,
  role: ProductImageStudioAssetRole,
): ProductImageStudioWizardState {
  if (includesRole(state.uploadedRoles, role)) {
    return state;
  }

  return { ...state, uploadedRoles: [...state.uploadedRoles, role] };
}

export function setProductImageStudioProjectName(
  state: ProductImageStudioWizardState,
  projectName: string,
): ProductImageStudioWizardState {
  return { ...state, projectName };
}

export function setProductImageStudioQualityMode(
  state: ProductImageStudioWizardState,
  qualityMode: ProductImageStudioQualityMode,
): ProductImageStudioWizardState {
  return { ...state, qualityMode };
}

export function toggleProductImageStudioPose(
  state: ProductImageStudioWizardState,
  pose: CardDisplayPose,
): ProductImageStudioWizardState {
  const isSelected = state.selectedCardPoses.some((selectedPose) => selectedPose === pose);
  if (isSelected && state.selectedCardPoses.length === 1) {
    return state;
  }

  return {
    ...state,
    selectedCardPoses: isSelected
      ? state.selectedCardPoses.filter((selectedPose) => selectedPose !== pose)
      : [...state.selectedCardPoses, pose],
  };
}

export function toggleProductImageStudioOutput(
  state: ProductImageStudioWizardState,
  outputType: ProductImageStudioOutputType,
): ProductImageStudioWizardState {
  const isSelected = state.requestedOutputs.some((selectedOutputType) => selectedOutputType === outputType);
  return {
    ...state,
    requestedOutputs: isSelected
      ? state.requestedOutputs.filter((selectedOutputType) => selectedOutputType !== outputType)
      : [...state.requestedOutputs, outputType],
  };
}

export function canRequestProductImageStudioConcepts(state: ProductImageStudioWizardState): boolean {
  if (state.projectName.trim().length === 0) {
    return false;
  }

  const requiredRoles = getAssetRolesForCardFormat(state.cardFormat).required;
  return requiredRoles.every((role) => includesRole(state.uploadedRoles, role));
}

export function buildProductImageStudioCreateProjectPayload(
  state: ProductImageStudioWizardState,
): ProductImageStudioCreateProjectPayload {
  return {
    cardFormat: state.cardFormat,
    name: state.projectName.trim(),
    productType: "card_envelope_seal_set",
    qualityMode: state.qualityMode,
    ratios: state.ratios,
    requestedCardPoses: state.selectedCardPoses,
    requestedOutputs: state.requestedOutputs,
  };
}

function toUploadSlot(role: ProductImageStudioAssetRole, required: boolean): ProductImageStudioUploadSlot {
  const label = UPLOAD_SLOT_LABELS[role];
  return { helper: label.helper, label: label.label, required, role };
}

function getDefaultPoses(cardFormat: CardFormat): readonly CardDisplayPose[] {
  switch (cardFormat) {
    case "folded_card":
      return ["folded_closed", "folded_open_spread"];
    case "postcard_flat":
      return ["postcard_front_flat"];
  }
}

function includesRole(roles: readonly ProductImageStudioAssetRole[], role: ProductImageStudioAssetRole): boolean {
  return roles.some((candidate) => candidate === role);
}
