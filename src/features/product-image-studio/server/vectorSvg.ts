import type {
  ProductImageStudioOutputType,
  ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";
import {
  PRODUCT_IMAGE_STUDIO_SVG_MIME_TYPE,
  sanitizeProductImageStudioSvgAsset,
} from "@/features/product-image-studio/server/svgAssetSanitizer";

export const PRODUCT_IMAGE_STUDIO_VECTOR_SVG_STYLES = [
  "flat_illustration",
  "character",
  "icon",
  "sticker",
  "line_art",
] as const;

export type ProductImageStudioVectorSvgStyle = (typeof PRODUCT_IMAGE_STUDIO_VECTOR_SVG_STYLES)[number];

export type ProductImageStudioVectorSvgInput = {
  readonly fileName: string;
  readonly outputType: ProductImageStudioOutputType;
  readonly ratio: ProductImageStudioRatioPreset;
  readonly style: ProductImageStudioVectorSvgStyle;
  readonly title: string;
};

export type ProductImageStudioVectorSvgResult =
  | {
      readonly bytes: Uint8Array;
      readonly contentType: typeof PRODUCT_IMAGE_STUDIO_SVG_MIME_TYPE;
      readonly fileName: string;
      readonly ok: true;
    }
  | {
      readonly error: { readonly code: "VECTOR_SVG_UNSAFE"; readonly message: string };
      readonly ok: false;
    };

type VectorSvgDimensions = {
  readonly height: number;
  readonly width: number;
};

export function parseProductImageStudioVectorSvgStyle(value: string | null): ProductImageStudioVectorSvgStyle {
  for (const style of PRODUCT_IMAGE_STUDIO_VECTOR_SVG_STYLES) {
    if (style === value) {
      return style;
    }
  }
  return "flat_illustration";
}

export function createProductImageStudioVectorSvg(
  input: ProductImageStudioVectorSvgInput,
): ProductImageStudioVectorSvgResult {
  const dimensions = getVectorSvgDimensions(input.ratio);
  const title = escapeXml(input.title.trim() || "Product image vector");
  const description = escapeXml(`${getOutputTypeLabel(input.outputType)} ${input.style} vector redraw`);
  const artwork = renderVectorArtwork(input.style, dimensions);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}" role="img" aria-labelledby="title desc">
<title id="title">${title}</title>
<desc id="desc">${description}</desc>
${artwork}
</svg>`;
  const sanitized = sanitizeProductImageStudioSvgAsset(new TextEncoder().encode(svg));
  if (sanitized.ok === false) {
    return { error: { code: "VECTOR_SVG_UNSAFE", message: sanitized.error.message }, ok: false };
  }
  return {
    bytes: sanitized.bytes,
    contentType: sanitized.contentType,
    fileName: toVectorSvgFileName(input.fileName, input.style),
    ok: true,
  };
}

function renderVectorArtwork(style: ProductImageStudioVectorSvgStyle, dimensions: VectorSvgDimensions): string {
  switch (style) {
    case "flat_illustration":
      return renderFlatIllustration(dimensions);
    case "character":
      return renderCharacter(dimensions);
    case "icon":
      return renderIcon(dimensions);
    case "sticker":
      return renderSticker(dimensions);
    case "line_art":
      return renderLineArt(dimensions);
  }
}

function renderFlatIllustration(dimensions: VectorSvgDimensions): string {
  const unit = Math.min(dimensions.width, dimensions.height);
  const centerX = Math.round(dimensions.width / 2);
  const centerY = Math.round(dimensions.height / 2);
  const cardWidth = Math.round(unit * 0.44);
  const cardHeight = Math.round(unit * 0.58);
  const left = centerX - Math.round(cardWidth / 2);
  const top = centerY - Math.round(cardHeight / 2);
  return `<rect width="100%" height="100%" fill="#F8FAFC"/>
<circle cx="${Math.round(centerX - unit * 0.22)}" cy="${Math.round(centerY - unit * 0.18)}" r="${Math.round(unit * 0.18)}" fill="#DBEAFE"/>
<circle cx="${Math.round(centerX + unit * 0.26)}" cy="${Math.round(centerY + unit * 0.2)}" r="${Math.round(unit * 0.16)}" fill="#BFDBFE"/>
<rect x="${left}" y="${top}" width="${cardWidth}" height="${cardHeight}" rx="${Math.round(unit * 0.045)}" fill="#FFFFFF" stroke="#1D4ED8" stroke-width="${Math.max(6, Math.round(unit * 0.008))}"/>
<path d="M ${left + Math.round(cardWidth * 0.18)} ${top + Math.round(cardHeight * 0.28)} H ${left + Math.round(cardWidth * 0.82)}" stroke="#2563EB" stroke-width="${Math.max(8, Math.round(unit * 0.012))}" stroke-linecap="round"/>
<path d="M ${left + Math.round(cardWidth * 0.2)} ${top + Math.round(cardHeight * 0.48)} C ${left + Math.round(cardWidth * 0.36)} ${top + Math.round(cardHeight * 0.36)}, ${left + Math.round(cardWidth * 0.58)} ${top + Math.round(cardHeight * 0.64)}, ${left + Math.round(cardWidth * 0.8)} ${top + Math.round(cardHeight * 0.44)}" fill="none" stroke="#60A5FA" stroke-width="${Math.max(7, Math.round(unit * 0.01))}" stroke-linecap="round"/>
<path d="M ${left + Math.round(cardWidth * 0.25)} ${top + Math.round(cardHeight * 0.72)} H ${left + Math.round(cardWidth * 0.75)}" stroke="#93C5FD" stroke-width="${Math.max(6, Math.round(unit * 0.009))}" stroke-linecap="round"/>`;
}

function renderCharacter(dimensions: VectorSvgDimensions): string {
  const unit = Math.min(dimensions.width, dimensions.height);
  const centerX = Math.round(dimensions.width / 2);
  const centerY = Math.round(dimensions.height / 2);
  const faceRadius = Math.round(unit * 0.21);
  const eyeOffset = Math.round(unit * 0.07);
  const eyeY = Math.round(centerY - unit * 0.04);
  return `<rect width="100%" height="100%" fill="#F8FAFC"/>
<circle cx="${centerX}" cy="${centerY}" r="${Math.round(unit * 0.34)}" fill="#DBEAFE"/>
<path d="M ${Math.round(centerX - unit * 0.2)} ${Math.round(centerY + unit * 0.22)} C ${Math.round(centerX - unit * 0.1)} ${Math.round(centerY + unit * 0.38)}, ${Math.round(centerX + unit * 0.1)} ${Math.round(centerY + unit * 0.38)}, ${Math.round(centerX + unit * 0.2)} ${Math.round(centerY + unit * 0.22)} Z" fill="#2563EB"/>
<circle cx="${centerX}" cy="${Math.round(centerY - unit * 0.06)}" r="${faceRadius}" fill="#FFFFFF" stroke="#1D4ED8" stroke-width="${Math.max(6, Math.round(unit * 0.008))}"/>
<circle cx="${centerX - eyeOffset}" cy="${eyeY}" r="${Math.round(unit * 0.018)}" fill="#1E293B"/>
<circle cx="${centerX + eyeOffset}" cy="${eyeY}" r="${Math.round(unit * 0.018)}" fill="#1E293B"/>
<path d="M ${Math.round(centerX - unit * 0.07)} ${Math.round(centerY + unit * 0.04)} C ${Math.round(centerX - unit * 0.03)} ${Math.round(centerY + unit * 0.09)}, ${Math.round(centerX + unit * 0.03)} ${Math.round(centerY + unit * 0.09)}, ${Math.round(centerX + unit * 0.07)} ${Math.round(centerY + unit * 0.04)}" fill="none" stroke="#1E293B" stroke-width="${Math.max(5, Math.round(unit * 0.007))}" stroke-linecap="round"/>
<path d="M ${Math.round(centerX - unit * 0.13)} ${Math.round(centerY - unit * 0.18)} C ${Math.round(centerX - unit * 0.04)} ${Math.round(centerY - unit * 0.28)}, ${Math.round(centerX + unit * 0.12)} ${Math.round(centerY - unit * 0.26)}, ${Math.round(centerX + unit * 0.17)} ${Math.round(centerY - unit * 0.14)}" fill="none" stroke="#60A5FA" stroke-width="${Math.max(8, Math.round(unit * 0.012))}" stroke-linecap="round"/>`;
}

function renderIcon(dimensions: VectorSvgDimensions): string {
  const unit = Math.min(dimensions.width, dimensions.height);
  const centerX = Math.round(dimensions.width / 2);
  const centerY = Math.round(dimensions.height / 2);
  const size = Math.round(unit * 0.46);
  const left = centerX - Math.round(size / 2);
  const top = centerY - Math.round(size / 2);
  return `<rect width="100%" height="100%" fill="#F8FAFC"/>
<rect x="${left}" y="${top}" width="${size}" height="${size}" rx="${Math.round(unit * 0.08)}" fill="#FFFFFF" stroke="#1D4ED8" stroke-width="${Math.max(7, Math.round(unit * 0.01))}"/>
<path d="M ${left + Math.round(size * 0.24)} ${top + Math.round(size * 0.53)} L ${left + Math.round(size * 0.43)} ${top + Math.round(size * 0.72)} L ${left + Math.round(size * 0.78)} ${top + Math.round(size * 0.3)}" fill="none" stroke="#2563EB" stroke-width="${Math.max(10, Math.round(unit * 0.016))}" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="${left + Math.round(size * 0.72)}" cy="${top + Math.round(size * 0.23)}" r="${Math.round(unit * 0.055)}" fill="#BFDBFE"/>`;
}

function renderSticker(dimensions: VectorSvgDimensions): string {
  const unit = Math.min(dimensions.width, dimensions.height);
  const centerX = Math.round(dimensions.width / 2);
  const centerY = Math.round(dimensions.height / 2);
  const radius = Math.round(unit * 0.3);
  return `<rect width="100%" height="100%" fill="#F8FAFC"/>
<path d="M ${centerX} ${centerY - radius} C ${centerX + radius} ${centerY - radius}, ${centerX + radius} ${centerY + radius}, ${centerX} ${centerY + radius} C ${centerX - radius} ${centerY + radius}, ${centerX - radius} ${centerY - radius}, ${centerX} ${centerY - radius} Z" fill="#FFFFFF" stroke="#1D4ED8" stroke-width="${Math.max(8, Math.round(unit * 0.011))}"/>
<path d="M ${Math.round(centerX + radius * 0.28)} ${Math.round(centerY + radius * 0.7)} C ${Math.round(centerX + radius * 0.5)} ${Math.round(centerY + radius * 0.48)}, ${Math.round(centerX + radius * 0.66)} ${Math.round(centerY + radius * 0.54)}, ${Math.round(centerX + radius * 0.76)} ${Math.round(centerY + radius * 0.76)} C ${Math.round(centerX + radius * 0.58)} ${Math.round(centerY + radius * 0.72)}, ${Math.round(centerX + radius * 0.44)} ${Math.round(centerY + radius * 0.7)}, ${Math.round(centerX + radius * 0.28)} ${Math.round(centerY + radius * 0.7)} Z" fill="#DBEAFE" stroke="#60A5FA" stroke-width="${Math.max(4, Math.round(unit * 0.006))}"/>
<circle cx="${centerX}" cy="${Math.round(centerY - radius * 0.08)}" r="${Math.round(unit * 0.095)}" fill="#2563EB"/>
<path d="M ${Math.round(centerX - radius * 0.45)} ${Math.round(centerY + radius * 0.28)} H ${Math.round(centerX + radius * 0.45)}" stroke="#93C5FD" stroke-width="${Math.max(8, Math.round(unit * 0.012))}" stroke-linecap="round"/>`;
}

function renderLineArt(dimensions: VectorSvgDimensions): string {
  const unit = Math.min(dimensions.width, dimensions.height);
  const centerX = Math.round(dimensions.width / 2);
  const centerY = Math.round(dimensions.height / 2);
  const radius = Math.round(unit * 0.27);
  return `<rect width="100%" height="100%" fill="#FFFFFF"/>
<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#1D4ED8" stroke-width="${Math.max(7, Math.round(unit * 0.01))}"/>
<path d="M ${Math.round(centerX - radius * 0.64)} ${Math.round(centerY - radius * 0.1)} C ${Math.round(centerX - radius * 0.2)} ${Math.round(centerY - radius * 0.55)}, ${Math.round(centerX + radius * 0.22)} ${Math.round(centerY + radius * 0.42)}, ${Math.round(centerX + radius * 0.64)} ${Math.round(centerY - radius * 0.08)}" fill="none" stroke="#2563EB" stroke-width="${Math.max(8, Math.round(unit * 0.012))}" stroke-linecap="round"/>
<path d="M ${Math.round(centerX - radius * 0.48)} ${Math.round(centerY + radius * 0.32)} H ${Math.round(centerX + radius * 0.48)}" stroke="#60A5FA" stroke-width="${Math.max(7, Math.round(unit * 0.01))}" stroke-linecap="round"/>
<path d="M ${Math.round(centerX - radius * 0.2)} ${Math.round(centerY - radius * 0.48)} L ${centerX} ${Math.round(centerY - radius * 0.68)} L ${Math.round(centerX + radius * 0.2)} ${Math.round(centerY - radius * 0.48)}" fill="none" stroke="#93C5FD" stroke-width="${Math.max(5, Math.round(unit * 0.008))}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function getVectorSvgDimensions(ratio: ProductImageStudioRatioPreset): VectorSvgDimensions {
  switch (ratio) {
    case "1:1":
      return { height: 1200, width: 1200 };
    case "4:5":
      return { height: 1500, width: 1200 };
    case "3:4":
      return { height: 1600, width: 1200 };
    case "16:9":
      return { height: 900, width: 1600 };
    case "custom":
      return { height: 1200, width: 1200 };
  }
}

function getOutputTypeLabel(outputType: ProductImageStudioOutputType): string {
  switch (outputType) {
    case "set_combined":
      return "set";
    case "card_single":
      return "card";
    case "envelope_single":
      return "envelope";
    case "seal_sticker_single":
      return "sticker";
  }
}

function toVectorSvgFileName(fileName: string, style: ProductImageStudioVectorSvgStyle): string {
  const stem = fileName.replace(/\.[A-Za-z0-9]+$/, "");
  return `${sanitizeFileSegment(stem)}-${style}.svg`;
}

function sanitizeFileSegment(value: string): string {
  const segment = value.replaceAll(/[^A-Za-z0-9_-]/g, "-").replaceAll(/-+/g, "-").replace(/^-|-$/g, "");
  return segment || "vector";
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}
