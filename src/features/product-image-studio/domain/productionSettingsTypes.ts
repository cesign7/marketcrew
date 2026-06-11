export const PRODUCT_IMAGE_STUDIO_OUTPUT_PURPOSES = [
  "smartstore_list",
  "smartstore_main",
  "detail_top",
  "detail_scene",
] as const;
export type ProductImageStudioOutputPurpose = (typeof PRODUCT_IMAGE_STUDIO_OUTPUT_PURPOSES)[number];

export const PRODUCT_IMAGE_STUDIO_SHOT_ANGLES = ["top_view", "front_45", "standing", "detail_closeup"] as const;
export type ProductImageStudioShotAngle = (typeof PRODUCT_IMAGE_STUDIO_SHOT_ANGLES)[number];

export const PRODUCT_IMAGE_STUDIO_GENERATION_METHODS = ["mockup_composite_first", "ai_recreate_assist"] as const;
export type ProductImageStudioGenerationMethod = (typeof PRODUCT_IMAGE_STUDIO_GENERATION_METHODS)[number];

export const PRODUCT_IMAGE_STUDIO_DESIGN_PRESERVATION_MODES = ["exact_composite", "ai_redraw_allowed"] as const;
export type ProductImageStudioDesignPreservationMode = (typeof PRODUCT_IMAGE_STUDIO_DESIGN_PRESERVATION_MODES)[number];

export const PRODUCT_IMAGE_STUDIO_SPEC_SOURCES = ["manual_input"] as const;
export type ProductImageStudioSpecSource = (typeof PRODUCT_IMAGE_STUDIO_SPEC_SOURCES)[number];

export type ProductImageStudioSizeMm = {
  readonly height: number;
  readonly width: number;
};

export type ProductImageStudioCardSpec =
  | {
      readonly foldDirection: "left_fold" | "top_fold";
      readonly foldedSizeMm: ProductImageStudioSizeMm;
      readonly format: "folded_card";
      readonly openSizeMm: ProductImageStudioSizeMm;
      readonly paperFinish: "matte" | "glossy" | "textured";
      readonly paperWeightGsm: number;
    }
  | {
      readonly format: "postcard_flat";
      readonly paperFinish: "matte" | "glossy" | "textured";
      readonly paperWeightGsm: number;
      readonly sizeMm: ProductImageStudioSizeMm;
    };

export type ProductImageStudioEnvelopeSpec = {
  readonly flapDirection: "top_flap" | "side_flap";
  readonly sizeMm: ProductImageStudioSizeMm;
};

export type ProductImageStudioSealStickerSpec =
  | {
      readonly placement: "envelope_flap_center" | "envelope_corner" | "cylindrical_surface";
      readonly shape: "circle";
      readonly sizeMm: { readonly diameter: number };
    }
  | {
      readonly placement: "envelope_flap_center" | "envelope_corner" | "cylindrical_surface";
      readonly shape: "rectangle";
      readonly sizeMm: ProductImageStudioSizeMm;
    };

export type ProductImageStudioSceneProductionSettings = {
  readonly designPreservation: ProductImageStudioDesignPreservationMode;
  readonly generationMethod: ProductImageStudioGenerationMethod;
  readonly outputPurpose: ProductImageStudioOutputPurpose;
  readonly shotAngle: ProductImageStudioShotAngle;
};

export type ProductImageStudioProductionSettings = {
  readonly card: ProductImageStudioCardSpec;
  readonly envelope: ProductImageStudioEnvelopeSpec;
  readonly scene: ProductImageStudioSceneProductionSettings;
  readonly sealSticker: ProductImageStudioSealStickerSpec;
  readonly specSource: ProductImageStudioSpecSource;
};

export type ProductImageStudioOption<Value extends string> = {
  readonly helper: string;
  readonly label: string;
  readonly value: Value;
};

export type ProductImageStudioProductionSettingsParseResult =
  | { readonly ok: true; readonly settings: ProductImageStudioProductionSettings }
  | { readonly error: { readonly code: string; readonly message: string }; readonly ok: false };

export const PRODUCT_IMAGE_STUDIO_OUTPUT_PURPOSE_OPTIONS = [
  { helper: "목록에서 잘리지 않도록 상품 중심 여백을 둡니다.", label: "스마트스토어 리스트", value: "smartstore_list" },
  { helper: "대표이미지에서 세트 구성이 바로 보이게 합니다.", label: "스마트스토어 메인", value: "smartstore_main" },
  { helper: "상세페이지 첫 화면용으로 정보성과 분위기를 같이 잡습니다.", label: "상세 상단", value: "detail_top" },
  { helper: "상세페이지 중간 감성컷으로 배경과 소품을 더 활용합니다.", label: "상세 설정샷", value: "detail_scene" },
] as const satisfies readonly ProductImageStudioOption<ProductImageStudioOutputPurpose>[];

export const PRODUCT_IMAGE_STUDIO_SHOT_ANGLE_OPTIONS = [
  { helper: "크기와 구성을 설명하기 쉬운 평면 컷입니다.", label: "위에서 본 컷", value: "top_view" },
  { helper: "종이 두께와 그림자를 자연스럽게 보여줍니다.", label: "45도 설정샷", value: "front_45" },
  { helper: "접이식 카드의 세움 형태를 강조합니다.", label: "세운 카드 컷", value: "standing" },
  { helper: "스티커, 플랩, 종이 질감 같은 디테일을 강조합니다.", label: "디테일 클로즈업", value: "detail_closeup" },
] as const satisfies readonly ProductImageStudioOption<ProductImageStudioShotAngle>[];

export const PRODUCT_IMAGE_STUDIO_GENERATION_METHOD_OPTIONS = [
  { helper: "빈 목업 장면을 만들고 업로드 디자인을 합성하는 기본 방식입니다.", label: "목업 합성 우선", value: "mockup_composite_first" },
  { helper: "참고용 초안에만 사용합니다. 디자인 왜곡 검수가 더 필요합니다.", label: "AI 재생성 보조", value: "ai_recreate_assist" },
] as const satisfies readonly ProductImageStudioOption<ProductImageStudioGenerationMethod>[];
