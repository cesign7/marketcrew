import { describe, expect, it } from "vitest";
import {
  buildProductImageStudioProductionPromptLines,
  buildProductImageStudioValidationChecklist,
  createDefaultProductImageStudioProductionSettings,
  getProductImageStudioProductionSettingsIssueForOutput,
  parseProductImageStudioProductionSettings,
} from "@/features/product-image-studio/domain/productionSettings";
import {
  manualCardOnlyProductionSettings,
  manualProductionSettings,
} from "./manualProductionSettings";

describe("product image studio production settings", () => {
  it("starts from a manual input draft instead of a hardcoded print-size preset", () => {
    const foldedSettings = createDefaultProductImageStudioProductionSettings("folded_card");

    expect(foldedSettings.specSource).toBe("manual_input");
    expect(foldedSettings.card.format).toBe("folded_card");
    if (foldedSettings.card.format !== "folded_card") {
      throw new Error("folded card settings expected");
    }
    expect(foldedSettings.card.foldedSizeMm).toEqual({ height: 0, width: 0 });
    expect(foldedSettings.card.openSizeMm).toEqual({ height: 0, width: 0 });
    expect(foldedSettings.envelope.sizeMm).toEqual({ height: 0, width: 0 });
    expect(foldedSettings.sealSticker.sizeMm).toEqual({ diameter: 0 });
  });

  it("builds output-specific prompt lines from manually entered dimensions", () => {
    const settings = manualProductionSettings("folded_card");

    const cardPromptLines = buildProductImageStudioProductionPromptLines(settings, "card_single");
    const setPromptLines = buildProductImageStudioProductionPromptLines(settings, "set_combined");
    const checklist = buildProductImageStudioValidationChecklist(settings, "set_combined");

    expect(cardPromptLines).toContain("specSource=manual_input");
    expect(cardPromptLines).toContain("cardFoldedSize=100x150mm");
    expect(cardPromptLines).not.toContain("envelopeSize=110x160mm");
    expect(setPromptLines).toContain("envelopeSize=110x160mm");
    expect(setPromptLines).toContain("sealStickerSize=35mm");
    expect(setPromptLines).toContain("designPreservation=exact_composite");
    expect(checklist).toContain("카드와 봉투의 상대 크기가 실제 사양과 맞아야 합니다.");
    expect(checklist).toContain("글자, 로고, 패턴은 다시 그리지 않고 업로드 이미지를 보존해야 합니다.");
  });

  it("allows card-only settings while requiring matching specs for set outputs", () => {
    const settings = manualCardOnlyProductionSettings();

    expect(getProductImageStudioProductionSettingsIssueForOutput(settings, "card_single")).toBeNull();
    expect(getProductImageStudioProductionSettingsIssueForOutput(settings, "set_combined")).toBe("봉투 실제 규격을 입력해 주세요.");
  });

  it("parses settings and rejects physically impossible relative sizes once both sizes are entered", () => {
    const settings = manualProductionSettings("postcard_flat");
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
