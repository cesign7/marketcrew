import type { ProductImageStudioMaterialRecord } from "@/features/product-image-studio/domain/materialLibrary";
import { createDefaultProductImageStudioProductionSettings } from "@/features/product-image-studio/domain/productionSettings";
import { applyProductImageStudioProductionSettingsPreset } from "@/features/product-image-studio/domain/productionSettingsPresets";
import type { ProductImageStudioSpecItem, ProductImageStudioSpecSet } from "@/features/product-image-studio/domain/specLibrary";
import { createProductImageStudioProductionPresetFromSpecSet } from "@/features/product-image-studio/domain/specLibraryToProductionPreset";
import {
  changeProductImageStudioCardFormat,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";

export function applyProductImageStudioSpecItemToStagingState(
  state: ProductImageStudioWizardState,
  item: ProductImageStudioSpecItem,
): ProductImageStudioWizardState {
  switch (item.type) {
    case "folded_card":
      return applyFoldedCardSpec(state, item);
    case "postcard":
      return applyFlatCardSpec(state, item.sizeMm);
    case "business_card":
      return applyFlatCardSpec(state, item.sizeMm);
    case "envelope":
      return {
        ...state,
        productionSettings: {
          ...state.productionSettings,
          envelope: { flapDirection: item.flapDirection, sizeMm: item.sizeMm },
        },
      };
    case "sticker":
      if ("diameter" in item.sizeMm) {
        return {
          ...state,
          productionSettings: {
            ...state.productionSettings,
            sealSticker: { placement: item.placement, shape: "circle", sizeMm: item.sizeMm },
          },
        };
      }
      return {
        ...state,
        productionSettings: {
          ...state.productionSettings,
          sealSticker: { placement: item.placement, shape: "rectangle", sizeMm: item.sizeMm },
        },
      };
  }
}

export function applyProductImageStudioSpecSetToStagingState(
  state: ProductImageStudioWizardState,
  items: readonly ProductImageStudioSpecItem[],
  set: ProductImageStudioSpecSet,
): ProductImageStudioWizardState {
  const preset = createProductImageStudioProductionPresetFromSpecSet({
    createdAt: set.createdAt,
    id: `staging-${set.id}`,
    items,
    set,
  });
  return preset ? applyProductImageStudioProductionSettingsPreset(state, preset) : state;
}

export function applyProductImageStudioMaterialToStagingState(
  state: ProductImageStudioWizardState,
  material: ProductImageStudioMaterialRecord,
): ProductImageStudioWizardState {
  const paperFinish = getPaperFinish(material.surface);
  const paperWeightGsm = material.thickness.unit === "gsm" ? material.thickness.value : state.productionSettings.card.paperWeightGsm;
  return {
    ...state,
    productionSettings: {
      ...state.productionSettings,
      card: { ...state.productionSettings.card, paperFinish, paperWeightGsm },
    },
  };
}

function applyFoldedCardSpec(
  state: ProductImageStudioWizardState,
  item: Extract<ProductImageStudioSpecItem, { readonly type: "folded_card" }>,
): ProductImageStudioWizardState {
  const cardState = state.cardFormat === "folded_card" ? state : changeProductImageStudioCardFormat(state, "folded_card");
  const defaults = createDefaultProductImageStudioProductionSettings("folded_card");
  const card = {
    ...defaults.card,
    foldedSizeMm: item.foldedSizeMm,
    foldDirection: item.foldDirection,
    openSizeMm: item.openSizeMm,
  };
  return { ...cardState, productionSettings: { ...cardState.productionSettings, card } };
}

function applyFlatCardSpec(
  state: ProductImageStudioWizardState,
  sizeMm: { readonly height: number; readonly width: number },
): ProductImageStudioWizardState {
  const cardState = state.cardFormat === "postcard_flat" ? state : changeProductImageStudioCardFormat(state, "postcard_flat");
  const defaults = createDefaultProductImageStudioProductionSettings("postcard_flat");
  if (defaults.card.format !== "postcard_flat") {
    return cardState;
  }
  return {
    ...cardState,
    productionSettings: {
      ...cardState.productionSettings,
      card: { ...defaults.card, sizeMm },
    },
  };
}

function getPaperFinish(surface: string): "glossy" | "matte" | "textured" {
  const normalized = surface.toLowerCase();
  if (normalized.includes("유광") || normalized.includes("gloss")) {
    return "glossy";
  }
  if (normalized.includes("질감") || normalized.includes("textured") || normalized.includes("linen")) {
    return "textured";
  }
  return "matte";
}
