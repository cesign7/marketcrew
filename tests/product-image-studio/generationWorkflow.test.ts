import { describe, expect, it } from "vitest";
import {
  createInitialProductImageStudioGenerationState,
  buildProductImageStudioGenerationPayload,
  selectProductImageStudioConcept,
} from "@/features/product-image-studio/domain/generationWorkflow";
import {
  createInitialProductImageStudioWizardState,
  recordProductImageStudioUploadedRole,
  setProductImageStudioProjectName,
} from "@/features/product-image-studio/domain/projectWizard";
import { parseProductImageStudioGenerationPayload } from "@/features/product-image-studio/server/generationRoutePayload";
import { getProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import {
  createProductImageStudioMaterialRecord,
  type ProductImageStudioMaterialRecord,
  type ProductImageStudioMaterialTarget,
} from "@/features/product-image-studio/domain/materialLibrary";
import {
  createInitialProductImageStudioAiMaterialSelectionState,
  getProductImageStudioAiMaterialSelectionChoices,
  selectNextProductImageStudioAiMaterial,
  toggleProductImageStudioAiMaterialSelectionLock,
} from "@/components/product-image-studio/productImageStudioAiMaterialSelectionModel";
import { manualCardOnlyProductionSettings } from "./manualProductionSettings";

describe("product image studio generation workflow", () => {
  it("keeps AI material selection out of the generation payload", () => {
    const wizardState = recordProductImageStudioUploadedRole(
      {
        ...setProductImageStudioProjectName(createInitialProductImageStudioWizardState(), "봄 초대장 세트"),
        productionSettings: manualCardOnlyProductionSettings(),
      },
      "folded_card_outer_front",
    );
    const generationState = {
      ...selectProductImageStudioConcept(createInitialProductImageStudioGenerationState(), "minimal-studio"),
      materialSelection: { card: "material-card" },
    };

    const payload = buildProductImageStudioGenerationPayload(wizardState, generationState);

    expect(payload).not.toBeNull();
    if (!payload) {
      throw new Error("Expected generation payload");
    }
    expect(Object.prototype.hasOwnProperty.call(payload, "materialSelection")).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("material-card");
  });

  it("ignores materialSelection when parsing generation route payloads", () => {
    const parsed = parseProductImageStudioGenerationPayload(
      {
        conceptId: "minimal-studio",
        count: 3,
        materialSelection: { card: "material-card", note: "provider prompt에 들어가면 안 되는 재질" },
        modelLabel: "nano-banana-2",
        outputs: ["card_single"],
        productionSettings: manualCardOnlyProductionSettings(),
        provider: "gemini",
        qualityMode: "draft",
        ratio: "4:5",
        resolution: "0.5k",
      },
      "folded_card",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(parsed.error.message);
    }
    expect(Object.prototype.hasOwnProperty.call(parsed.payload, "materialSelection")).toBe(false);
    expect(JSON.stringify(parsed.payload)).not.toContain("provider prompt에 들어가면 안 되는 재질");
    expect(parsed.payload.count).toBe(3);
    expect(parsed.payload.modelLabel).toBe("nano-banana-2");
    expect(parsed.payload.ratio).toBe("4:5");
    expect(parsed.payload.resolution).toBe("0.5k");
  });

  it("sets, locks, and swaps material choices in client-only state", () => {
    const materials = [
      createMaterial("material-card-first", "랑데뷰 내추럴 240g", ["folded_card", "postcard"]),
      createMaterial("material-envelope-first", "미색 봉투지 120g", ["envelope"]),
      createMaterial("material-envelope-second", "크라프트 봉투지", ["envelope"]),
    ];
    const state = createInitialProductImageStudioAiMaterialSelectionState(materials);

    const selectedChoices = getProductImageStudioAiMaterialSelectionChoices(materials, state);
    expect(selectedChoices.map((choice) => [choice.label, choice.selectedMaterial?.name])).toEqual([
      ["카드·엽서", "랑데뷰 내추럴 240g"],
      ["봉투", "미색 봉투지 120g"],
    ]);

    const lockedState = toggleProductImageStudioAiMaterialSelectionLock(state, "envelope");
    const unchangedState = selectNextProductImageStudioAiMaterial(materials, lockedState, "envelope");
    expect(getProductImageStudioAiMaterialSelectionChoices(materials, unchangedState)[1]?.selectedMaterial?.name).toBe(
      "미색 봉투지 120g",
    );

    const unlockedState = toggleProductImageStudioAiMaterialSelectionLock(lockedState, "envelope");
    const swappedState = selectNextProductImageStudioAiMaterial(materials, unlockedState, "envelope");
    expect(getProductImageStudioAiMaterialSelectionChoices(materials, swappedState)[1]?.selectedMaterial?.name).toBe(
      "크라프트 봉투지",
    );
  });

  it("keeps the provider write gate closed by default", () => {
    const status = getProductImageStudioProviderStatus({});

    expect(status.generation).toMatchObject({ enabled: false, reason: "generation_disabled", status: "blocked" });
  });
});

function createMaterial(
  id: string,
  name: string,
  compatibleTargets: readonly ProductImageStudioMaterialTarget[],
): ProductImageStudioMaterialRecord {
  const material = createProductImageStudioMaterialRecord({
    colorHex: "#F7F1E3",
    colorName: "내추럴 화이트",
    compatibleTargets,
    createdAt: "2026-06-15T00:00:00.000Z",
    id,
    name,
    surface: "매트",
    thickness: { unit: "gsm", value: 240 },
  });
  if (!material) {
    throw new Error("Expected valid material fixture");
  }
  return material;
}
