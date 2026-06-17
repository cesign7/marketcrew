// SIZE_OK - pure AI tool data table; lookup and runnable behavior live in ProductImageStudioAiToolLookup.ts.
import { Activity, FileDown, FileText, Image as ImageIcon, Layers, Settings, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ProductImageStudioAiToolKind = "generator" | "planned" | "svg";

export type ProductImageStudioAiToolUploadSlot = {
  readonly accept: string;
  readonly description: string;
  readonly id: string;
  readonly title: string;
};

export type ProductImageStudioAiToolChoiceOption = {
  readonly id: string;
  readonly label: string;
};

export type ProductImageStudioAiToolChoiceGroup = {
  readonly id: string;
  readonly options: readonly [ProductImageStudioAiToolChoiceOption, ...ProductImageStudioAiToolChoiceOption[]];
  readonly title: string;
};

export type ProductImageStudioAiTool = {
  readonly choiceGroups: readonly ProductImageStudioAiToolChoiceGroup[];
  readonly description: string;
  readonly icon: LucideIcon;
  readonly id: string;
  readonly initialInstruction: string;
  readonly initialPrompt: string;
  readonly kind: ProductImageStudioAiToolKind;
  readonly previewLabel: string;
  readonly statusLabel: string;
  readonly title: string;
  readonly uploadHint: string;
  readonly uploadSlots: readonly ProductImageStudioAiToolUploadSlot[];
  readonly uploadTitle: string;
};

const IMAGE_UPLOAD_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

export const PRODUCT_IMAGE_STUDIO_AI_TOOLS = [
  {
    description: "인쇄물 디자인을 업로드하고 실제 규격에 맞춘 설정샷을 만듭니다.",
    choiceGroups: [
      {
        id: "product-kind",
        options: [
          { id: "single", label: "단품" },
          { id: "set", label: "세트" },
          { id: "detail", label: "디테일" },
        ],
        title: "상품 구성",
      },
      {
        id: "scene-style",
        options: [
          { id: "studio", label: "스튜디오" },
          { id: "season", label: "시즌" },
          { id: "premium", label: "프리미엄" },
        ],
        title: "연출 컷",
      },
      {
        id: "prop-density",
        options: [
          { id: "clean", label: "간결" },
          { id: "balanced", label: "적당" },
          { id: "rich", label: "풍성" },
        ],
        title: "소품 밀도",
      },
    ],
    icon: Sparkles,
    id: "product-staging",
    initialInstruction: "실제 카드 크기 기준으로 연필, 리본, 봉투 크기가 자연스럽게 보이게 합니다.",
    initialPrompt: "크리스마스 카드와 봉투를 프리미엄 스테이셔너리 느낌의 밝은 테이블 위에 배치합니다. 업로드한 디자인과 비율은 변경하지 않습니다.",
    kind: "generator",
    previewLabel: "크리스마스 카드 설정샷",
    statusLabel: "사용 가능",
    title: "상품 설정샷 생성",
    uploadHint: "디자인을 넣거나 라이브러리에서 선택",
    uploadSlots: [
      { accept: IMAGE_UPLOAD_ACCEPT, description: "카드 앞면, 엽서, 접이식 대표 디자인", id: "card-design", title: "카드 디자인" },
      { accept: IMAGE_UPLOAD_ACCEPT, description: "봉투 앞면, 플랩, 안쪽 패턴 기준", id: "envelope-design", title: "봉투 디자인" },
      { accept: IMAGE_UPLOAD_ACCEPT, description: "원형·사각 봉합스티커 디자인", id: "seal-sticker", title: "봉합스티커" },
      { accept: IMAGE_UPLOAD_ACCEPT, description: "배경 톤, 소품, 촬영 분위기 참고", id: "reference-mood", title: "참고 이미지" },
    ],
    uploadTitle: "디자인 또는 참고 이미지 업로드",
  },
  {
    description: "프롬프트와 참고 이미지를 넣어 새 이미지를 생성합니다.",
    choiceGroups: [
      {
        id: "image-type",
        options: [
          { id: "product", label: "상품컷" },
          { id: "character", label: "캐릭터" },
          { id: "pattern", label: "패턴" },
        ],
        title: "이미지 유형",
      },
      {
        id: "render-style",
        options: [
          { id: "photo", label: "사진형" },
          { id: "illustration", label: "일러스트" },
          { id: "flat", label: "플랫" },
        ],
        title: "스타일",
      },
    ],
    icon: ImageIcon,
    id: "image-generator",
    initialInstruction: "상품이 잘 보이는 구도와 자연스러운 소품 비례를 유지합니다.",
    initialPrompt: "인쇄물 상품 판매에 사용할 밝고 정돈된 상품 이미지를 생성합니다.",
    kind: "generator",
    previewLabel: "AI 생성 이미지",
    statusLabel: "사용 가능",
    title: "AI 이미지 생성기",
    uploadHint: "참고 이미지는 선택 사항입니다.",
    uploadSlots: [
      { accept: IMAGE_UPLOAD_ACCEPT, description: "없어도 프롬프트만으로 생성 가능", id: "reference-image", title: "참고 이미지" },
      { accept: IMAGE_UPLOAD_ACCEPT, description: "톤, 질감, 구도만 참고", id: "style-reference", title: "스타일 참고" },
    ],
    uploadTitle: "참고 이미지 업로드",
  },
  {
    description: "PNG 이미지를 로컬 벡터 SVG로 바꿉니다.",
    choiceGroups: [],
    icon: FileDown,
    id: "svg-conversion",
    initialInstruction: "캐릭터, 아이콘, 스티커처럼 선명한 벡터 형태로 정리합니다.",
    initialPrompt: "업로드한 PNG 이미지를 벡터 SVG로 변환합니다.",
    kind: "svg",
    previewLabel: "SVG 변환 결과",
    statusLabel: "새 도구",
    title: "SVG 변환",
    uploadHint: "PNG 파일을 선택하고 스타일을 고릅니다.",
    uploadSlots: [],
    uploadTitle: "PNG 파일 업로드",
  },
  {
    description: "촬영 분위기에 맞는 배경과 소품 후보를 준비합니다.",
    choiceGroups: [
      {
        id: "season",
        options: [
          { id: "neutral", label: "상시" },
          { id: "christmas", label: "크리스마스" },
          { id: "new-year", label: "연하장" },
        ],
        title: "시즌",
      },
      {
        id: "background-depth",
        options: [
          { id: "minimal", label: "미니멀" },
          { id: "tabletop", label: "테이블" },
          { id: "lifestyle", label: "라이프" },
        ],
        title: "배경 깊이",
      },
    ],
    icon: ImageIcon,
    id: "background-props",
    initialInstruction: "계절 소품은 상품보다 작게 배치하고 인쇄물 디자인을 가리지 않습니다.",
    initialPrompt: "크리스마스 소품, 리본, 따뜻한 조명으로 카드 세트에 어울리는 배경을 만듭니다.",
    kind: "planned",
    previewLabel: "배경/소품 컷",
    statusLabel: "계획",
    title: "배경/소품 생성",
    uploadHint: "상품이나 분위기 이미지를 선택",
    uploadSlots: [
      { accept: IMAGE_UPLOAD_ACCEPT, description: "상품 크기와 형태 기준", id: "product-reference", title: "상품 기준 이미지" },
      { accept: IMAGE_UPLOAD_ACCEPT, description: "계절, 컬러, 소품 분위기", id: "mood-reference", title: "분위기 참고" },
    ],
    uploadTitle: "상품 또는 참고 이미지 업로드",
  },
  {
    description: "대표 이미지와 상세 이미지에 맞는 출력 비율을 조정합니다.",
    choiceGroups: [
      {
        id: "fill-mode",
        options: [
          { id: "expand", label: "확장" },
          { id: "crop-safe", label: "안전 크롭" },
          { id: "margin", label: "여백" },
        ],
        title: "채움 방식",
      },
      {
        id: "destination",
        options: [
          { id: "smartstore", label: "스마트스토어" },
          { id: "detail", label: "상세" },
          { id: "social", label: "SNS" },
        ],
        title: "사용처",
      },
    ],
    icon: Settings,
    id: "ratio-resize",
    initialInstruction: "원본 디자인 영역은 유지하고 빈 공간만 자연스럽게 확장합니다.",
    initialPrompt: "상품 이미지를 스마트스토어 대표 이미지에 맞는 정사각형 비율로 재구성합니다.",
    kind: "planned",
    previewLabel: "비율 변경 결과",
    statusLabel: "계획",
    title: "비율 변경",
    uploadHint: "비율을 바꿀 원본 이미지를 선택",
    uploadSlots: [
      { accept: IMAGE_UPLOAD_ACCEPT, description: "비율을 바꿀 최종 원본", id: "source-image", title: "원본 이미지" },
    ],
    uploadTitle: "원본 이미지 업로드",
  },
  {
    description: "선택한 결과와 닮은 이미지 후보를 더 만듭니다.",
    choiceGroups: [
      {
        id: "similarity",
        options: [
          { id: "high", label: "거의 동일" },
          { id: "medium", label: "유사" },
          { id: "low", label: "변형" },
        ],
        title: "유사도",
      },
      {
        id: "variation-target",
        options: [
          { id: "props", label: "소품" },
          { id: "background", label: "배경" },
          { id: "tone", label: "톤" },
        ],
        title: "변형 영역",
      },
    ],
    icon: Activity,
    id: "similar-image",
    initialInstruction: "구도와 톤은 유지하되 소품과 배경만 조금씩 변형합니다.",
    initialPrompt: "선택한 상품 설정샷과 거의 비슷한 느낌의 대체 이미지를 생성합니다.",
    kind: "planned",
    previewLabel: "비슷한 이미지",
    statusLabel: "계획",
    title: "비슷한 이미지 생성",
    uploadHint: "기준 이미지를 선택",
    uploadSlots: [
      { accept: IMAGE_UPLOAD_ACCEPT, description: "분위기와 구도의 기준", id: "base-image", title: "기준 이미지" },
      { accept: IMAGE_UPLOAD_ACCEPT, description: "변형하고 싶은 소품·톤 참고", id: "variation-reference", title: "변형 참고" },
    ],
    uploadTitle: "기준 이미지 업로드",
  },
  {
    description: "보관한 디자인을 목업 화면에 합성합니다.",
    choiceGroups: [
      {
        id: "mockup-target",
        options: [
          { id: "card", label: "카드" },
          { id: "envelope", label: "봉투" },
          { id: "sticker", label: "스티커" },
        ],
        title: "합성 대상",
      },
      {
        id: "placement",
        options: [
          { id: "front", label: "앞면" },
          { id: "folded", label: "접힘" },
          { id: "curved", label: "곡면" },
        ],
        title: "표현 방식",
      },
    ],
    icon: Layers,
    id: "mockup-composite",
    initialInstruction: "목업의 원근, 종이 두께, 그림자를 기준으로 디자인을 자연스럽게 합성합니다.",
    initialPrompt: "업로드한 디자인을 카드, 봉투, 스티커 목업에 정확한 비율로 합성합니다.",
    kind: "planned",
    previewLabel: "목업 합성 결과",
    statusLabel: "계획",
    title: "목업 합성",
    uploadHint: "디자인과 목업 이미지를 선택",
    uploadSlots: [
      { accept: IMAGE_UPLOAD_ACCEPT, description: "합성할 카드, 봉투, 스티커 디자인", id: "design-source", title: "디자인 이미지" },
      { accept: IMAGE_UPLOAD_ACCEPT, description: "원근과 그림자를 따를 목업", id: "mockup-base", title: "목업 기준 이미지" },
    ],
    uploadTitle: "디자인 또는 목업 업로드",
  },
  {
    description: "상세페이지용 이미지 구성을 만듭니다.",
    choiceGroups: [
      {
        id: "block-set",
        options: [
          { id: "listing", label: "대표" },
          { id: "detail", label: "상세" },
          { id: "full", label: "전체" },
        ],
        title: "블록 구성",
      },
      {
        id: "sales-tone",
        options: [
          { id: "simple", label: "간결" },
          { id: "premium", label: "프리미엄" },
          { id: "seasonal", label: "시즌" },
        ],
        title: "판매 톤",
      },
    ],
    icon: FileText,
    id: "detail-page-blocks",
    initialInstruction: "대표컷, 구성품컷, 재질컷, 크기 비교컷 순서로 자연스럽게 배치합니다.",
    initialPrompt: "상품 상세페이지에 사용할 이미지 블록을 간결한 판매 흐름으로 구성합니다.",
    kind: "planned",
    previewLabel: "상세 이미지 블록",
    statusLabel: "계획",
    title: "상세 이미지 블록",
    uploadHint: "상품과 구성품 이미지를 선택",
    uploadSlots: [
      { accept: IMAGE_UPLOAD_ACCEPT, description: "상세페이지 첫 화면 대표컷", id: "hero-image", title: "대표 이미지" },
      { accept: IMAGE_UPLOAD_ACCEPT, description: "카드·봉투·스티커 구성품", id: "component-image", title: "구성품 이미지" },
      { accept: IMAGE_UPLOAD_ACCEPT, description: "종이 질감, 두께, 인쇄 디테일", id: "material-image", title: "재질/디테일 컷" },
    ],
    uploadTitle: "상세 이미지 자료 업로드",
  },
] as const satisfies readonly ProductImageStudioAiTool[];
