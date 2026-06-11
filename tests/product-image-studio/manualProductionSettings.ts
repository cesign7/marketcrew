import {
  createDefaultProductImageStudioProductionSettings,
  type ProductImageStudioProductionSettings,
} from "@/features/product-image-studio/domain/productionSettings";
import type { CardFormat } from "@/features/product-image-studio/domain/types";

export function manualProductionSettings(cardFormat: "folded_card"): ProductImageStudioProductionSettings;
export function manualProductionSettings(cardFormat: "postcard_flat"): ProductImageStudioProductionSettings;
export function manualProductionSettings(cardFormat: CardFormat): ProductImageStudioProductionSettings;
export function manualProductionSettings(cardFormat: CardFormat): ProductImageStudioProductionSettings {
  const settings = createDefaultProductImageStudioProductionSettings(cardFormat);
  if (settings.card.format === "folded_card") {
    return {
      ...settings,
      card: {
        ...settings.card,
        foldedSizeMm: { height: 150, width: 100 },
        openSizeMm: { height: 150, width: 200 },
      },
      envelope: { ...settings.envelope, sizeMm: { height: 160, width: 110 } },
      sealSticker: { placement: "envelope_flap_center", shape: "circle", sizeMm: { diameter: 35 } },
    };
  }

  return {
    ...settings,
    card: { ...settings.card, sizeMm: { height: 150, width: 100 } },
    envelope: { ...settings.envelope, sizeMm: { height: 160, width: 110 } },
    sealSticker: { placement: "envelope_flap_center", shape: "circle", sizeMm: { diameter: 35 } },
  };
}

export function manualCardOnlyProductionSettings(): ProductImageStudioProductionSettings {
  const settings = createDefaultProductImageStudioProductionSettings("folded_card");
  if (settings.card.format !== "folded_card") {
    throw new Error("folded settings expected");
  }
  return {
    ...settings,
    card: {
      ...settings.card,
      foldedSizeMm: { height: 150, width: 100 },
      openSizeMm: { height: 150, width: 200 },
    },
  };
}
