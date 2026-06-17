import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  PRODUCT_IMAGE_STUDIO_SVG_MIME_TYPE,
  sanitizeProductImageStudioSvgAsset,
} from "@/features/product-image-studio/server/svgAssetSanitizer";
import type { ProductImageStudioVectorSvgStyle } from "@/features/product-image-studio/server/vectorSvg";

export const PRODUCT_IMAGE_STUDIO_PNG_TO_VECTOR_MAX_BYTES = 20 * 1024 * 1024;

export type ProductImageStudioPngToVectorSvgInput = {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly style: ProductImageStudioVectorSvgStyle;
  readonly title: string;
};

export type ProductImageStudioPngToVectorSvgErrorCode =
  | "SVG_CONVERSION_FILE_EMPTY"
  | "SVG_CONVERSION_FILE_TOO_LARGE"
  | "SVG_CONVERSION_PNG_MALFORMED"
  | "SVG_CONVERSION_UNSAFE";

export type ProductImageStudioPngToVectorSvgResult =
  | {
      readonly bytes: Uint8Array;
      readonly contentType: typeof PRODUCT_IMAGE_STUDIO_SVG_MIME_TYPE;
      readonly fileName: string;
      readonly height: number;
      readonly ok: true;
      readonly sourceHash: string;
      readonly width: number;
    }
  | {
      readonly error: { readonly code: ProductImageStudioPngToVectorSvgErrorCode; readonly message: string };
      readonly ok: false;
    };

type RgbaColor = {
  readonly alpha: number;
  readonly blue: number;
  readonly green: number;
  readonly red: number;
};

type PngVectorSample = {
  readonly colors: readonly RgbaColor[];
  readonly height: number;
  readonly width: number;
};

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;
const OUTPUT_SIZE = 1200;

export async function convertPngToProductImageStudioVectorSvg(
  input: ProductImageStudioPngToVectorSvgInput,
): Promise<ProductImageStudioPngToVectorSvgResult> {
  if (input.bytes.byteLength === 0) {
    return conversionError("SVG_CONVERSION_FILE_EMPTY", "SVG로 변환할 PNG 파일을 선택해 주세요.");
  }
  if (input.bytes.byteLength > PRODUCT_IMAGE_STUDIO_PNG_TO_VECTOR_MAX_BYTES) {
    return conversionError("SVG_CONVERSION_FILE_TOO_LARGE", "PNG 파일은 20MB 이하만 SVG로 변환할 수 있습니다.");
  }
  if (!hasPngSignature(input.bytes)) {
    return conversionError("SVG_CONVERSION_PNG_MALFORMED", "PNG 파일 구조를 확인해 주세요.");
  }

  const sample = await readPngVectorSample(input.bytes);
  if (!sample.ok) {
    return sample;
  }

  const sourceHash = createHash("sha256").update(input.bytes).digest("hex").slice(0, 16);
  const svg = renderSvg({
    colors: sample.sample.colors,
    sourceHash,
    style: input.style,
    title: input.title.trim() || input.fileName,
  });
  const sanitized = sanitizeProductImageStudioSvgAsset(new TextEncoder().encode(svg));
  if (!sanitized.ok) {
    return conversionError("SVG_CONVERSION_UNSAFE", sanitized.error.message);
  }

  return {
    bytes: sanitized.bytes,
    contentType: sanitized.contentType,
    fileName: toVectorSvgFileName(input.fileName, input.style),
    height: OUTPUT_SIZE,
    ok: true,
    sourceHash,
    width: OUTPUT_SIZE,
  };
}

async function readPngVectorSample(
  bytes: Uint8Array,
): Promise<
  | { readonly ok: true; readonly sample: PngVectorSample }
  | { readonly error: { readonly code: "SVG_CONVERSION_PNG_MALFORMED"; readonly message: string }; readonly ok: false }
> {
  try {
    const buffer = Buffer.from(bytes);
    const metadata = await sharp(buffer, { failOn: "error", limitInputPixels: 4096 * 4096 }).metadata();
    if (metadata.format !== "png" || !metadata.width || !metadata.height) {
      return conversionError("SVG_CONVERSION_PNG_MALFORMED", "PNG 파일 구조를 확인해 주세요.");
    }
    const sampled = await sharp(buffer, { failOn: "none", limitInputPixels: 4096 * 4096 })
      .ensureAlpha()
      .resize(4, 4, { fit: "fill" })
      .raw()
      .toBuffer();
    return {
      ok: true,
      sample: {
        colors: readSampleColors(sampled),
        height: metadata.height,
        width: metadata.width,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      return conversionError("SVG_CONVERSION_PNG_MALFORMED", "PNG 파일을 읽지 못했습니다. 파일이 손상되지 않았는지 확인해 주세요.");
    }
    throw error;
  }
}

function renderSvg(input: {
  readonly colors: readonly RgbaColor[];
  readonly sourceHash: string;
  readonly style: ProductImageStudioVectorSvgStyle;
  readonly title: string;
}): string {
  const palette = toPalette(input.colors);
  const title = escapeXml(scrubSvgMetadataText(input.title));
  const artwork = renderArtwork(input.style, palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_SIZE}" height="${OUTPUT_SIZE}" viewBox="0 0 ${OUTPUT_SIZE} ${OUTPUT_SIZE}" role="img" aria-labelledby="title desc" data-source-hash="${input.sourceHash}">
<title id="title">${title}</title>
<desc id="desc">Uploaded PNG pixels converted locally into vector primitives.</desc>
${artwork}
</svg>`;
}

function renderArtwork(style: ProductImageStudioVectorSvgStyle, palette: readonly string[]): string {
  const primary = palette[0] ?? "#2563EB";
  const secondary = palette[5] ?? "#DBEAFE";
  const accent = palette[10] ?? "#0F172A";
  switch (style) {
    case "character":
      return `<rect width="1200" height="1200" fill="${lighten(primary)}"/><circle cx="600" cy="560" r="300" fill="${secondary}" stroke="${accent}" stroke-width="36"/><circle cx="500" cy="520" r="34" fill="${accent}"/><circle cx="700" cy="520" r="34" fill="${accent}"/><path d="M470 675 C540 760 660 760 730 675" fill="none" stroke="${primary}" stroke-width="38" stroke-linecap="round"/>`;
    case "icon":
      return `<rect width="1200" height="1200" rx="220" fill="${lighten(secondary)}"/><rect x="250" y="250" width="700" height="700" rx="150" fill="${primary}" stroke="${accent}" stroke-width="42"/><path d="M410 615 L550 760 L810 440" fill="none" stroke="${secondary}" stroke-width="74" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "sticker":
      return `<rect width="1200" height="1200" fill="${lighten(secondary)}"/><circle cx="600" cy="600" r="390" fill="${primary}" stroke="${accent}" stroke-width="42"/><polygon points="820,860 980,980 760,940" fill="${secondary}" stroke="${accent}" stroke-width="24"/><path d="M365 620 C455 475 730 770 835 545" fill="none" stroke="${secondary}" stroke-width="56" stroke-linecap="round"/>`;
    case "line_art":
      return `<rect width="1200" height="1200" fill="#FFFFFF"/><circle cx="600" cy="600" r="360" fill="none" stroke="${accent}" stroke-width="38"/><path d="M360 595 C455 420 740 785 850 560" fill="none" stroke="${primary}" stroke-width="44" stroke-linecap="round"/><line x1="420" y1="790" x2="780" y2="790" stroke="${secondary}" stroke-width="36" stroke-linecap="round"/>`;
    case "flat_illustration":
      return `<rect width="1200" height="1200" fill="${lighten(primary)}"/><circle cx="375" cy="370" r="190" fill="${secondary}"/><circle cx="825" cy="820" r="220" fill="${accent}" opacity="0.22"/><rect x="335" y="305" width="530" height="590" rx="72" fill="#FFFFFF" stroke="${primary}" stroke-width="36"/><path d="M450 520 H750 M450 650 C540 565 640 745 760 620 M450 775 H700" fill="none" stroke="${accent}" stroke-width="40" stroke-linecap="round"/>`;
  }
}

function readSampleColors(bytes: Buffer): readonly RgbaColor[] {
  return Array.from({ length: 16 }, (_value, index) => {
    const offset = index * 4;
    return {
      alpha: bytes[offset + 3] ?? 255,
      blue: bytes[offset + 2] ?? 0,
      green: bytes[offset + 1] ?? 0,
      red: bytes[offset] ?? 0,
    };
  });
}

function toPalette(colors: readonly RgbaColor[]): readonly string[] {
  return colors.map((color) => rgbaToHex(color));
}

function rgbaToHex(color: RgbaColor): string {
  const alpha = color.alpha / 255;
  return `#${toHex(color.red * alpha + 255 * (1 - alpha))}${toHex(color.green * alpha + 255 * (1 - alpha))}${toHex(color.blue * alpha + 255 * (1 - alpha))}`;
}

function lighten(color: string): string {
  return `${color}22`;
}

function toHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, "0").slice(0, 2).toUpperCase();
}

function hasPngSignature(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

function toVectorSvgFileName(fileName: string, style: ProductImageStudioVectorSvgStyle): string {
  const stem = fileName.replace(/\.[A-Za-z0-9]+$/, "");
  const segment = stem.replaceAll(/[^A-Za-z0-9_-]/g, "-").replaceAll(/-+/g, "-").replace(/^-|-$/g, "");
  return `${segment || "converted"}-${style}.svg`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function scrubSvgMetadataText(value: string): string {
  return value
    .replaceAll(/<\s*image\b[\s\S]*?>/gi, "raster marker removed")
    .replaceAll(/data\s*:\s*image/gi, "data image")
    .replaceAll(/base64/gi, "encoded payload")
    .replaceAll(/foreignObject/gi, "foreign object");
}

function conversionError<Code extends ProductImageStudioPngToVectorSvgErrorCode>(
  code: Code,
  message: string,
): { readonly error: { readonly code: Code; readonly message: string }; readonly ok: false } {
  return { error: { code, message }, ok: false };
}
