import {
  BarChart3,
  Clock3,
  FileCheck2,
  FileText,
  Images,
  Layers3,
  PackageCheck,
  UploadCloud,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CompactActionCard,
  CompactCardGrid,
  CompactEmptyState,
  CompactItemCard,
  CompactPageHeader,
} from "./ProductImageStudioSaasPrimitives";
import { WorkspaceSupportShell } from "./ProductImageStudioWorkspaceSupportLayout";

export { ProductImageStudioActivityWorkspacePage } from "./ProductImageStudioWorkspaceActivityPage";
export {
  ProductImageStudioInviteWorkspacePage,
  ProductImageStudioLibraryWorkspacePage,
} from "./ProductImageStudioLibraryInvitePages";
export { ProductImageStudioProductSpecsWorkspacePage } from "./ProductImageStudioSpecLibrary";
export { ProductImageStudioUploadsWorkspacePage } from "./ProductImageStudioUploadLibrary";

type FocusedActionCard = {
  readonly actionLabel: string;
  readonly description: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly id: string;
  readonly statusLabel: string;
  readonly title: string;
};

type UsageCard = {
  readonly description: string;
  readonly icon: LucideIcon;
  readonly meta: string;
  readonly title: string;
};

const BATCH_CARDS: readonly FocusedActionCard[] = [
  {
    actionLabel: "업로드로 이동",
    description: "카드, 봉투, 스티커 누락을 먼저 봅니다.",
    href: "/product-image-studio/uploads",
    icon: FileCheck2,
    id: "batch-file-check",
    statusLabel: "업로드",
    title: "파일 점검",
  },
  {
    actionLabel: "AI 도구 열기",
    description: "비율, 배경, 출력 형식을 같은 값으로 맞춥니다.",
    href: "/product-image-studio/ai-tools",
    icon: Layers3,
    id: "batch-shared-settings",
    statusLabel: "설정",
    title: "공통 설정",
  },
  {
    actionLabel: "결과 보기",
    description: "실행 후 이름과 저장 위치를 확인합니다.",
    href: "/product-image-studio/results",
    icon: Clock3,
    id: "batch-schedule-review",
    statusLabel: "보관",
    title: "예약 검토",
  },
] as const;

const TEMPLATE_CARDS: readonly FocusedActionCard[] = [
  {
    actionLabel: "자료 보기",
    description: "카드, 봉투, 스티커가 함께 보이는 기본 구도입니다.",
    href: "/product-image-studio/library",
    icon: Images,
    id: "template-card-set",
    statusLabel: "기본 구성",
    title: "카드 세트",
  },
  {
    actionLabel: "도구 열기",
    description: "주소와 로고 영역이 잘 보이는 봉투 구도입니다.",
    href: "/product-image-studio/ai-tools",
    icon: FileText,
    id: "template-envelope",
    statusLabel: "기본 구성",
    title: "봉투",
  },
  {
    actionLabel: "도구 열기",
    description: "원형과 사각 스티커를 빠르게 점검합니다.",
    href: "/product-image-studio/ai-tools",
    icon: PackageCheck,
    id: "template-seal",
    statusLabel: "기본 구성",
    title: "봉합스티커",
  },
  {
    actionLabel: "결과 보기",
    description: "상품 목록 첫 화면에 쓰는 대표 이미지입니다.",
    href: "/product-image-studio/results",
    icon: Images,
    id: "template-hero",
    statusLabel: "기본 구성",
    title: "대표이미지",
  },
] as const;

const USAGE_CARDS: readonly UsageCard[] = [
  {
    description: "실제 생성 기록이 저장되면 월별로 집계됩니다.",
    icon: Images,
    meta: "저장된 사용량 없음",
    title: "이미지 생성",
  },
  {
    description: "원본 파일과 결과 파일 보관 흐름을 나눠 봅니다.",
    icon: UploadCloud,
    meta: "저장된 사용량 없음",
    title: "업로드 보관",
  },
  {
    description: "미리보기와 다운로드 요청을 분리해 확인합니다.",
    icon: BarChart3,
    meta: "저장된 사용량 없음",
    title: "다운로드",
  },
] as const;

export function ProductImageStudioBatchWorkspacePage() {
  return (
    <WorkspaceSupportShell
      activePath="/product-image-studio/batch"
      description="여러 상품컷 작업을 묶어 준비합니다."
      title="일괄처리"
    >
      <CompactPageHeader
        eyebrow="작업 묶음"
        title="일괄처리"
        description="파일을 모아 한 번에 점검하는 UI입니다."
        meta="공급자 호출 없음"
      />
      <CompactCardGrid ariaLabel="일괄처리 카드">
        {BATCH_CARDS.map((card) => renderFocusedActionCard(card))}
      </CompactCardGrid>
      <CompactEmptyState
        iconNode={renderCompactIcon(UploadCloud, 22)}
        title="저장된 일괄 작업이 없습니다."
        description="파일을 올리면 점검 카드가 실제 작업 목록으로 바뀝니다."
      />
    </WorkspaceSupportShell>
  );
}

export function ProductImageStudioTemplatesWorkspacePage() {
  return (
    <WorkspaceSupportShell
      activePath="/product-image-studio/templates"
      description="반복해서 쓰는 상품 이미지 구성을 확인합니다."
      title="상품템플릿"
    >
      <CompactPageHeader
        eyebrow="기본 구성"
        title="상품템플릿"
        description="현재는 기본 구도만 보여주는 라이브러리 화면입니다."
        meta="4개"
      />
      <CompactCardGrid ariaLabel="상품템플릿 카드">
        {TEMPLATE_CARDS.map((card) => renderFocusedActionCard(card))}
      </CompactCardGrid>
    </WorkspaceSupportShell>
  );
}

export function ProductImageStudioUsageWorkspacePage() {
  return (
    <WorkspaceSupportShell
      activePath="/product-image-studio/usage"
      description="이번 달 생성, 업로드, 다운로드 흐름을 확인합니다."
      title="사용량"
    >
      <CompactPageHeader
        eyebrow="이번 달"
        title="사용량"
        description="저장된 기록만 집계하고 외부 원장에는 쓰지 않습니다."
        meta="대기"
      />
      <CompactCardGrid ariaLabel="사용량 카드">
        {USAGE_CARDS.map((card) => (
          <CompactItemCard
            description={card.description}
            iconNode={renderCompactIcon(card.icon, 18)}
            key={card.title}
            meta={card.meta}
            title={card.title}
          />
        ))}
      </CompactCardGrid>
    </WorkspaceSupportShell>
  );
}

function renderFocusedActionCard(card: FocusedActionCard) {
  return (
    <CompactActionCard
      actionKind="link"
      actionLabel={card.actionLabel}
      description={card.description}
      href={card.href}
      iconNode={renderCompactIcon(card.icon, 20)}
      id={card.id}
      key={card.id}
      statusLabel={card.statusLabel}
      title={card.title}
    />
  );
}

function renderCompactIcon(Icon: LucideIcon, size: number) {
  return <Icon size={size} strokeWidth={2.2} />;
}
