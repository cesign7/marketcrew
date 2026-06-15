import {
  createProductImageStudioMaterialRecord,
  isProductImageStudioMaterialImageDataUrl,
  PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_MAX_DATA_URL_LENGTH,
  PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_MIME_TYPES,
  PRODUCT_IMAGE_STUDIO_MATERIAL_THICKNESS_UNITS,
  readProductImageStudioMaterialImageMimeType,
  type ProductImageStudioMaterialPreviewImage,
  type ProductImageStudioMaterialRecord,
  type ProductImageStudioMaterialTarget,
  type ProductImageStudioMaterialThicknessUnit,
} from "@/features/product-image-studio/domain/materialLibrary";

export const PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_ACCEPT = PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_MIME_TYPES.join(",");
export const PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_INVALID_READ_MESSAGE =
  "재질 이미지를 읽지 못했습니다. 다시 선택해 주세요.";
export const PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_OVERSIZED_DATA_URL_MESSAGE =
  "재질 이미지 데이터가 너무 커서 저장할 수 없습니다.";
export const PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_OVERSIZED_FILE_MESSAGE =
  "재질 이미지는 1MB 이하 파일만 사용할 수 있습니다.";
export const PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_UNSUPPORTED_TYPE_MESSAGE =
  "재질 이미지는 PNG, JPG, WebP 파일만 사용할 수 있습니다.";

export type ProductImageStudioMaterialDraft = {
  readonly colorHex: string;
  readonly colorName: string;
  readonly compatibleTargets: readonly ProductImageStudioMaterialTarget[];
  readonly editingId?: string;
  readonly name: string;
  readonly notes: string;
  readonly previewImage?: ProductImageStudioMaterialPreviewImage;
  readonly sizeHeight: string;
  readonly sizeWidth: string;
  readonly surface: string;
  readonly thicknessUnit: ProductImageStudioMaterialThicknessUnit;
  readonly thicknessValue: string;
};

type OptionalDimensionResult =
  | { readonly kind: "empty" }
  | { readonly kind: "invalid" }
  | { readonly kind: "valid"; readonly value: number };

export function createDefaultMaterialDraft(): ProductImageStudioMaterialDraft {
  return {
    colorHex: "",
    colorName: "내추럴 화이트",
    compatibleTargets: [],
    name: "",
    notes: "",
    sizeHeight: "",
    sizeWidth: "",
    surface: "매트",
    thicknessUnit: "gsm",
    thicknessValue: "240",
  };
}

export function createMaterialDraftFromRecord(
  material: ProductImageStudioMaterialRecord,
): ProductImageStudioMaterialDraft {
  return {
    colorHex: material.colorHex ?? "",
    colorName: material.colorName,
    compatibleTargets: material.compatibleTargets,
    editingId: material.id,
    name: material.name,
    notes: material.notes ?? "",
    ...(material.previewImage ? { previewImage: material.previewImage } : {}),
    sizeHeight: material.sizeMm ? String(material.sizeMm.height) : "",
    sizeWidth: material.sizeMm ? String(material.sizeMm.width) : "",
    surface: material.surface,
    thicknessUnit: material.thickness.unit,
    thicknessValue: String(material.thickness.value),
  };
}

export function createMaterialRecordFromDraft(
  draft: ProductImageStudioMaterialDraft,
  materials: readonly ProductImageStudioMaterialRecord[],
):
  | { readonly kind: "invalid"; readonly message: string }
  | { readonly kind: "valid"; readonly record: ProductImageStudioMaterialRecord } {
  const name = draft.name.trim();
  if (name.length === 0) {
    return { kind: "invalid", message: "재질 이름을 입력해 주세요." };
  }
  if (draft.compatibleTargets.length === 0) {
    return { kind: "invalid", message: "사용할 상품을 하나 이상 선택해 주세요." };
  }
  const surface = draft.surface.trim();
  if (surface.length === 0) {
    return { kind: "invalid", message: "표면감을 입력해 주세요." };
  }
  const colorName = draft.colorName.trim();
  if (colorName.length === 0) {
    return { kind: "invalid", message: "색상 이름을 입력해 주세요." };
  }
  const thicknessValue = Number(draft.thicknessValue);
  if (!Number.isFinite(thicknessValue) || thicknessValue <= 0) {
    return { kind: "invalid", message: "두께 값은 0보다 큰 숫자로 입력해 주세요." };
  }
  const colorHex = draft.colorHex.trim();
  if (colorHex.length > 0 && !isColorHex(colorHex)) {
    return { kind: "invalid", message: "색상 HEX는 #RRGGBB 형식으로 입력해 주세요." };
  }
  const size = readOptionalSize(draft.sizeWidth, draft.sizeHeight);
  if (size.kind === "invalid") {
    return { kind: "invalid", message: "사이즈는 가로와 세로를 모두 0보다 큰 숫자로 입력해 주세요." };
  }
  const previewImageIssue = draft.previewImage ? getMaterialImageDataUrlIssue(draft.previewImage.url) : null;
  if (previewImageIssue) {
    return { kind: "invalid", message: previewImageIssue };
  }
  const existingMaterial = draft.editingId ? materials.find((material) => material.id === draft.editingId) : undefined;
  const record = createProductImageStudioMaterialRecord({
    colorName,
    compatibleTargets: draft.compatibleTargets,
    createdAt: existingMaterial?.createdAt ?? new Date().toISOString(),
    id: draft.editingId ?? createId("material"),
    name,
    surface,
    thickness: { unit: draft.thicknessUnit, value: thicknessValue },
    ...(colorHex ? { colorHex } : {}),
    ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
    ...(draft.previewImage
      ? { previewImage: { alt: draft.previewImage.alt.trim() || `${name} 재질 미리보기`, url: draft.previewImage.url } }
      : {}),
    ...(size.kind === "valid" ? { sizeMm: { height: size.height, width: size.width } } : {}),
  });
  return record ? { kind: "valid", record } : { kind: "invalid", message: "용지·재질 입력값을 다시 확인해 주세요." };
}

export function getMaterialImageFileIssue(file: Pick<File, "size" | "type">): string | null {
  if (!readProductImageStudioMaterialImageMimeType(file.type)) {
    return PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_UNSUPPORTED_TYPE_MESSAGE;
  }
  return file.size > PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_MAX_BYTES
    ? PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_OVERSIZED_FILE_MESSAGE
    : null;
}

export function getMaterialImageDataUrlIssue(dataUrl: string): string | null {
  if (dataUrl.length > PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_MAX_DATA_URL_LENGTH) {
    return PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_OVERSIZED_DATA_URL_MESSAGE;
  }
  const mimeType = readMaterialImageDataUrlMimeType(dataUrl);
  if (!mimeType) {
    return PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_INVALID_READ_MESSAGE;
  }
  return readProductImageStudioMaterialImageMimeType(mimeType)
    ? null
    : PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_UNSUPPORTED_TYPE_MESSAGE;
}

export function createMaterialPreviewImage(input: {
  readonly dataUrl: string;
  readonly fileName: string;
  readonly materialName: string;
}): ProductImageStudioMaterialPreviewImage {
  const sourceName = input.materialName.trim() || input.fileName.trim() || "선택한 이미지";
  return { alt: `${sourceName} 재질 미리보기`, url: input.dataUrl };
}

export function upsertMaterialRecord(
  materials: readonly ProductImageStudioMaterialRecord[],
  material: ProductImageStudioMaterialRecord,
): readonly ProductImageStudioMaterialRecord[] {
  return materials.some((candidate) => candidate.id === material.id)
    ? materials.map((candidate) => (candidate.id === material.id ? material : candidate))
    : [material, ...materials];
}

export function toggleMaterialTarget(
  selectedTargets: readonly ProductImageStudioMaterialTarget[],
  target: ProductImageStudioMaterialTarget,
): readonly ProductImageStudioMaterialTarget[] {
  return selectedTargets.some((selectedTarget) => selectedTarget === target)
    ? selectedTargets.filter((selectedTarget) => selectedTarget !== target)
    : [...selectedTargets, target];
}

export function readMaterialThicknessUnit(value: string): ProductImageStudioMaterialThicknessUnit {
  return PRODUCT_IMAGE_STUDIO_MATERIAL_THICKNESS_UNITS.find((unit) => unit === value) ?? "gsm";
}

export function formatMaterialSummary(material: ProductImageStudioMaterialRecord): string {
  const size = material.sizeMm ? ` · ${material.sizeMm.width} x ${material.sizeMm.height}mm` : "";
  return `${material.surface} · ${material.colorName} · ${material.thickness.value} ${material.thickness.unit}${size}`;
}

function readOptionalSize(
  widthValue: string,
  heightValue: string,
): { readonly height: number; readonly kind: "valid"; readonly width: number } | { readonly kind: "empty" | "invalid" } {
  const width = readOptionalDimension(widthValue);
  const height = readOptionalDimension(heightValue);
  if (width.kind === "empty" && height.kind === "empty") {
    return { kind: "empty" };
  }
  if (width.kind === "valid" && height.kind === "valid") {
    return { height: height.value, kind: "valid", width: width.value };
  }
  return { kind: "invalid" };
}

function readOptionalDimension(value: string): OptionalDimensionResult {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return { kind: "empty" };
  }
  const numberValue = Number(trimmedValue);
  return Number.isFinite(numberValue) && numberValue > 0 ? { kind: "valid", value: numberValue } : { kind: "invalid" };
}

function isColorHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function readMaterialImageDataUrlMimeType(dataUrl: string): string | null {
  if (!isProductImageStudioMaterialImageDataUrl(dataUrl) && !dataUrl.startsWith("data:")) {
    return null;
  }
  const commaIndex = dataUrl.indexOf(",");
  const semicolonIndex = dataUrl.indexOf(";");
  return semicolonIndex > 5 && semicolonIndex < commaIndex ? dataUrl.slice(5, semicolonIndex).toLowerCase() : null;
}

function createId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now().toString(36)}`;
}
