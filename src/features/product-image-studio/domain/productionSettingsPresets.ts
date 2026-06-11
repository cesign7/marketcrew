import type { CardFormat } from "@/features/product-image-studio/domain/types";
import {
  ProductImageStudioProductionSettingsError,
  type ProductImageStudioProductionSettings,
  type ProductImageStudioSceneProductionSettings,
  type ProductImageStudioSpecPreset,
  type ProductImageStudioSpecPresetId,
} from "@/features/product-image-studio/domain/productionSettingsTypes";

const DEFAULT_SCENE = {
  designPreservation: "exact_composite",
  generationMethod: "mockup_composite_first",
  outputPurpose: "smartstore_main",
  shotAngle: "front_45",
} as const satisfies ProductImageStudioSceneProductionSettings;

const SPEC_PRESETS = [
  {
    id: "folded-100x150-envelope-110x160-seal-35",
    label: "접이식 100x150 + 봉투 110x160",
    settings: {
      card: {
        foldedSizeMm: { height: 150, width: 100 },
        foldDirection: "left_fold",
        format: "folded_card",
        openSizeMm: { height: 150, width: 200 },
        paperFinish: "matte",
        paperWeightGsm: 300,
      },
      envelope: { flapDirection: "top_flap", sizeMm: { height: 160, width: 110 } },
      presetId: "folded-100x150-envelope-110x160-seal-35",
      scene: DEFAULT_SCENE,
      sealSticker: { placement: "envelope_flap_center", shape: "circle", sizeMm: { diameter: 35 } },
    },
    summary: "초대장, 선물카드 세트에 많이 쓰는 기본 비율입니다.",
  },
  {
    id: "folded-127x178-envelope-135x190-seal-40",
    label: "접이식 127x178 + 봉투 135x190",
    settings: {
      card: {
        foldedSizeMm: { height: 178, width: 127 },
        foldDirection: "left_fold",
        format: "folded_card",
        openSizeMm: { height: 178, width: 254 },
        paperFinish: "textured",
        paperWeightGsm: 300,
      },
      envelope: { flapDirection: "top_flap", sizeMm: { height: 190, width: 135 } },
      presetId: "folded-127x178-envelope-135x190-seal-40",
      scene: DEFAULT_SCENE,
      sealSticker: { placement: "envelope_flap_center", shape: "circle", sizeMm: { diameter: 40 } },
    },
    summary: "청첩장, 프리미엄 안내장처럼 크게 보이는 설정샷에 맞습니다.",
  },
  {
    id: "postcard-100x150-envelope-110x160-seal-35",
    label: "엽서 100x150 + 봉투 110x160",
    settings: {
      card: { format: "postcard_flat", paperFinish: "matte", paperWeightGsm: 260, sizeMm: { height: 150, width: 100 } },
      envelope: { flapDirection: "top_flap", sizeMm: { height: 160, width: 110 } },
      presetId: "postcard-100x150-envelope-110x160-seal-35",
      scene: DEFAULT_SCENE,
      sealSticker: { placement: "envelope_flap_center", shape: "circle", sizeMm: { diameter: 35 } },
    },
    summary: "접힘 없는 엽서형 카드와 봉투 세트를 정확히 보여줍니다.",
  },
  {
    id: "postcard-a6-envelope-114x162-seal-30",
    label: "A6 엽서 + 봉투 114x162",
    settings: {
      card: { format: "postcard_flat", paperFinish: "matte", paperWeightGsm: 260, sizeMm: { height: 148, width: 105 } },
      envelope: { flapDirection: "top_flap", sizeMm: { height: 162, width: 114 } },
      presetId: "postcard-a6-envelope-114x162-seal-30",
      scene: DEFAULT_SCENE,
      sealSticker: { placement: "envelope_flap_center", shape: "circle", sizeMm: { diameter: 30 } },
    },
    summary: "A6 규격 엽서, 안내장, 감사카드에 맞춘 구성입니다.",
  },
] as const satisfies readonly ProductImageStudioSpecPreset[];

export function listProductImageStudioSpecPresets(cardFormat: CardFormat): readonly ProductImageStudioSpecPreset[] {
  return SPEC_PRESETS.filter((preset) => preset.settings.card.format === cardFormat);
}

export function createDefaultProductImageStudioProductionSettings(
  cardFormat: CardFormat,
): ProductImageStudioProductionSettings {
  const preset = listProductImageStudioSpecPresets(cardFormat)[0];
  if (!preset) {
    throw new ProductImageStudioProductionSettingsError(cardFormat);
  }
  return preset.settings;
}

export function applyProductImageStudioSpecPreset(
  current: ProductImageStudioProductionSettings,
  cardFormat: CardFormat,
  presetId: ProductImageStudioSpecPresetId,
): ProductImageStudioProductionSettings {
  const preset = listProductImageStudioSpecPresets(cardFormat).find((candidate) => candidate.id === presetId);
  const nextSettings = preset?.settings ?? current;
  return { ...nextSettings, scene: current.scene };
}

export function isProductImageStudioSpecPresetAllowedForCardFormat(
  cardFormat: CardFormat,
  presetId: ProductImageStudioSpecPresetId,
): boolean {
  return listProductImageStudioSpecPresets(cardFormat).some((preset) => preset.id === presetId);
}
