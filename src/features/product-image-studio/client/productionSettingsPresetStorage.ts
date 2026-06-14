import {
  readProductImageStudioProductionSettingsPresets,
  type ProductImageStudioProductionSettingsPreset,
} from "@/features/product-image-studio/domain/productionSettingsPresets";

export const PRODUCT_IMAGE_STUDIO_PRODUCTION_SETTINGS_PRESET_STORAGE_KEY =
  "marketcrew.productImageStudio.productionSettingsPresets.v1";

type ProductImageStudioPresetStorageReader = {
  readonly getItem: (key: string) => string | null;
};

type ProductImageStudioPresetStorageWriter = ProductImageStudioPresetStorageReader & {
  readonly setItem: (key: string, value: string) => void;
};

export function readProductImageStudioProductionSettingsPresetsFromStorage(
  storage: ProductImageStudioPresetStorageReader,
): readonly ProductImageStudioProductionSettingsPreset[] {
  return readProductImageStudioProductionSettingsPresets(
    storage.getItem(PRODUCT_IMAGE_STUDIO_PRODUCTION_SETTINGS_PRESET_STORAGE_KEY),
  );
}

export function writeProductImageStudioProductionSettingsPresetsToStorage(
  storage: ProductImageStudioPresetStorageWriter,
  presets: readonly ProductImageStudioProductionSettingsPreset[],
): boolean {
  try {
    storage.setItem(PRODUCT_IMAGE_STUDIO_PRODUCTION_SETTINGS_PRESET_STORAGE_KEY, JSON.stringify(presets));
    return true;
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }
    throw error;
  }
}
