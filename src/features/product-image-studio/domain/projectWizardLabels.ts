import type { CardDisplayPose, ProductImageStudioAssetRole } from "@/features/product-image-studio/domain/types";

type LabelCopy = {
  readonly helper: string;
  readonly label: string;
};

const UPLOAD_SLOT_LABELS = {
  envelope_front: {
    helper: "봉투 앞면 디자인이나 완성 이미지를 올려 주세요.",
    label: "봉투 앞면",
  },
  envelope_inside_flap: {
    helper: "봉투 안쪽 플랩이 중요한 상품일 때만 추가합니다.",
    label: "봉투 안쪽 플랩",
  },
  folded_card_back: {
    helper: "뒷면 인쇄가 있는 접이식 카드라면 추가합니다.",
    label: "접이식 카드 뒷면",
  },
  folded_card_fold_metadata: {
    helper: "접히는 방향이나 기준선을 보여주는 이미지를 올려 주세요.",
    label: "접는 위치 참고",
  },
  folded_card_inner_spread: {
    helper: "펼친 안쪽 면이 필요한 상품일 때 추가합니다.",
    label: "접이식 카드 안쪽 펼침면",
  },
  folded_card_outer_front: {
    helper: "접이식 카드의 대표 앞면 디자인을 올려 주세요.",
    label: "접이식 카드 앞면",
  },
  postcard_back: {
    helper: "엽서 뒷면 인쇄가 있을 때 추가합니다.",
    label: "엽서 뒷면",
  },
  postcard_front: {
    helper: "접히지 않는 엽서형 카드의 앞면 디자인을 올려 주세요.",
    label: "엽서 앞면",
  },
  reference_mood: {
    helper: "원하는 분위기나 비슷한 촬영 느낌을 참고용으로 올립니다.",
    label: "참고 분위기 이미지",
  },
  seal_sticker: {
    helper: "봉합스티커 디자인 또는 실제 스티커 이미지를 올려 주세요.",
    label: "봉합스티커",
  },
} as const satisfies Record<ProductImageStudioAssetRole, LabelCopy>;

const POSE_LABELS = {
  folded_closed: "접은 카드 닫힌 컷",
  folded_half_open: "접이식 카드 반쯤 열린 컷",
  folded_open_spread: "접이식 카드 펼친 컷",
  folded_standing: "접이식 카드 세운 컷",
  postcard_back_flat: "엽서 뒷면 평면컷",
  postcard_front_flat: "엽서 앞면 평면컷",
  postcard_lifestyle_stack: "엽서 생활형 겹침컷",
} as const satisfies Record<CardDisplayPose, string>;

export function getProductImageStudioUploadSlotLabel(role: ProductImageStudioAssetRole): LabelCopy {
  return UPLOAD_SLOT_LABELS[role];
}

export function getProductImageStudioPoseLabel(pose: CardDisplayPose): string {
  return POSE_LABELS[pose];
}
