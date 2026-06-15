import {
  PRODUCT_IMAGE_STUDIO_SVG_MIME_TYPE,
  sanitizeProductImageStudioSvgAsset,
} from "@/features/product-image-studio/server/svgAssetSanitizer";
import { ProductImageStudioFileStoreError } from "@/features/product-image-studio/server/fileStoreErrors";

export const PRODUCT_IMAGE_STUDIO_GENERATED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const PRODUCT_IMAGE_STUDIO_ALLOWED_IMAGE_MIME_TYPES = [
  ...PRODUCT_IMAGE_STUDIO_GENERATED_IMAGE_MIME_TYPES,
  PRODUCT_IMAGE_STUDIO_SVG_MIME_TYPE,
] as const;

export type ProductImageStudioImageMimeType = (typeof PRODUCT_IMAGE_STUDIO_ALLOWED_IMAGE_MIME_TYPES)[number];
export type ProductImageStudioGeneratedImageMimeType = (typeof PRODUCT_IMAGE_STUDIO_GENERATED_IMAGE_MIME_TYPES)[number];

export function parseImageMimeType(contentType: string): ProductImageStudioImageMimeType {
  switch (contentType) {
    case "image/png":
    case "image/jpeg":
    case "image/webp":
    case "image/svg+xml":
      return contentType;
    default:
      throw new ProductImageStudioFileStoreError("UNSUPPORTED_IMAGE_TYPE", "지원하지 않는 이미지 형식입니다.");
  }
}

export function parseGeneratedImageMimeType(contentType: string): ProductImageStudioGeneratedImageMimeType {
  switch (contentType) {
    case "image/png":
    case "image/jpeg":
    case "image/webp":
      return contentType;
    default:
      throw new ProductImageStudioFileStoreError("UNSUPPORTED_IMAGE_TYPE", "지원하지 않는 생성 이미지 형식입니다.");
  }
}

export function getExtensionForContentType(contentType: ProductImageStudioImageMimeType): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
  }
}

export function prepareProductImageAssetForStorage(
  bytes: Uint8Array,
  contentTypeInput: string,
): { readonly bytes: Uint8Array; readonly contentType: ProductImageStudioImageMimeType } {
  const contentType = parseImageMimeType(contentTypeInput);
  if (contentType !== PRODUCT_IMAGE_STUDIO_SVG_MIME_TYPE) {
    return { bytes, contentType };
  }

  const sanitized = sanitizeProductImageStudioSvgAsset(bytes);
  if (!sanitized.ok) {
    throw new ProductImageStudioFileStoreError(sanitized.error.code, sanitized.error.message);
  }
  return { bytes: sanitized.bytes, contentType: sanitized.contentType };
}

export function parseImageMimeTypeFromStorageKey(storageKey: string): ProductImageStudioImageMimeType {
  if (storageKey.endsWith(".jpg") || storageKey.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (storageKey.endsWith(".webp")) {
    return "image/webp";
  }
  if (storageKey.endsWith(".svg")) {
    return "image/svg+xml";
  }
  return "image/png";
}
