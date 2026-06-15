import type { ProductImageStudioSizeMm } from "@/features/product-image-studio/domain/productionSettings";
import { isProductImageStudioMaterialImageDataUrl } from "@/features/product-image-studio/domain/materialLibraryImage";
import {
  PRODUCT_IMAGE_STUDIO_MATERIAL_TARGETS,
  PRODUCT_IMAGE_STUDIO_MATERIAL_THICKNESS_UNITS,
  type ProductImageStudioMaterialPreviewImage,
  type ProductImageStudioMaterialTarget,
  type ProductImageStudioMaterialThickness,
  type ProductImageStudioMaterialThicknessUnit,
} from "@/features/product-image-studio/domain/materialLibraryTypes";
import {
  isColorHex,
  isRecord,
  normalizeOptionalString,
  normalizeRequiredString,
  readPositiveNumber,
  readString,
} from "@/features/product-image-studio/domain/materialLibraryValueReaders";

export function normalizeCompatibleTargets(
  targets: readonly ProductImageStudioMaterialTarget[],
): readonly ProductImageStudioMaterialTarget[] {
  return [...new Set(targets)];
}

export function normalizeThickness(
  thickness: ProductImageStudioMaterialThickness,
): ProductImageStudioMaterialThickness | null {
  return thickness.value > 0 && Number.isFinite(thickness.value) ? thickness : null;
}

export function normalizeOptionalPreviewImage(
  previewImage: ProductImageStudioMaterialPreviewImage | undefined,
): ProductImageStudioMaterialPreviewImage | null | undefined {
  if (!previewImage) {
    return undefined;
  }
  const url = normalizeRequiredString(previewImage.url);
  const alt = normalizeRequiredString(previewImage.alt);
  return url && alt && isProductImageStudioMaterialImageDataUrl(url) ? { alt, url } : null;
}

export function normalizeOptionalSize(
  size: ProductImageStudioSizeMm | undefined,
): ProductImageStudioSizeMm | null | undefined {
  if (!size) {
    return undefined;
  }
  return size.height > 0 && size.width > 0 && Number.isFinite(size.height) && Number.isFinite(size.width) ? size : null;
}

export function normalizeOptionalColorHex(value: string | undefined): string | null | undefined {
  if (!value) {
    return undefined;
  }
  const colorHex = value.trim();
  return isColorHex(colorHex) ? colorHex : null;
}

export function readCompatibleTargets(value: unknown): readonly ProductImageStudioMaterialTarget[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  const targets: ProductImageStudioMaterialTarget[] = [];
  for (const item of value) {
    const target = readCompatibleTarget(item);
    if (!target) {
      return null;
    }
    targets.push(target);
  }
  return normalizeCompatibleTargets(targets);
}

export function readThickness(value: unknown): ProductImageStudioMaterialThickness | null {
  if (!isRecord(value)) {
    return null;
  }
  const thicknessValue = readPositiveNumber(value["value"]);
  const unit = readThicknessUnit(value["unit"]);
  return thicknessValue !== null && unit ? { unit, value: thicknessValue } : null;
}

export function readOptionalPreviewImage(value: unknown): ProductImageStudioMaterialPreviewImage | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    return null;
  }
  const url = readString(value["url"]);
  const alt = readString(value["alt"]);
  return url && alt && isProductImageStudioMaterialImageDataUrl(url) ? { alt, url } : null;
}

export function readOptionalSize(value: unknown): ProductImageStudioSizeMm | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    return null;
  }
  const height = readPositiveNumber(value["height"]);
  const width = readPositiveNumber(value["width"]);
  return height !== null && width !== null ? { height, width } : null;
}

export function readOptionalColorHex(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  const colorHex = readString(value);
  return colorHex && isColorHex(colorHex) ? colorHex : null;
}

export function readOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === "string" ? normalizeOptionalString(value) : null;
}

function readCompatibleTarget(value: unknown): ProductImageStudioMaterialTarget | null {
  return typeof value === "string"
    ? PRODUCT_IMAGE_STUDIO_MATERIAL_TARGETS.find((target) => target === value) ?? null
    : null;
}

function readThicknessUnit(value: unknown): ProductImageStudioMaterialThicknessUnit | null {
  return typeof value === "string"
    ? PRODUCT_IMAGE_STUDIO_MATERIAL_THICKNESS_UNITS.find((unit) => unit === value) ?? null
    : null;
}
