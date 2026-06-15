import {
  type ProductImageStudioMaterialRecord,
} from "@/features/product-image-studio/domain/materialLibraryTypes";
import {
  normalizeCompatibleTargets,
  normalizeOptionalColorHex,
  normalizeOptionalPreviewImage,
  normalizeOptionalSize,
  normalizeThickness,
  readCompatibleTargets,
  readOptionalColorHex,
  readOptionalPreviewImage,
  readOptionalSize,
  readOptionalString,
  readThickness,
} from "@/features/product-image-studio/domain/materialLibraryRecordFields";
import {
  normalizeOptionalString,
  normalizeRequiredString,
  isRecord,
  readString,
} from "@/features/product-image-studio/domain/materialLibraryValueReaders";

export function createProductImageStudioMaterialRecord(
  input: ProductImageStudioMaterialRecord,
): ProductImageStudioMaterialRecord | null {
  const id = normalizeRequiredString(input.id);
  const createdAt = normalizeRequiredString(input.createdAt);
  const name = normalizeRequiredString(input.name);
  const surface = normalizeRequiredString(input.surface);
  const colorName = normalizeRequiredString(input.colorName);
  const compatibleTargets = normalizeCompatibleTargets(input.compatibleTargets);
  const thickness = normalizeThickness(input.thickness);
  if (!id || !createdAt || !name || !surface || !colorName || compatibleTargets.length === 0 || !thickness) {
    return null;
  }
  const colorHex = normalizeOptionalColorHex(input.colorHex);
  if (colorHex === null) {
    return null;
  }
  const sizeMm = normalizeOptionalSize(input.sizeMm);
  if (sizeMm === null) {
    return null;
  }
  const previewImage = normalizeOptionalPreviewImage(input.previewImage);
  if (previewImage === null) {
    return null;
  }
  const notes = normalizeOptionalString(input.notes);
  return {
    colorName,
    compatibleTargets,
    createdAt,
    id,
    name,
    surface,
    thickness,
    ...(colorHex ? { colorHex } : {}),
    ...(notes ? { notes } : {}),
    ...(previewImage ? { previewImage } : {}),
    ...(sizeMm ? { sizeMm } : {}),
  };
}

export function parseProductImageStudioMaterialRecord(value: unknown): ProductImageStudioMaterialRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value["id"]);
  const createdAt = readString(value["createdAt"]);
  const name = readString(value["name"]);
  const surface = readString(value["surface"]);
  const colorName = readString(value["colorName"]);
  const compatibleTargets = readCompatibleTargets(value["compatibleTargets"]);
  const thickness = readThickness(value["thickness"]);
  if (!id || !createdAt || !name || !surface || !colorName || !compatibleTargets || !thickness) {
    return null;
  }
  const colorHex = readOptionalColorHex(value["colorHex"]);
  if (colorHex === null) {
    return null;
  }
  const previewImage = readOptionalPreviewImage(value["previewImage"]);
  if (previewImage === null) {
    return null;
  }
  const sizeMm = readOptionalSize(value["sizeMm"]);
  if (sizeMm === null) {
    return null;
  }
  const notes = readOptionalString(value["notes"]);
  if (notes === null) {
    return null;
  }
  return createProductImageStudioMaterialRecord({
    colorName,
    compatibleTargets,
    createdAt,
    id,
    name,
    surface,
    thickness,
    ...(colorHex ? { colorHex } : {}),
    ...(notes ? { notes } : {}),
    ...(previewImage ? { previewImage } : {}),
    ...(sizeMm ? { sizeMm } : {}),
  });
}
