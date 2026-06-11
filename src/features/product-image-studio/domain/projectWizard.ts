import {
  getAllowedCardPosesForFormat,
  getAssetRolesForCardFormat,
  listOutputContracts,
} from "@/features/product-image-studio/domain/outputContracts";
import { getProductImageStudioAvailableOutputs as listProductImageStudioAvailableOutputs } from "@/features/product-image-studio/domain/outputAvailability";
import {
  createDefaultProductImageStudioProductionSettings,
  getProductImageStudioProductionSettingsIssueForAssetRole,
  type ProductImageStudioProductionSettings,
} from "@/features/product-image-studio/domain/productionSettings";
import {
  getProductImageStudioPoseLabel,
  getProductImageStudioUploadSlotLabel,
} from "@/features/product-image-studio/domain/projectWizardLabels";
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
  readonly productionSettings: ProductImageStudioProductionSettings;
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
  readonly productionSettings: ProductImageStudioProductionSettings;
  readonly productType: "card_envelope_seal_set";
  readonly qualityMode: ProductImageStudioQualityMode;
  readonly ratios: readonly ProductImageStudioRatioPreset[];
  readonly requestedCardPoses: readonly CardDisplayPose[];
  readonly requestedOutputs: readonly ProductImageStudioOutputType[];
};

const DEFAULT_RATIOS = ["1:1"] as const satisfies readonly ProductImageStudioRatioPreset[];

export function createInitialProductImageStudioWizardState(): ProductImageStudioWizardState {
  return {
    cardFormat: "folded_card",
    productionSettings: createDefaultProductImageStudioProductionSettings("folded_card"),
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
  return getAllowedCardPosesForFormat(cardFormat).map((pose) => ({ label: getProductImageStudioPoseLabel(pose), pose }));
}

export function getProductImageStudioOutputChoices(): readonly ProductImageStudioOutputChoice[] {
  return listOutputContracts().map((contract) => ({ label: contract.label, outputType: contract.outputType }));
}

export function getProductImageStudioAvailableOutputChoices(
  state: ProductImageStudioWizardState,
): readonly ProductImageStudioOutputChoice[] {
  const availableOutputs = getProductImageStudioAvailableOutputs(state);
  return listOutputContracts()
    .filter((contract) => includesOutput(availableOutputs, contract.outputType))
    .map((contract) => ({ label: contract.label, outputType: contract.outputType }));
}

export function getProductImageStudioAvailableOutputs(
  state: ProductImageStudioWizardState,
): readonly ProductImageStudioOutputType[] {
  return listProductImageStudioAvailableOutputs(state);
}

export function getProductImageStudioUploadBlockReason(
  state: ProductImageStudioWizardState,
  role: ProductImageStudioAssetRole,
): string | null {
  if (state.projectName.trim().length === 0) {
    return "프로젝트 이름을 먼저 입력해 주세요.";
  }
  return getProductImageStudioProductionSettingsIssueForAssetRole(state.productionSettings, role);
}

export function canUploadProductImageStudioAssetRole(
  state: ProductImageStudioWizardState,
  role: ProductImageStudioAssetRole,
): boolean {
  return getProductImageStudioUploadBlockReason(state, role) === null;
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
    productionSettings: createDefaultProductImageStudioProductionSettings(cardFormat),
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

  return getProductImageStudioAvailableOutputs(state).length > 0;
}

export function buildProductImageStudioCreateProjectPayload(
  state: ProductImageStudioWizardState,
): ProductImageStudioCreateProjectPayload {
  return {
    cardFormat: state.cardFormat,
    name: state.projectName.trim(),
    productionSettings: state.productionSettings,
    productType: "card_envelope_seal_set",
    qualityMode: state.qualityMode,
    ratios: state.ratios,
    requestedCardPoses: state.selectedCardPoses,
    requestedOutputs: state.requestedOutputs,
  };
}

function toUploadSlot(role: ProductImageStudioAssetRole, required: boolean): ProductImageStudioUploadSlot {
  const label = getProductImageStudioUploadSlotLabel(role);
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

function includesOutput(
  outputs: readonly ProductImageStudioOutputType[],
  outputType: ProductImageStudioOutputType,
): boolean {
  return outputs.some((candidate) => candidate === outputType);
}
