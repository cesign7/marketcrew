import { describe, expect, it } from "vitest";
import {
  buildProductImageStudioProductionPromptLines,
  buildProductImageStudioValidationChecklist,
  createDefaultProductImageStudioProductionSettings,
  listProductImageStudioSpecPresets,
  parseProductImageStudioProductionSettings,
} from "@/features/product-image-studio/domain/productionSettings";

describe("product image studio production settings", () => {
  it("defines print-size presets that preserve card, envelope, and seal-sticker scale", () => {
    const foldedSettings = createDefaultProductImageStudioProductionSettings("folded_card");
    const foldedPresets = listProductImageStudioSpecPresets("folded_card");

    expect(foldedPresets.map((preset) => preset.id)).toContain("folded-100x150-envelope-110x160-seal-35");
    expect(foldedSettings.card.format).toBe("folded_card");
    if (foldedSettings.card.format !== "folded_card") {
      throw new Error("folded card settings expected");
    }
    expect(foldedSettings.card.foldedSizeMm).toEqual({ height: 150, width: 100 });
    expect(foldedSettings.card.openSizeMm).toEqual({ height: 150, width: 200 });
    expect(foldedSettings.envelope.sizeMm).toEqual({ height: 160, width: 110 });
    expect(foldedSettings.sealSticker.sizeMm).toEqual({ diameter: 35 });
  });

  it("builds prompt lines for mockup-first generation with validation rules", () => {
    const settings = createDefaultProductImageStudioProductionSettings("folded_card");

    const promptLines = buildProductImageStudioProductionPromptLines(settings);
    const checklist = buildProductImageStudioValidationChecklist(settings);

    expect(promptLines).toContain("generationMethod=mockup_composite_first");
    expect(promptLines).toContain("cardFoldedSize=100x150mm");
    expect(promptLines).toContain("cardOpenSize=200x150mm");
    expect(promptLines).toContain("envelopeSize=110x160mm");
    expect(promptLines).toContain("sealStickerSize=35mm");
    expect(promptLines).toContain("designPreservation=exact_composite");
    expect(checklist).toContain("카드와 봉투의 상대 크기가 실제 사양과 맞아야 합니다.");
    expect(checklist).toContain("글자, 로고, 패턴은 다시 그리지 않고 업로드 이미지를 보존해야 합니다.");
  });

  it("parses settings and rejects physically impossible relative sizes", () => {
    const settings = createDefaultProductImageStudioProductionSettings("postcard_flat");
    const valid = parseProductImageStudioProductionSettings(settings, "postcard_flat");
    const invalid = parseProductImageStudioProductionSettings(
      {
        ...settings,
        envelope: { ...settings.envelope, sizeMm: { height: 140, width: 90 } },
      },
      "postcard_flat",
    );

    expect(valid.ok).toBe(true);
    expect(invalid).toMatchObject({
      error: { code: "ENVELOPE_TOO_SMALL" },
      ok: false,
    });
  });
});
