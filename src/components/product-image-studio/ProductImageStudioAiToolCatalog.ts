import { Activity, FileDown, FileText, Image as ImageIcon, Layers, Settings, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ProductImageStudioAiToolKind = "generator" | "svg";

export type ProductImageStudioAiTool = {
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
  readonly uploadTitle: string;
};

export const PRODUCT_IMAGE_STUDIO_AI_TOOLS = [
  {
    description: "인쇄물 디자인을 업로드하고 실제 규격에 맞춘 설정샷을 만듭니다.",
    icon: Sparkles,
    id: "product-staging",
    initialInstruction: "실제 카드 크기 기준으로 연필, 리본, 봉투 크기가 자연스럽게 보이게 합니다.",
    initialPrompt: "크리스마스 카드와 봉투를 프리미엄 스테이셔너리 느낌의 밝은 테이블 위에 배치합니다. 업로드한 디자인과 비율은 변경하지 않습니다.",
    kind: "generator",
    previewLabel: "크리스마스 카드 설정샷",
    statusLabel: "사용 가능",
    title: "상품 설정샷 생성",
    uploadHint: "디자인을 넣거나 라이브러리에서 선택",
    uploadTitle: "디자인 또는 참고 이미지 업로드",
  },
  {
    description: "프롬프트와 참고 이미지를 넣어 새 이미지를 생성합니다.",
    icon: ImageIcon,
    id: "image-generator",
    initialInstruction: "상품이 잘 보이는 구도와 자연스러운 소품 비례를 유지합니다.",
    initialPrompt: "인쇄물 상품 판매에 사용할 밝고 정돈된 상품 이미지를 생성합니다.",
    kind: "generator",
    previewLabel: "AI 생성 이미지",
    statusLabel: "사용 가능",
    title: "AI 이미지 생성기",
    uploadHint: "참고 이미지는 선택 사항입니다.",
    uploadTitle: "참고 이미지 업로드",
  },
  {
    description: "PNG 이미지를 로컬 벡터 SVG로 바꿉니다.",
    icon: FileDown,
    id: "svg-conversion",
    initialInstruction: "캐릭터, 아이콘, 스티커처럼 선명한 벡터 형태로 정리합니다.",
    initialPrompt: "업로드한 PNG 이미지를 벡터 SVG로 변환합니다.",
    kind: "svg",
    previewLabel: "SVG 변환 결과",
    statusLabel: "새 도구",
    title: "SVG 변환",
    uploadHint: "PNG 파일을 선택하고 스타일을 고릅니다.",
    uploadTitle: "PNG 파일 업로드",
  },
  {
    description: "촬영 분위기에 맞는 배경과 소품 후보를 준비합니다.",
    icon: ImageIcon,
    id: "background-props",
    initialInstruction: "계절 소품은 상품보다 작게 배치하고 인쇄물 디자인을 가리지 않습니다.",
    initialPrompt: "크리스마스 소품, 리본, 따뜻한 조명으로 카드 세트에 어울리는 배경을 만듭니다.",
    kind: "generator",
    previewLabel: "배경/소품 컷",
    statusLabel: "계획",
    title: "배경/소품 생성",
    uploadHint: "상품이나 분위기 이미지를 선택",
    uploadTitle: "상품 또는 참고 이미지 업로드",
  },
  {
    description: "대표 이미지와 상세 이미지에 맞는 출력 비율을 조정합니다.",
    icon: Settings,
    id: "ratio-resize",
    initialInstruction: "원본 디자인 영역은 유지하고 빈 공간만 자연스럽게 확장합니다.",
    initialPrompt: "상품 이미지를 스마트스토어 대표 이미지에 맞는 정사각형 비율로 재구성합니다.",
    kind: "generator",
    previewLabel: "비율 변경 결과",
    statusLabel: "계획",
    title: "비율 변경",
    uploadHint: "비율을 바꿀 원본 이미지를 선택",
    uploadTitle: "원본 이미지 업로드",
  },
  {
    description: "선택한 결과와 닮은 이미지 후보를 더 만듭니다.",
    icon: Activity,
    id: "similar-image",
    initialInstruction: "구도와 톤은 유지하되 소품과 배경만 조금씩 변형합니다.",
    initialPrompt: "선택한 상품 설정샷과 거의 비슷한 느낌의 대체 이미지를 생성합니다.",
    kind: "generator",
    previewLabel: "비슷한 이미지",
    statusLabel: "계획",
    title: "비슷한 이미지 생성",
    uploadHint: "기준 이미지를 선택",
    uploadTitle: "기준 이미지 업로드",
  },
  {
    description: "보관한 디자인을 목업 화면에 합성합니다.",
    icon: Layers,
    id: "mockup-composite",
    initialInstruction: "목업의 원근, 종이 두께, 그림자를 기준으로 디자인을 자연스럽게 합성합니다.",
    initialPrompt: "업로드한 디자인을 카드, 봉투, 스티커 목업에 정확한 비율로 합성합니다.",
    kind: "generator",
    previewLabel: "목업 합성 결과",
    statusLabel: "계획",
    title: "목업 합성",
    uploadHint: "디자인과 목업 이미지를 선택",
    uploadTitle: "디자인 또는 목업 업로드",
  },
  {
    description: "상세페이지용 이미지 구성을 만듭니다.",
    icon: FileText,
    id: "detail-page-blocks",
    initialInstruction: "대표컷, 구성품컷, 재질컷, 크기 비교컷 순서로 자연스럽게 배치합니다.",
    initialPrompt: "상품 상세페이지에 사용할 이미지 블록을 간결한 판매 흐름으로 구성합니다.",
    kind: "generator",
    previewLabel: "상세 이미지 블록",
    statusLabel: "계획",
    title: "상세 이미지 블록",
    uploadHint: "상품과 구성품 이미지를 선택",
    uploadTitle: "상세 이미지 자료 업로드",
  },
] as const satisfies readonly ProductImageStudioAiTool[];

export function findProductImageStudioAiTool(toolId: string | undefined): ProductImageStudioAiTool | null {
  if (!toolId) return null;
  return PRODUCT_IMAGE_STUDIO_AI_TOOLS.find((candidate) => candidate.id === toolId) ?? null;
}
