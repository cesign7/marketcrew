import { describe, expect, it } from "vitest";
import {
  buildProductImageStudioProductionPromptLines,
  createDefaultProductImageStudioProductionSettings,
} from "@/features/product-image-studio/domain/productionSettings";
import {
  createProductImageStudioSpecItem,
  createProductImageStudioSpecSet,
} from "@/features/product-image-studio/domain/specLibrary";
import { createProductImageStudioProductionPresetFromSpecSet } from "@/features/product-image-studio/domain/specLibraryToProductionPreset";

describe("product image studio spec library production preset adapter", () => {
  it("creates a generation preset from a set that includes card, envelope, and sticker specs", () => {
    const card = createProductImageStudioSpecItem({
      createdAt: "2026-06-12T00:00:00.000Z",
      foldedSizeMm: { height: 150, width: 100 },
      foldDirection: "top_fold",
      id: "card-a6",
      name: "A6 카드",
      openSizeMm: { height: 300, width: 100 },
      type: "folded_card",
    });
    const envelope = createProductImageStudioSpecItem({
      createdAt: "2026-06-12T00:01:00.000Z",
      flapDirection: "top_flap",
      flapStyle: "jacket",
      id: "envelope-a6",
      name: "A6 봉투",
      sizeMm: { height: 170, width: 120 },
      type: "envelope",
    });
    const sticker = createProductImageStudioSpecItem({
      createdAt: "2026-06-12T00:02:00.000Z",
      id: "sticker-round",
      name: "원형 봉합스티커",
      placement: "envelope_flap_center",
      shape: "circle",
      sizeMm: { diameter: 35 },
      type: "sticker",
    });
    const set = createProductImageStudioSpecSet({
      createdAt: "2026-06-12T00:03:00.000Z",
      id: "set-a6",
      itemIds: [card.id, envelope.id, sticker.id],
      name: "A6 카드 세트",
    });

    const preset = createProductImageStudioProductionPresetFromSpecSet({
      createdAt: "2026-06-12T00:04:00.000Z",
      id: "preset-a6",
      items: [card, envelope, sticker],
      set,
    });

    expect(preset?.name).toBe("A6 카드 세트");
    expect(preset?.cardFormat).toBe("folded_card");
    const defaultSettings = createDefaultProductImageStudioProductionSettings("folded_card");
    expect(preset?.settings.card).toMatchObject({
      foldDirection: "top_fold",
      foldedSizeMm: { height: 150, width: 100 },
      openSizeMm: { height: 300, width: 100 },
      paperFinish: defaultSettings.card.paperFinish,
      paperWeightGsm: defaultSettings.card.paperWeightGsm,
    });
    expect(preset?.settings.envelope.sizeMm).toEqual({ height: 170, width: 120 });
    expect(preset?.settings.sealSticker).toEqual({
      placement: "envelope_flap_center",
      shape: "circle",
      sizeMm: { diameter: 35 },
    });
    expect(preset ? buildProductImageStudioProductionPromptLines(preset.settings) : []).toContain("paper=matte_300gsm");
  });

  it("creates a postcard preset with production-default paper fields", () => {
    const card = createProductImageStudioSpecItem({
      createdAt: "2026-06-12T00:00:00.000Z",
      id: "postcard-a6",
      name: "A6 엽서",
      sides: "front_back",
      sizeMm: { height: 148, width: 105 },
      type: "postcard",
    });
    const set = createProductImageStudioSpecSet({
      createdAt: "2026-06-12T00:01:00.000Z",
      id: "set-postcard-a6",
      itemIds: [card.id],
      name: "A6 엽서 세트",
    });

    const preset = createProductImageStudioProductionPresetFromSpecSet({
      createdAt: "2026-06-12T00:02:00.000Z",
      id: "preset-postcard-a6",
      items: [card],
      set,
    });

    expect(preset?.cardFormat).toBe("postcard_flat");
    const defaultSettings = createDefaultProductImageStudioProductionSettings("postcard_flat");
    expect(preset?.settings.card).toMatchObject({
      paperFinish: defaultSettings.card.paperFinish,
      paperWeightGsm: defaultSettings.card.paperWeightGsm,
      sizeMm: { height: 148, width: 105 },
    });
    expect(preset ? buildProductImageStudioProductionPromptLines(preset.settings, "card_single") : []).toContain(
      "paper=matte_260gsm",
    );
  });

  it("does not create a generation preset from a set without a card spec", () => {
    const businessCard = createProductImageStudioSpecItem({
      createdAt: "2026-06-12T00:00:00.000Z",
      id: "business-card",
      name: "명함",
      sides: "front_back",
      sizeMm: { height: 50, width: 90 },
      type: "business_card",
    });
    const set = createProductImageStudioSpecSet({
      createdAt: "2026-06-12T00:01:00.000Z",
      id: "set-business-card",
      itemIds: [businessCard.id],
      name: "명함 세트",
    });

    const preset = createProductImageStudioProductionPresetFromSpecSet({
      createdAt: "2026-06-12T00:02:00.000Z",
      id: "preset-business-card",
      items: [businessCard],
      set,
    });

    expect(preset).toBeNull();
  });
});
