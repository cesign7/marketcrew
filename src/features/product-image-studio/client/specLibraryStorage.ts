import {
  createProductImageStudioSpecItem,
  createProductImageStudioSpecSet,
  PRODUCT_IMAGE_STUDIO_SPEC_ITEM_TYPES,
  type ProductImageStudioEnvelopeFlapStyle,
  type ProductImageStudioPaperFinish,
  type ProductImageStudioPrintSides,
  type ProductImageStudioSpecItem,
  type ProductImageStudioSpecItemType,
  type ProductImageStudioSpecSet,
} from "@/features/product-image-studio/domain/specLibrary";
import type { ProductImageStudioSizeMm } from "@/features/product-image-studio/domain/productionSettings";

export const PRODUCT_IMAGE_STUDIO_SPEC_LIBRARY_STORAGE_KEY = "marketcrew.productImageStudio.specLibrary.v1";

export type ProductImageStudioSpecLibraryStore = {
  readonly items: readonly ProductImageStudioSpecItem[];
  readonly sets: readonly ProductImageStudioSpecSet[];
};

type ProductImageStudioSpecLibraryStorageReader = {
  readonly getItem: (key: string) => string | null;
};

type ProductImageStudioSpecLibraryStorageWriter = ProductImageStudioSpecLibraryStorageReader & {
  readonly setItem: (key: string, value: string) => void;
};

export function readProductImageStudioSpecLibraryFromStorage(
  storage: ProductImageStudioSpecLibraryStorageReader,
): ProductImageStudioSpecLibraryStore {
  const value = parseStoredValue(storage.getItem(PRODUCT_IMAGE_STUDIO_SPEC_LIBRARY_STORAGE_KEY));
  if (!isRecord(value)) {
    return { items: [], sets: [] };
  }
  return {
    items: readItems(value["items"]),
    sets: readSets(value["sets"]),
  };
}

export function writeProductImageStudioSpecLibraryToStorage(
  storage: ProductImageStudioSpecLibraryStorageWriter,
  store: ProductImageStudioSpecLibraryStore,
): boolean {
  try {
    storage.setItem(PRODUCT_IMAGE_STUDIO_SPEC_LIBRARY_STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }
    throw error;
  }
}

function readItems(value: unknown): readonly ProductImageStudioSpecItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: ProductImageStudioSpecItem[] = [];
  for (const item of value) {
    const specItem = readItem(item);
    if (specItem) {
      items.push(specItem);
    }
  }
  return items;
}

function readSets(value: unknown): readonly ProductImageStudioSpecSet[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const sets: ProductImageStudioSpecSet[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const id = readString(item["id"]);
    const name = readString(item["name"]);
    const createdAt = readString(item["createdAt"]);
    if (!id || !name || !createdAt || !Array.isArray(item["itemIds"])) {
      continue;
    }
    sets.push(createProductImageStudioSpecSet({ createdAt, id, itemIds: readStringArray(item["itemIds"]), name }));
  }
  return sets;
}

function readItem(value: unknown): ProductImageStudioSpecItem | null {
  if (!isRecord(value)) {
    return null;
  }
  const base = readItemBase(value);
  const type = readSpecItemType(value["type"]);
  if (!base || !type) {
    return null;
  }
  return readTypedItem(base, type, value);
}

function readTypedItem(
  base: { readonly createdAt: string; readonly id: string; readonly name: string },
  type: ProductImageStudioSpecItemType,
  value: Readonly<Record<string, unknown>>,
): ProductImageStudioSpecItem | null {
  switch (type) {
    case "postcard":
      return readPostcard(base, value);
    case "folded_card":
      return readFoldedCard(base, value);
    case "envelope":
      return readEnvelope(base, value);
    case "sticker":
      return readSticker(base, value);
    case "business_card":
      return readBusinessCard(base, value);
  }
}

function readPostcard(
  base: { readonly createdAt: string; readonly id: string; readonly name: string },
  value: Readonly<Record<string, unknown>>,
): ProductImageStudioSpecItem | null {
  const sizeMm = readSize(value["sizeMm"]);
  const paperFinish = readPaperFinish(value["paperFinish"]);
  const paperWeightGsm = readNumber(value["paperWeightGsm"]);
  const sides = readSides(value["sides"]);
  return sizeMm && paperFinish && paperWeightGsm !== null && sides
    ? createProductImageStudioSpecItem({ ...base, paperFinish, paperWeightGsm, sides, sizeMm, type: "postcard" })
    : null;
}

function readFoldedCard(
  base: { readonly createdAt: string; readonly id: string; readonly name: string },
  value: Readonly<Record<string, unknown>>,
): ProductImageStudioSpecItem | null {
  const foldedSizeMm = readSize(value["foldedSizeMm"]);
  const openSizeMm = readSize(value["openSizeMm"]);
  const paperFinish = readPaperFinish(value["paperFinish"]);
  const paperWeightGsm = readNumber(value["paperWeightGsm"]);
  const foldDirection = value["foldDirection"] === "top_fold" ? "top_fold" : "left_fold";
  return foldedSizeMm && openSizeMm && paperFinish && paperWeightGsm !== null
    ? createProductImageStudioSpecItem({
        ...base,
        foldedSizeMm,
        foldDirection,
        openSizeMm,
        paperFinish,
        paperWeightGsm,
        type: "folded_card",
      })
    : null;
}

function readEnvelope(
  base: { readonly createdAt: string; readonly id: string; readonly name: string },
  value: Readonly<Record<string, unknown>>,
): ProductImageStudioSpecItem | null {
  const sizeMm = readSize(value["sizeMm"]);
  const flapStyle = readFlapStyle(value["flapStyle"]);
  const flapDirection = value["flapDirection"] === "side_flap" ? "side_flap" : "top_flap";
  return sizeMm && flapStyle
    ? createProductImageStudioSpecItem({ ...base, flapDirection, flapStyle, sizeMm, type: "envelope" })
    : null;
}

function readSticker(
  base: { readonly createdAt: string; readonly id: string; readonly name: string },
  value: Readonly<Record<string, unknown>>,
): ProductImageStudioSpecItem | null {
  const placement = value["placement"] === "envelope_corner" || value["placement"] === "cylindrical_surface"
    ? value["placement"]
    : "envelope_flap_center";
  if (value["shape"] === "rectangle") {
    const sizeMm = readSize(value["sizeMm"]);
    return sizeMm ? createProductImageStudioSpecItem({ ...base, placement, shape: "rectangle", sizeMm, type: "sticker" }) : null;
  }
  const diameter = isRecord(value["sizeMm"]) ? readNumber(value["sizeMm"]["diameter"]) : null;
  return diameter !== null
    ? createProductImageStudioSpecItem({ ...base, placement, shape: "circle", sizeMm: { diameter }, type: "sticker" })
    : null;
}

function readBusinessCard(
  base: { readonly createdAt: string; readonly id: string; readonly name: string },
  value: Readonly<Record<string, unknown>>,
): ProductImageStudioSpecItem | null {
  const sizeMm = readSize(value["sizeMm"]);
  const sides = readSides(value["sides"]);
  return sizeMm && sides
    ? createProductImageStudioSpecItem({ ...base, sides, sizeMm, type: "business_card" })
    : null;
}

function readItemBase(
  value: Readonly<Record<string, unknown>>,
): { readonly createdAt: string; readonly id: string; readonly name: string } | null {
  const id = readString(value["id"]);
  const name = readString(value["name"]);
  const createdAt = readString(value["createdAt"]);
  return id && name && createdAt ? { createdAt, id, name } : null;
}

function parseStoredValue(storedValue: string | null): unknown {
  if (!storedValue) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(storedValue);
    return value;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

function readSpecItemType(value: unknown): ProductImageStudioSpecItemType | null {
  return typeof value === "string" ? PRODUCT_IMAGE_STUDIO_SPEC_ITEM_TYPES.find((candidate) => candidate === value) ?? null : null;
}

function readSize(value: unknown): ProductImageStudioSizeMm | null {
  if (!isRecord(value)) {
    return null;
  }
  const height = readNumber(value["height"]);
  const width = readNumber(value["width"]);
  return height !== null && width !== null ? { height, width } : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readStringArray(value: readonly unknown[]): readonly string[] {
  return value.filter((item) => typeof item === "string");
}

function readPaperFinish(value: unknown): ProductImageStudioPaperFinish | null {
  return value === "glossy" || value === "textured" || value === "matte" ? value : null;
}

function readSides(value: unknown): ProductImageStudioPrintSides | null {
  return value === "front_only" || value === "front_back" ? value : null;
}

function readFlapStyle(value: unknown): ProductImageStudioEnvelopeFlapStyle | null {
  return value === "jacket" || value === "square" ? value : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
