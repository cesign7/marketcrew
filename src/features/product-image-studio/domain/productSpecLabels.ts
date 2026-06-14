import type {
  ProductImageStudioEnvelopeFlapPosition,
  ProductImageStudioEnvelopeFlapShape,
  ProductImageStudioFoldAxis,
  ProductImageStudioFoldOpenDirection,
  ProductImageStudioProductFamily,
  ProductImageStudioSizeMm,
} from "@/features/product-image-studio/domain/productSpecTypes";

const PRODUCT_FAMILY_LABELS = {
  business_card: "명함",
  envelope: "봉투",
  folded_card: "접이식 카드",
  postcard: "엽서",
  seal_sticker: "봉합스티커",
} as const satisfies Record<ProductImageStudioProductFamily, string>;

const FOLD_AXIS_LABELS = {
  horizontal: "가로 접힘",
  vertical: "세로 접힘",
} as const satisfies Record<ProductImageStudioFoldAxis, string>;

const FOLD_OPEN_DIRECTION_LABELS = {
  opens_down: "아래쪽으로 열림",
  opens_left: "왼쪽으로 열림",
  opens_right: "오른쪽으로 열림",
  opens_up: "위쪽으로 열림",
} as const satisfies Record<ProductImageStudioFoldOpenDirection, string>;

const ENVELOPE_FLAP_POSITION_LABELS = {
  bottom: "하단 플랩",
  left: "왼쪽 플랩",
  right: "오른쪽 플랩",
  top: "상단 플랩",
} as const satisfies Record<ProductImageStudioEnvelopeFlapPosition, string>;

const ENVELOPE_FLAP_SHAPE_LABELS = {
  jacket: "자켓",
  round: "라운드",
  square: "사각",
  triangle: "삼각",
} as const satisfies Record<ProductImageStudioEnvelopeFlapShape, string>;

export function getProductImageStudioProductFamilyLabel(family: ProductImageStudioProductFamily): string {
  return PRODUCT_FAMILY_LABELS[family];
}

export function getProductImageStudioFoldAxisLabel(axis: ProductImageStudioFoldAxis): string {
  return FOLD_AXIS_LABELS[axis];
}

export function getProductImageStudioFoldOpenDirectionLabel(direction: ProductImageStudioFoldOpenDirection): string {
  return FOLD_OPEN_DIRECTION_LABELS[direction];
}

export function getProductImageStudioEnvelopeFlapPositionLabel(position: ProductImageStudioEnvelopeFlapPosition): string {
  return ENVELOPE_FLAP_POSITION_LABELS[position];
}

export function getProductImageStudioEnvelopeFlapShapeLabel(shape: ProductImageStudioEnvelopeFlapShape): string {
  return ENVELOPE_FLAP_SHAPE_LABELS[shape];
}

export function formatProductImageStudioSizeMm(size: ProductImageStudioSizeMm): string {
  return `${size.width} x ${size.height}mm`;
}
