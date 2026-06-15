import sharp from "sharp";
import { sanitizeProductImageStudioSvgAsset } from "@/features/product-image-studio/server/svgAssetSanitizer";

export type RasterizedProductImageStudioSvgAsset = {
  readonly bytes: Uint8Array;
  readonly contentType: "image/png";
};

export class ProductImageStudioSvgRasterizationError extends Error {
  readonly code = "SVG_RASTERIZATION_FAILED";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ProductImageStudioSvgRasterizationError";
  }
}

export async function rasterizeSanitizedSvgToPng(bytes: Uint8Array): Promise<RasterizedProductImageStudioSvgAsset> {
  const sanitized = sanitizeProductImageStudioSvgAsset(bytes);
  if (!sanitized.ok) {
    throw new ProductImageStudioSvgRasterizationError(sanitized.error.message);
  }

  try {
    const png = await sharp(Buffer.from(sanitized.bytes), { failOn: "error" }).png().toBuffer();
    return { bytes: new Uint8Array(png), contentType: "image/png" };
  } catch (error) {
    if (error instanceof Error) {
      throw new ProductImageStudioSvgRasterizationError("SVG를 provider용 PNG로 변환하지 못했습니다.", { cause: error });
    }
    throw error;
  }
}
