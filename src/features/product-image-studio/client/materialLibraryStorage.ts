import {
  parseProductImageStudioMaterialRecord,
  type ProductImageStudioMaterialRecord,
} from "@/features/product-image-studio/domain/materialLibrary";

export const PRODUCT_IMAGE_STUDIO_MATERIAL_LIBRARY_STORAGE_KEY = "marketcrew.productImageStudio.materialLibrary.v1";

type ProductImageStudioMaterialLibraryStorageReader = {
  readonly getItem: (key: string) => string | null;
};

type ProductImageStudioMaterialLibraryStorageWriter = ProductImageStudioMaterialLibraryStorageReader & {
  readonly setItem: (key: string, value: string) => void;
};

export function readProductImageStudioMaterialLibraryFromStorage(
  storage: ProductImageStudioMaterialLibraryStorageReader,
): readonly ProductImageStudioMaterialRecord[] {
  let storedValue: string | null;
  try {
    storedValue = storage.getItem(PRODUCT_IMAGE_STUDIO_MATERIAL_LIBRARY_STORAGE_KEY);
  } catch (error) {
    if (error instanceof Error) {
      return [];
    }
    throw error;
  }
  return readStoredMaterials(storedValue);
}

export function writeProductImageStudioMaterialLibraryToStorage(
  storage: ProductImageStudioMaterialLibraryStorageWriter,
  materials: readonly ProductImageStudioMaterialRecord[],
): boolean {
  try {
    storage.setItem(PRODUCT_IMAGE_STUDIO_MATERIAL_LIBRARY_STORAGE_KEY, JSON.stringify(materials));
    return true;
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }
    throw error;
  }
}

function readStoredMaterials(storedValue: string | null): readonly ProductImageStudioMaterialRecord[] {
  const value = parseStoredValue(storedValue);
  if (!Array.isArray(value)) {
    return [];
  }
  const materials: ProductImageStudioMaterialRecord[] = [];
  for (const item of value) {
    const material = parseProductImageStudioMaterialRecord(item);
    if (!material) {
      return [];
    }
    materials.push(material);
  }
  return materials;
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
