import {
  PRODUCT_IMAGE_STUDIO_ENVELOPE_FLAP_POSITIONS,
  PRODUCT_IMAGE_STUDIO_ENVELOPE_FLAP_SHAPES,
  PRODUCT_IMAGE_STUDIO_FOLD_AXES,
  PRODUCT_IMAGE_STUDIO_FOLD_OPEN_DIRECTIONS,
  PRODUCT_IMAGE_STUDIO_PRODUCT_FAMILIES,
  PRODUCT_IMAGE_STUDIO_SEAL_STICKER_SHAPES,
  type ProductImageStudioFoldAxis,
  type ProductImageStudioFoldOpenDirection,
  type ProductImageStudioProductSpecParseErrorCode,
  type ProductImageStudioProductSpecParseFailure,
  type ProductImageStudioProductSpecParseResult,
  type ProductImageStudioSizeMm,
} from "@/features/product-image-studio/domain/productSpecTypes";
import { assertNever } from "@/features/product-image-studio/domain/types";

export {
  PRODUCT_IMAGE_STUDIO_ENVELOPE_FLAP_POSITIONS,
  PRODUCT_IMAGE_STUDIO_ENVELOPE_FLAP_SHAPES,
  PRODUCT_IMAGE_STUDIO_FOLD_AXES,
  PRODUCT_IMAGE_STUDIO_FOLD_OPEN_DIRECTIONS,
  PRODUCT_IMAGE_STUDIO_PRODUCT_FAMILIES,
  PRODUCT_IMAGE_STUDIO_SEAL_STICKER_SHAPES,
} from "@/features/product-image-studio/domain/productSpecTypes";
export type {
  ProductImageStudioEnvelopeFlapPosition,
  ProductImageStudioEnvelopeFlapShape,
  ProductImageStudioEnvelopeProductSpec,
  ProductImageStudioFlatProductSpec,
  ProductImageStudioFoldAxis,
  ProductImageStudioFoldOpenDirection,
  ProductImageStudioFoldedCardProductSpec,
  ProductImageStudioProductFamily,
  ProductImageStudioProductSpec,
  ProductImageStudioProductSpecParseErrorCode,
  ProductImageStudioProductSpecParseFailure,
  ProductImageStudioProductSpecParseResult,
  ProductImageStudioSealStickerProductSpec,
  ProductImageStudioSealStickerShape,
  ProductImageStudioSizeMm,
} from "@/features/product-image-studio/domain/productSpecTypes";
export {
  formatProductImageStudioSizeMm,
  getProductImageStudioEnvelopeFlapPositionLabel,
  getProductImageStudioEnvelopeFlapShapeLabel,
  getProductImageStudioFoldAxisLabel,
  getProductImageStudioFoldOpenDirectionLabel,
  getProductImageStudioProductFamilyLabel,
} from "@/features/product-image-studio/domain/productSpecLabels";

type ProductImageStudioSizeParseResult =
  | { readonly ok: true; readonly sizeMm: ProductImageStudioSizeMm }
  | ProductImageStudioProductSpecParseFailure;

const OPEN_SIZE_TOLERANCE_MM = 0.001;

export function parseProductImageStudioProductSpec(value: unknown): ProductImageStudioProductSpecParseResult {
  if (!isRecord(value)) {
    return invalidProductSpec("PRODUCT_SPEC_REQUIRED", "상품 규격을 입력해 주세요.");
  }
  const id = parseRequiredText(value["id"]);
  if (!id) {
    return invalidProductSpec("PRODUCT_SPEC_ID_REQUIRED", "상품 규격 ID를 입력해 주세요.");
  }
  const name = parseRequiredText(value["name"]);
  if (!name) {
    return invalidProductSpec("PRODUCT_SPEC_NAME_REQUIRED", "상품 규격 이름을 입력해 주세요.");
  }
  const family = parseOneOf(value["family"], PRODUCT_IMAGE_STUDIO_PRODUCT_FAMILIES);
  if (!family) {
    return invalidProductSpec("INVALID_PRODUCT_FAMILY", "지원하지 않는 상품군입니다.");
  }
  switch (family) {
    case "business_card":
    case "postcard":
      return parseFlatProductSpec(value, id, name, family);
    case "envelope":
      return parseEnvelopeProductSpec(value, id, name);
    case "folded_card":
      return parseFoldedCardProductSpec(value, id, name);
    case "seal_sticker":
      return parseSealStickerProductSpec(value, id, name);
    default:
      return assertNever(family);
  }
}

function parseFlatProductSpec(
  value: Readonly<Record<string, unknown>>,
  id: string,
  name: string,
  family: "postcard" | "business_card",
): ProductImageStudioProductSpecParseResult {
  const size = parseSizeMm(value["sizeMm"]);
  return size.ok ? { ok: true, spec: { family, id, name, sizeMm: size.sizeMm } } : size;
}

function parseEnvelopeProductSpec(
  value: Readonly<Record<string, unknown>>,
  id: string,
  name: string,
): ProductImageStudioProductSpecParseResult {
  const size = parseSizeMm(value["sizeMm"]);
  if (!size.ok) {
    return size;
  }
  const flapPosition = parseOneOf(value["flapPosition"], PRODUCT_IMAGE_STUDIO_ENVELOPE_FLAP_POSITIONS);
  if (!flapPosition) {
    return invalidProductSpec("INVALID_ENVELOPE_FLAP_POSITION", "봉투 플랩 위치가 올바르지 않습니다.");
  }
  const flapShape = parseOneOf(value["flapShape"], PRODUCT_IMAGE_STUDIO_ENVELOPE_FLAP_SHAPES);
  if (!flapShape) {
    return invalidProductSpec("INVALID_ENVELOPE_FLAP_SHAPE", "봉투 플랩 형태가 올바르지 않습니다.");
  }
  return { ok: true, spec: { family: "envelope", flapPosition, flapShape, id, name, sizeMm: size.sizeMm } };
}

function parseFoldedCardProductSpec(
  value: Readonly<Record<string, unknown>>,
  id: string,
  name: string,
): ProductImageStudioProductSpecParseResult {
  const foldedSize = parseSizeMm(value["foldedSizeMm"]);
  const openSize = parseSizeMm(value["openSizeMm"]);
  if (!foldedSize.ok) {
    return foldedSize;
  }
  if (!openSize.ok) {
    return openSize;
  }
  const foldAxis = parseOneOf(value["foldAxis"], PRODUCT_IMAGE_STUDIO_FOLD_AXES);
  if (!foldAxis) {
    return invalidProductSpec("INVALID_FOLD_AXIS", "접힘 축이 올바르지 않습니다.");
  }
  const openDirection = parseOneOf(value["openDirection"], PRODUCT_IMAGE_STUDIO_FOLD_OPEN_DIRECTIONS);
  if (!openDirection || !isOpenDirectionAllowedForAxis(foldAxis, openDirection)) {
    return invalidProductSpec("INVALID_FOLD_OPEN_DIRECTION", "접이식 카드가 열리는 방향이 올바르지 않습니다.");
  }
  if (!hasPossibleFoldedCardGeometry(foldAxis, foldedSize.sizeMm, openSize.sizeMm)) {
    return invalidProductSpec("INVALID_FOLDED_CARD_GEOMETRY", "접힌 크기와 펼친 크기가 접힘 축과 맞지 않습니다.");
  }
  return {
    ok: true,
    spec: {
      family: "folded_card",
      foldAxis,
      foldedSizeMm: foldedSize.sizeMm,
      id,
      name,
      openDirection,
      openSizeMm: openSize.sizeMm,
    },
  };
}

function parseSealStickerProductSpec(
  value: Readonly<Record<string, unknown>>,
  id: string,
  name: string,
): ProductImageStudioProductSpecParseResult {
  const size = parseSizeMm(value["sizeMm"]);
  if (!size.ok) {
    return size;
  }
  const shape = parseOneOf(value["shape"], PRODUCT_IMAGE_STUDIO_SEAL_STICKER_SHAPES);
  if (!shape) {
    return invalidProductSpec("INVALID_SEAL_STICKER_SHAPE", "봉합스티커 형태가 올바르지 않습니다.");
  }
  return { ok: true, spec: { family: "seal_sticker", id, name, shape, sizeMm: size.sizeMm } };
}

function parseSizeMm(value: unknown): ProductImageStudioSizeParseResult {
  if (!isRecord(value)) {
    return invalidProductSpec("INVALID_SIZE", "상품 규격 크기가 올바르지 않습니다.");
  }
  const height = parsePositiveNumber(value["height"]);
  const width = parsePositiveNumber(value["width"]);
  return height !== null && width !== null
    ? { ok: true, sizeMm: { height, width } }
    : invalidProductSpec("INVALID_SIZE", "상품 규격 크기는 0보다 큰 숫자여야 합니다.");
}

function hasPossibleFoldedCardGeometry(
  foldAxis: ProductImageStudioFoldAxis,
  foldedSize: ProductImageStudioSizeMm,
  openSize: ProductImageStudioSizeMm,
): boolean {
  switch (foldAxis) {
    case "horizontal":
      return sameMm(openSize.width, foldedSize.width) && sameMm(openSize.height, foldedSize.height * 2);
    case "vertical":
      return sameMm(openSize.width, foldedSize.width * 2) && sameMm(openSize.height, foldedSize.height);
    default:
      return assertNever(foldAxis);
  }
}

function isOpenDirectionAllowedForAxis(
  foldAxis: ProductImageStudioFoldAxis,
  direction: ProductImageStudioFoldOpenDirection,
): boolean {
  switch (foldAxis) {
    case "horizontal":
      return direction === "opens_up" || direction === "opens_down";
    case "vertical":
      return direction === "opens_left" || direction === "opens_right";
    default:
      return assertNever(foldAxis);
  }
}

function sameMm(left: number, right: number): boolean {
  return Math.abs(left - right) <= OPEN_SIZE_TOLERANCE_MM;
}

function parsePositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function parseRequiredText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseOneOf<Value extends string>(value: unknown, values: readonly Value[]): Value | null {
  return typeof value === "string" ? values.find((candidate) => candidate === value) ?? null : null;
}

function invalidProductSpec(
  code: ProductImageStudioProductSpecParseErrorCode,
  message: string,
): ProductImageStudioProductSpecParseFailure {
  return { error: { code, message }, ok: false };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
