import { parseProductImageStudioProductionSettings, type ProductImageStudioProductionSettings } from "@/features/product-image-studio/domain/productionSettings";
import {
  getDefaultProductImageStudioCardPoses,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import { CARD_FORMATS, type CardFormat } from "@/features/product-image-studio/domain/types";

export type ProductImageStudioProductionSettingsPreset = {
  readonly cardFormat: CardFormat;
  readonly createdAt: string;
  readonly id: string;
  readonly name: string;
  readonly settings: ProductImageStudioProductionSettings;
};

export type CreateProductImageStudioProductionSettingsPresetInput = {
  readonly cardFormat: CardFormat;
  readonly createdAt: string;
  readonly id: string;
  readonly name: string;
  readonly settings: ProductImageStudioProductionSettings;
};

export function createProductImageStudioProductionSettingsPreset(
  input: CreateProductImageStudioProductionSettingsPresetInput,
): ProductImageStudioProductionSettingsPreset {
  return {
    cardFormat: input.cardFormat,
    createdAt: input.createdAt,
    id: input.id,
    name: input.name.trim(),
    settings: input.settings,
  };
}

export function readProductImageStudioProductionSettingsPresets(
  storedValue: unknown,
): readonly ProductImageStudioProductionSettingsPreset[] {
  const value = parseStoredValue(storedValue);
  if (!Array.isArray(value)) {
    return [];
  }

  const presets: ProductImageStudioProductionSettingsPreset[] = [];
  for (const item of value) {
    const preset = readPreset(item);
    if (preset) {
      presets.push(preset);
    }
  }
  return presets;
}

export function upsertProductImageStudioProductionSettingsPreset(
  presets: readonly ProductImageStudioProductionSettingsPreset[],
  preset: ProductImageStudioProductionSettingsPreset,
): readonly ProductImageStudioProductionSettingsPreset[] {
  return [preset, ...presets.filter((candidate) => candidate.id !== preset.id)];
}

export function removeProductImageStudioProductionSettingsPreset(
  presets: readonly ProductImageStudioProductionSettingsPreset[],
  presetId: string,
): readonly ProductImageStudioProductionSettingsPreset[] {
  return presets.filter((candidate) => candidate.id !== presetId);
}

export function applyProductImageStudioProductionSettingsPreset(
  state: ProductImageStudioWizardState,
  preset: ProductImageStudioProductionSettingsPreset,
): ProductImageStudioWizardState {
  const allowedPoses = getDefaultProductImageStudioCardPoses(preset.cardFormat);
  return {
    ...state,
    cardFormat: preset.cardFormat,
    productionSettings: preset.settings,
    selectedCardPoses: allowedPoses,
    uploadedRoles: [],
  };
}

function parseStoredValue(storedValue: unknown): unknown {
  if (typeof storedValue !== "string") {
    return storedValue;
  }
  try {
    return JSON.parse(storedValue);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return [];
    }
    throw error;
  }
}

function readPreset(value: unknown): ProductImageStudioProductionSettingsPreset | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = value["id"];
  const name = value["name"];
  const createdAt = value["createdAt"];
  const cardFormat = readCardFormat(value["cardFormat"]);
  if (typeof id !== "string" || typeof name !== "string" || name.trim().length === 0 || typeof createdAt !== "string" || !cardFormat) {
    return null;
  }

  const settings = parseProductImageStudioProductionSettings(value["settings"], cardFormat);
  if (!settings.ok) {
    return null;
  }
  return { cardFormat, createdAt, id, name: name.trim(), settings: settings.settings };
}

function readCardFormat(value: unknown): CardFormat | null {
  return typeof value === "string" ? CARD_FORMATS.find((candidate) => candidate === value) ?? null : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
