import type { CardFormat } from "@/features/product-image-studio/domain/types";
import type { ProductImageStudioProductionSettings } from "@/features/product-image-studio/domain/productionSettingsTypes";

export function createDefaultProductImageStudioProductionSettings(
  cardFormat: CardFormat,
): ProductImageStudioProductionSettings {
  const shared = {
    envelope: {
      flapDirection: "top_flap",
      sizeMm: { height: 0, width: 0 },
    },
    scene: {
      designPreservation: "exact_composite",
      generationMethod: "mockup_composite_first",
      outputPurpose: "smartstore_main",
      shotAngle: "front_45",
    },
    sealSticker: {
      placement: "envelope_flap_center",
      shape: "circle",
      sizeMm: { diameter: 0 },
    },
    specSource: "manual_input",
  } as const;

  switch (cardFormat) {
    case "folded_card":
      return {
        ...shared,
        card: {
          foldDirection: "left_fold",
          foldedSizeMm: { height: 0, width: 0 },
          format: "folded_card",
          openSizeMm: { height: 0, width: 0 },
          paperFinish: "matte",
          paperWeightGsm: 300,
        },
      };
    case "postcard_flat":
      return {
        ...shared,
        card: {
          format: "postcard_flat",
          paperFinish: "matte",
          paperWeightGsm: 260,
          sizeMm: { height: 0, width: 0 },
        },
      };
  }
}
