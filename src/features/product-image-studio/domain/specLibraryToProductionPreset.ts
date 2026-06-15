import {
  createDefaultProductImageStudioProductionSettings,
  type ProductImageStudioCardSpec,
  type ProductImageStudioEnvelopeSpec,
  type ProductImageStudioSealStickerSpec,
} from "@/features/product-image-studio/domain/productionSettings";
import {
  createProductImageStudioProductionSettingsPreset,
  type ProductImageStudioProductionSettingsPreset,
} from "@/features/product-image-studio/domain/productionSettingsPresets";
import type { CardFormat } from "@/features/product-image-studio/domain/types";
import type { ProductImageStudioSpecItem, ProductImageStudioSpecSet } from "./specLibrary";

type CreateProductImageStudioProductionPresetFromSpecSetInput = {
  readonly createdAt: string;
  readonly id: string;
  readonly items: readonly ProductImageStudioSpecItem[];
  readonly set: ProductImageStudioSpecSet;
};

export function createProductImageStudioProductionPresetFromSpecSet({
  createdAt,
  id,
  items,
  set,
}: CreateProductImageStudioProductionPresetFromSpecSetInput): ProductImageStudioProductionSettingsPreset | null {
  const setItems = getSetItems(items, set.itemIds);
  const card = getFirstCardSpec(setItems);
  if (!card) {
    return null;
  }
  const settings = createDefaultProductImageStudioProductionSettings(card.cardFormat);
  const envelope = getFirstEnvelopeSpec(setItems);
  const sealSticker = getFirstSealStickerSpec(setItems);
  return createProductImageStudioProductionSettingsPreset({
    cardFormat: card.cardFormat,
    createdAt,
    id,
    name: set.name,
    settings: {
      ...settings,
      card: card.card,
      envelope: envelope ?? settings.envelope,
      sealSticker: sealSticker ?? settings.sealSticker,
    },
  });
}

function getSetItems(
  items: readonly ProductImageStudioSpecItem[],
  itemIds: readonly string[],
): readonly ProductImageStudioSpecItem[] {
  return items.filter((item) => itemIds.some((itemId) => itemId === item.id));
}

function getFirstCardSpec(
  items: readonly ProductImageStudioSpecItem[],
): { readonly card: ProductImageStudioCardSpec; readonly cardFormat: CardFormat } | null {
  for (const item of items) {
    switch (item.type) {
      case "postcard":
        return {
          card: {
            format: "postcard_flat",
            paperFinish: item.paperFinish,
            paperWeightGsm: item.paperWeightGsm,
            sizeMm: item.sizeMm,
          },
          cardFormat: "postcard_flat",
        };
      case "folded_card":
        return {
          card: {
            foldedSizeMm: item.foldedSizeMm,
            foldDirection: item.foldDirection,
            format: "folded_card",
            openSizeMm: item.openSizeMm,
            paperFinish: item.paperFinish,
            paperWeightGsm: item.paperWeightGsm,
          },
          cardFormat: "folded_card",
        };
      case "business_card":
      case "envelope":
      case "sticker":
        break;
    }
  }
  return null;
}

function getFirstEnvelopeSpec(items: readonly ProductImageStudioSpecItem[]): ProductImageStudioEnvelopeSpec | null {
  for (const item of items) {
    if (item.type === "envelope") {
      return { flapDirection: item.flapDirection, sizeMm: item.sizeMm };
    }
  }
  return null;
}

function getFirstSealStickerSpec(items: readonly ProductImageStudioSpecItem[]): ProductImageStudioSealStickerSpec | null {
  for (const item of items) {
    if (item.type === "sticker") {
      return "diameter" in item.sizeMm
        ? { placement: item.placement, shape: "circle", sizeMm: item.sizeMm }
        : { placement: item.placement, shape: "rectangle", sizeMm: item.sizeMm };
    }
  }
  return null;
}
