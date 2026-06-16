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
import { assertNever } from "@/features/product-image-studio/domain/types";
import type { ProductImageStudioSpecItem, ProductImageStudioSpecSet } from "./specLibrary";

type CreateProductImageStudioProductionPresetFromSpecSetInput = {
  readonly createdAt: string;
  readonly id: string;
  readonly items: readonly ProductImageStudioSpecItem[];
  readonly set: ProductImageStudioSpecSet;
};

type ProductImageStudioSpecLibraryFlatCard =
  | Extract<ProductImageStudioSpecItem, { readonly type: "postcard" }>
  | Extract<ProductImageStudioSpecItem, { readonly type: "business_card" }>;

type ProductImageStudioSpecLibraryCard =
  | {
      readonly cardFormat: "postcard_flat";
      readonly item: ProductImageStudioSpecLibraryFlatCard;
    }
  | {
      readonly cardFormat: "folded_card";
      readonly item: Extract<ProductImageStudioSpecItem, { readonly type: "folded_card" }>;
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
  const cardSettings = createCardSpecFromDefaults(settings.card, card);
  if (!cardSettings) {
    return null;
  }
  const envelope = getFirstEnvelopeSpec(setItems);
  const sealSticker = getFirstSealStickerSpec(setItems);
  return createProductImageStudioProductionSettingsPreset({
    cardFormat: card.cardFormat,
    createdAt,
    id,
    name: set.name,
    settings: {
      ...settings,
      card: cardSettings,
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
): ProductImageStudioSpecLibraryCard | null {
  for (const item of items) {
    switch (item.type) {
      case "postcard":
      case "business_card":
        return {
          cardFormat: "postcard_flat",
          item,
        };
      case "folded_card":
        return {
          cardFormat: "folded_card",
          item,
        };
      case "envelope":
      case "sticker":
        break;
    }
  }
  return null;
}

function createCardSpecFromDefaults(
  defaultCard: ProductImageStudioCardSpec,
  card: ProductImageStudioSpecLibraryCard,
): ProductImageStudioCardSpec | null {
  switch (card.cardFormat) {
    case "postcard_flat":
      return defaultCard.format === "postcard_flat" ? { ...defaultCard, sizeMm: card.item.sizeMm } : null;
    case "folded_card":
      return defaultCard.format === "folded_card"
        ? {
            ...defaultCard,
            foldedSizeMm: card.item.foldedSizeMm,
            foldDirection: card.item.foldDirection,
            openSizeMm: card.item.openSizeMm,
          }
        : null;
    default:
      return assertNever(card);
  }
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
