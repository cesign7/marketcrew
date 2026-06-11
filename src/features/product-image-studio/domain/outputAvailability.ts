import { listOutputContracts } from "@/features/product-image-studio/domain/outputContracts";
import {
  isProductImageStudioProductionSettingsReadyForOutput,
  type ProductImageStudioProductionSettings,
} from "@/features/product-image-studio/domain/productionSettings";
import type {
  CardFormat,
  ProductImageStudioAssetRole,
  ProductImageStudioOutputType,
} from "@/features/product-image-studio/domain/types";

export type ProductImageStudioOutputAvailabilityInput = {
  readonly cardFormat: CardFormat;
  readonly productionSettings: ProductImageStudioProductionSettings;
  readonly requestedOutputs: readonly ProductImageStudioOutputType[];
  readonly uploadedRoles: readonly ProductImageStudioAssetRole[];
};

export function getProductImageStudioAvailableOutputs(
  input: ProductImageStudioOutputAvailabilityInput,
): readonly ProductImageStudioOutputType[] {
  return listOutputContracts()
    .map((contract) => contract.outputType)
    .filter((outputType) => isOutputAvailable(input, outputType));
}

function isOutputAvailable(
  input: ProductImageStudioOutputAvailabilityInput,
  outputType: ProductImageStudioOutputType,
): boolean {
  if (!hasOutput(input.requestedOutputs, outputType)) {
    return false;
  }
  if (!isProductImageStudioProductionSettingsReadyForOutput(input.productionSettings, outputType)) {
    return false;
  }
  switch (outputType) {
    case "set_combined":
      return hasCardAsset(input) && hasEnvelopeAsset(input) && hasSealStickerAsset(input);
    case "card_single":
      return hasCardAsset(input);
    case "envelope_single":
      return hasEnvelopeAsset(input);
    case "seal_sticker_single":
      return hasSealStickerAsset(input);
  }
}

function hasCardAsset(input: ProductImageStudioOutputAvailabilityInput): boolean {
  return input.cardFormat === "folded_card"
    ? hasRole(input.uploadedRoles, "folded_card_outer_front")
    : hasRole(input.uploadedRoles, "postcard_front");
}

function hasEnvelopeAsset(input: ProductImageStudioOutputAvailabilityInput): boolean {
  return hasRole(input.uploadedRoles, "envelope_front");
}

function hasSealStickerAsset(input: ProductImageStudioOutputAvailabilityInput): boolean {
  return hasRole(input.uploadedRoles, "seal_sticker");
}

function hasRole(roles: readonly ProductImageStudioAssetRole[], role: ProductImageStudioAssetRole): boolean {
  return roles.some((candidate) => candidate === role);
}

function hasOutput(
  outputs: readonly ProductImageStudioOutputType[],
  outputType: ProductImageStudioOutputType,
): boolean {
  return outputs.some((candidate) => candidate === outputType);
}
