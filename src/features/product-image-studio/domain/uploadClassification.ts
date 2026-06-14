import {
  PRODUCT_IMAGE_STUDIO_PRODUCT_FAMILIES,
  getProductImageStudioProductFamilyLabel,
  type ProductImageStudioProductFamily,
} from "@/features/product-image-studio/domain/productSpecs";
import {
  PRODUCT_IMAGE_STUDIO_ASSET_ROLES,
  assertNever,
  type ProductImageStudioAssetRole,
} from "@/features/product-image-studio/domain/types";

export const PRODUCT_IMAGE_STUDIO_UPLOAD_ASSET_KINDS = ["product_surface", "dieline", "reference"] as const;
export type ProductImageStudioUploadAssetKind = (typeof PRODUCT_IMAGE_STUDIO_UPLOAD_ASSET_KINDS)[number];

export const PRODUCT_IMAGE_STUDIO_UPLOAD_SURFACES = [
  "front",
  "back",
  "inside_spread",
  "flap",
  "dieline",
  "single",
] as const;
export type ProductImageStudioUploadSurface = (typeof PRODUCT_IMAGE_STUDIO_UPLOAD_SURFACES)[number];

type ProductImageStudioUploadClassificationBase = {
  readonly assetKind: ProductImageStudioUploadAssetKind;
  readonly productFamily: ProductImageStudioProductFamily;
  readonly productSpecId: string;
  readonly surface: ProductImageStudioUploadSurface;
};

export type ProductImageStudioUploadClassification = ProductImageStudioUploadClassificationBase & {
  readonly generationRole?: ProductImageStudioAssetRole;
};

export type ProductImageStudioUploadClassificationParseErrorCode =
  | "UPLOAD_CLASSIFICATION_REQUIRED"
  | "PRODUCT_SPEC_ID_REQUIRED"
  | "INVALID_PRODUCT_FAMILY"
  | "INVALID_UPLOAD_ASSET_KIND"
  | "INVALID_UPLOAD_SURFACE"
  | "INCOMPATIBLE_UPLOAD_SURFACE"
  | "INCOMPATIBLE_UPLOAD_ASSET_KIND"
  | "INVALID_GENERATION_ROLE";

export type ProductImageStudioUploadClassificationParseResult =
  | { readonly classification: ProductImageStudioUploadClassification; readonly ok: true }
  | {
      readonly error: {
        readonly code: ProductImageStudioUploadClassificationParseErrorCode;
        readonly message: string;
      };
      readonly ok: false;
    };

type ProductImageStudioUploadClassificationParseFailure = Extract<
  ProductImageStudioUploadClassificationParseResult,
  { readonly ok: false }
>;

const UPLOAD_SURFACE_LABELS = {
  back: "뒷면",
  dieline: "칼선/전개도",
  flap: "플랩",
  front: "앞면",
  inside_spread: "안쪽/펼침면",
  single: "단독 이미지",
} as const satisfies Record<ProductImageStudioUploadSurface, string>;

const UPLOAD_ASSET_KIND_LABELS = {
  dieline: "칼선",
  product_surface: "상품 이미지",
  reference: "참고 이미지",
} as const satisfies Record<ProductImageStudioUploadAssetKind, string>;

const SURFACES_BY_PRODUCT_FAMILY = {
  business_card: ["front", "back"],
  envelope: ["front", "back", "flap", "dieline"],
  folded_card: ["front", "back", "inside_spread"],
  postcard: ["front", "back"],
  seal_sticker: ["single"],
} as const satisfies Record<ProductImageStudioProductFamily, readonly ProductImageStudioUploadSurface[]>;

export function parseProductImageStudioUploadClassification(
  value: unknown,
): ProductImageStudioUploadClassificationParseResult {
  if (!isRecord(value)) {
    return invalidUploadClassification("UPLOAD_CLASSIFICATION_REQUIRED", "업로드 분류를 입력해 주세요.");
  }
  const productSpecId = parseRequiredText(value["productSpecId"]);
  if (!productSpecId) {
    return invalidUploadClassification("PRODUCT_SPEC_ID_REQUIRED", "분류할 상품 규격을 선택해 주세요.");
  }
  const productFamily = parseOneOf(value["productFamily"], PRODUCT_IMAGE_STUDIO_PRODUCT_FAMILIES);
  if (!productFamily) {
    return invalidUploadClassification("INVALID_PRODUCT_FAMILY", "지원하지 않는 상품군입니다.");
  }
  const assetKind = parseOneOf(value["assetKind"], PRODUCT_IMAGE_STUDIO_UPLOAD_ASSET_KINDS);
  if (!assetKind) {
    return invalidUploadClassification("INVALID_UPLOAD_ASSET_KIND", "업로드 이미지 종류가 올바르지 않습니다.");
  }
  const surface = parseOneOf(value["surface"], PRODUCT_IMAGE_STUDIO_UPLOAD_SURFACES);
  if (!surface) {
    return invalidUploadClassification("INVALID_UPLOAD_SURFACE", "업로드 이미지 면 구분이 올바르지 않습니다.");
  }
  if (!isSurfaceAllowedForFamily(productFamily, surface)) {
    return invalidUploadClassification("INCOMPATIBLE_UPLOAD_SURFACE", "상품군과 업로드 면 구분이 맞지 않습니다.");
  }
  if (!isAssetKindAllowedForSurface(assetKind, surface)) {
    return invalidUploadClassification("INCOMPATIBLE_UPLOAD_ASSET_KIND", "업로드 이미지 종류와 면 구분이 맞지 않습니다.");
  }
  const generationRole = parseOptionalGenerationRole(value["generationRole"]);
  if (!generationRole.ok) {
    return generationRole;
  }
  const baseClassification: ProductImageStudioUploadClassificationBase = {
    assetKind,
    productFamily,
    productSpecId,
    surface,
  };
  return generationRole.role
    ? { classification: { ...baseClassification, generationRole: generationRole.role }, ok: true }
    : { classification: baseClassification, ok: true };
}

export function getProductImageStudioUploadAssetKindLabel(kind: ProductImageStudioUploadAssetKind): string {
  return UPLOAD_ASSET_KIND_LABELS[kind];
}

export function getProductImageStudioUploadSurfaceLabel(surface: ProductImageStudioUploadSurface): string {
  return UPLOAD_SURFACE_LABELS[surface];
}

export function getProductImageStudioUploadClassificationLabel(
  classification: ProductImageStudioUploadClassification,
): string {
  return `${getProductImageStudioProductFamilyLabel(classification.productFamily)} ${UPLOAD_SURFACE_LABELS[classification.surface]}`;
}

function parseOptionalGenerationRole(
  value: unknown,
):
  | { readonly ok: true; readonly role: ProductImageStudioAssetRole | null }
  | ProductImageStudioUploadClassificationParseFailure {
  if (value === undefined) {
    return { ok: true, role: null };
  }
  const role = parseOneOf(value, PRODUCT_IMAGE_STUDIO_ASSET_ROLES);
  return role
    ? { ok: true, role }
    : invalidUploadClassification("INVALID_GENERATION_ROLE", "생성용 이미지 역할이 올바르지 않습니다.");
}

function isSurfaceAllowedForFamily(
  family: ProductImageStudioProductFamily,
  surface: ProductImageStudioUploadSurface,
): boolean {
  return SURFACES_BY_PRODUCT_FAMILY[family].some((candidate) => candidate === surface);
}

function isAssetKindAllowedForSurface(
  assetKind: ProductImageStudioUploadAssetKind,
  surface: ProductImageStudioUploadSurface,
): boolean {
  switch (assetKind) {
    case "dieline":
      return surface === "dieline";
    case "product_surface":
      return surface !== "dieline";
    case "reference":
      return surface !== "dieline";
    default:
      return assertNever(assetKind);
  }
}

function parseRequiredText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseOneOf<Value extends string>(value: unknown, values: readonly Value[]): Value | null {
  return typeof value === "string" ? values.find((candidate) => candidate === value) ?? null : null;
}

function invalidUploadClassification(
  code: ProductImageStudioUploadClassificationParseErrorCode,
  message: string,
): ProductImageStudioUploadClassificationParseFailure {
  return { error: { code, message }, ok: false };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
