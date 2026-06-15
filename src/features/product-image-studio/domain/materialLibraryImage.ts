export const PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_MAX_BYTES = 1_000_000;
export const PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_MAX_DATA_URL_LENGTH = 1_500_000;
export const PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type ProductImageStudioMaterialImageMimeType =
  (typeof PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_MIME_TYPES)[number];

export function readProductImageStudioMaterialImageMimeType(
  value: string,
): ProductImageStudioMaterialImageMimeType | null {
  return PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_MIME_TYPES.find((mimeType) => mimeType === value) ?? null;
}

export function isProductImageStudioMaterialImageDataUrl(value: string): boolean {
  if (value.length > PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_MAX_DATA_URL_LENGTH) {
    return false;
  }
  const commaIndex = value.indexOf(",");
  if (commaIndex < 1 || commaIndex === value.length - 1) {
    return false;
  }
  const header = value.slice(0, commaIndex).toLowerCase();
  return PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_MIME_TYPES.some((mimeType) => header === `data:${mimeType};base64`);
}
