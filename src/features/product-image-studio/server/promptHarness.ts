import type { ProductImageStudioOutputType } from "@/features/product-image-studio/domain/types";
import type {
  ProductImageStudioCardSpec,
  ProductImageStudioProductionSettings,
  ProductImageStudioSealStickerSpec,
  ProductImageStudioSizeMm,
} from "@/features/product-image-studio/domain/productionSettings";

export function buildProductImageStudioPromptHarnessLines(
  settings: ProductImageStudioProductionSettings,
  outputType: ProductImageStudioOutputType,
): readonly string[] {
  return [
    "designLock=uploaded_print_surface_locked",
    "forbiddenDesignChanges=do not change text size, font, kerning, line breaks, text placement, logo placement, colors, illustrations, patterns, margins, or safe area.",
    "surfaceBoundary=all text, logos, patterns, and illustrations must remain clipped inside the printed card, envelope, or sticker surface; never move printed content outside the product image.",
    "ratioChangePolicy=when changing output ratio, expand or crop only the background/canvas. Do not rescale the card, change the card aspect ratio, or resize the uploaded print design.",
    `physicalScaleReference=${buildPhysicalScaleReference(settings, outputType)}`,
    "propScaleRules=use real-world object scale from the millimeter specs. Pens and pencils should read as about 140-190mm long and 7-12mm thick; books, trays, tables, ribbons, flowers, and ornaments must not look miniature or oversized next to the printed card.",
    "backgroundScaleRules=the desk/table/background is a full-size surface around the printed product. If the card is about 90mm wide, props and surface area must still look physically plausible at that scale.",
  ];
}

function buildPhysicalScaleReference(
  settings: ProductImageStudioProductionSettings,
  outputType: ProductImageStudioOutputType,
): string {
  const references: string[] = [];
  if (usesCard(outputType)) {
    references.push(`card=${readCardSize(settings.card)}`);
  }
  if (usesEnvelope(outputType)) {
    references.push(`envelope=${toSizeLabel(settings.envelope.sizeMm)}`);
  }
  if (usesSealSticker(outputType)) {
    references.push(`sealSticker=${toSealStickerSizeLabel(settings.sealSticker)}`);
  }
  return references.join(" | ");
}

function readCardSize(card: ProductImageStudioCardSpec): string {
  return card.format === "folded_card" ? `folded ${toSizeLabel(card.foldedSizeMm)}, open ${toSizeLabel(card.openSizeMm)}` : toSizeLabel(card.sizeMm);
}

function usesCard(outputType: ProductImageStudioOutputType): boolean {
  return outputType === "set_combined" || outputType === "card_single";
}

function usesEnvelope(outputType: ProductImageStudioOutputType): boolean {
  return outputType === "set_combined" || outputType === "envelope_single";
}

function usesSealSticker(outputType: ProductImageStudioOutputType): boolean {
  return outputType === "set_combined" || outputType === "seal_sticker_single";
}

function toSizeLabel(size: ProductImageStudioSizeMm): string {
  return `${size.width}x${size.height}mm`;
}

function toSealStickerSizeLabel(sealSticker: ProductImageStudioSealStickerSpec): string {
  return sealSticker.shape === "circle" ? `${sealSticker.sizeMm.diameter}mm diameter` : toSizeLabel(sealSticker.sizeMm);
}
