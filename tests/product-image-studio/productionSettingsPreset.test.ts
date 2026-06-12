import { describe, expect, it } from "vitest";
import {
  applyProductImageStudioProductionSettingsPreset,
  createProductImageStudioProductionSettingsPreset,
  readProductImageStudioProductionSettingsPresets,
} from "@/features/product-image-studio/domain/productionSettingsPresets";
import {
  createInitialProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import { manualProductionSettings } from "./manualProductionSettings";

describe("product image studio production settings presets", () => {
  it("stores only user-named manual production settings and reads them back", () => {
    const preset = createProductImageStudioProductionSettingsPreset({
      cardFormat: "folded_card",
      createdAt: "2026-06-12T00:00:00.000Z",
      id: "preset-1",
      name: "A6 접이식 카드 세트",
      settings: manualProductionSettings("folded_card"),
    });
    const stored = JSON.stringify([preset]);

    expect(readProductImageStudioProductionSettingsPresets(stored)).toEqual([preset]);
    expect(readProductImageStudioProductionSettingsPresets("not-json")).toEqual([]);
    expect(readProductImageStudioProductionSettingsPresets(JSON.stringify([{ ...preset, name: "" }]))).toEqual([]);
  });

  it("applies a saved postcard preset with matching card format and pose defaults", () => {
    const state = createInitialProductImageStudioWizardState();
    const preset = createProductImageStudioProductionSettingsPreset({
      cardFormat: "postcard_flat",
      createdAt: "2026-06-12T00:00:00.000Z",
      id: "preset-postcard",
      name: "엽서 세트",
      settings: manualProductionSettings("postcard_flat"),
    });

    const applied = applyProductImageStudioProductionSettingsPreset(state, preset);

    expect(applied.cardFormat).toBe("postcard_flat");
    expect(applied.productionSettings).toEqual(preset.settings);
    expect(applied.selectedCardPoses).toEqual(["postcard_front_flat"]);
    expect(applied.uploadedRoles).toEqual([]);
  });
});
