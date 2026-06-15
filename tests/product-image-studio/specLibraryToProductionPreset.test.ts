import { describe, expect, it } from "vitest";
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
      paperFinish: "textured",
      paperWeightGsm: 320,
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
    expect(preset?.settings.card).toMatchObject({
      foldDirection: "top_fold",
      foldedSizeMm: { height: 150, width: 100 },
      openSizeMm: { height: 300, width: 100 },
      paperFinish: "textured",
      paperWeightGsm: 320,
    });
    expect(preset?.settings.envelope.sizeMm).toEqual({ height: 170, width: 120 });
    expect(preset?.settings.sealSticker).toEqual({
      placement: "envelope_flap_center",
      shape: "circle",
      sizeMm: { diameter: 35 },
    });
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
