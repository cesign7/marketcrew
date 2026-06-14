import Link from "next/link";
import { BarChart3, Clock3, FileImage, Images, Layers3, PackageCheck, UploadCloud } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState, SectionHeading, WorkspaceSupportShell } from "./ProductImageStudioWorkspaceSupportLayout";
import styles from "./ProductImageStudioWorkspaceSupportPages.module.css";

type SupportCard = {
  readonly description: string;
  readonly icon: LucideIcon;
  readonly title: string;
};

type UsageCard = SupportCard & {
  readonly value: string;
};

const BATCH_WORKFLOW_CARDS = [
  {
    description: "카드, 봉투, 봉합스티커 파일을 한 묶음으로 확인합니다.",
    icon: PackageCheck,
    title: "파일 묶음 확인",
  },
  {
    description: "같은 상품군에 적용할 비율과 출력 구성을 선택합니다.",
    icon: Layers3,
    title: "공통 설정 적용",
  },
  {
    description: "생성 전 누락된 파일과 프로젝트 이름을 다시 점검합니다.",
    icon: Clock3,
    title: "작업 예약 검토",
  },
] as const satisfies readonly SupportCard[];

const TEMPLATE_CARDS = [
  {
    description: "카드, 봉투, 봉합스티커가 함께 보이는 기본 세트 구도입니다.",
    icon: Images,
    title: "카드 세트",
  },
  {
    description: "앞면 로고와 주소 영역이 잘 보이는 봉투 단독 구성입니다.",
    icon: FileImage,
    title: "봉투",
  },
  {
    description: "원형과 사각 봉합스티커 모두 점검하기 쉬운 구도입니다.",
    icon: PackageCheck,
    title: "봉합스티커",
  },
  {
    description: "상품 목록 첫 화면에 쓰기 좋은 대표이미지 구성입니다.",
    icon: Images,
    title: "대표이미지",
  },
] as const satisfies readonly SupportCard[];

const USAGE_CARDS = [
  {
    description: "상품 이미지 생성 요청이 기록되면 월별로 집계합니다.",
    icon: Images,
    title: "이미지 생성",
    value: "저장된 사용량 없음",
  },
  {
    description: "프로젝트 업로드와 결과 파일 보관 흐름을 확인합니다.",
    icon: UploadCloud,
    title: "업로드 보관",
    value: "저장된 사용량 없음",
  },
  {
    description: "미리보기와 다운로드 요청 기록을 분리해서 표시합니다.",
    icon: BarChart3,
    title: "다운로드",
    value: "저장된 사용량 없음",
  },
] as const satisfies readonly UsageCard[];

export function ProductImageStudioBatchWorkspacePage() {
  return (
    <WorkspaceSupportShell
      activePath="/product-image-studio/batch"
      description="여러 상품 이미지 작업을 한 번에 준비하는 화면입니다."
      title="일괄처리"
    >
      <section className={styles.dropzone} aria-label="일괄 업로드 준비">
        <span className={styles.iconBubble} aria-hidden="true">
          <UploadCloud size={22} strokeWidth={2.2} />
        </span>
        <h2>파일을 끌어오거나 선택</h2>
        <p>저장된 일괄처리 항목이 아직 없습니다. 카드, 봉투, 봉합스티커 파일을 올리면 작업 흐름을 준비합니다.</p>
        <Link className={styles.primaryAction} href="/product-image-studio" prefetch={false}>
          업로드 화면 열기
        </Link>
      </section>
      <section className={styles.panel} aria-label="일괄처리 흐름">
        <SectionHeading
          eyebrow="작업 흐름"
          title="파일을 올리면 활성화됩니다"
          description="업로드 전에는 실행 카드가 닫혀 있어 외부 공급자나 원장에 요청하지 않습니다."
        />
        <div className={styles.grid}>
          {BATCH_WORKFLOW_CARDS.map((card) => (
            <WorkflowCard card={card} key={card.title} />
          ))}
        </div>
      </section>
    </WorkspaceSupportShell>
  );
}

export function ProductImageStudioTemplatesWorkspacePage() {
  return (
    <WorkspaceSupportShell
      activePath="/product-image-studio/templates"
      description="자주 쓰는 상품 이미지 구성을 템플릿으로 고르는 화면입니다."
      title="템플릿"
    >
      <section className={styles.panel} aria-label="상품 이미지 템플릿">
        <SectionHeading
          eyebrow="템플릿"
          title="기본 구성"
          description="현재 저장된 사용자 템플릿은 아직 없고, 아래 기본 구성만 선택할 수 있습니다."
        />
        <div className={styles.grid}>
          {TEMPLATE_CARDS.map((card) => (
            <TemplateCard card={card} key={card.title} />
          ))}
        </div>
      </section>
    </WorkspaceSupportShell>
  );
}

export function ProductImageStudioUsageWorkspacePage() {
  return (
    <WorkspaceSupportShell
      activePath="/product-image-studio/usage"
      description="이번 달 생성, 업로드, 다운로드 사용 흐름을 확인합니다."
      title="사용량"
    >
      <section className={styles.panel} aria-label="이번 달 사용량">
        <SectionHeading
          eyebrow="이번 달"
          title="이번 달 사용량"
          description="아직 집계할 저장 기록이 없어 월간 사용량은 대기 상태입니다."
        />
        <EmptyState
          title="저장된 사용량 기록이 아직 없습니다."
          description="생성 결과가 저장되면 이 화면에서 월별 사용 흐름을 확인합니다."
        />
      </section>
      <section className={styles.panel} aria-label="공급자 사용량">
        <SectionHeading
          eyebrow="공급자"
          title="공급자 사용량"
          description="외부 공급자 호출 없이 저장된 기록만 표시합니다."
        />
        <div className={styles.grid}>
          {USAGE_CARDS.map((card) => (
            <UsageSummaryCard card={card} key={card.title} />
          ))}
        </div>
      </section>
    </WorkspaceSupportShell>
  );
}

function WorkflowCard({ card }: { readonly card: SupportCard }) {
  const Icon = card.icon;
  return (
    <article className={styles.workflowCard} aria-disabled="true">
      <div className={styles.cardTop}>
        <h3>{card.title}</h3>
        <Icon className={styles.cardIcon} size={18} strokeWidth={2.2} aria-hidden="true" />
      </div>
      <p>{card.description}</p>
      <span className={styles.disabledLabel}>파일을 올리면 활성화됩니다</span>
    </article>
  );
}

function TemplateCard({ card }: { readonly card: SupportCard }) {
  const Icon = card.icon;
  return (
    <article className={styles.templateCard}>
      <Icon className={styles.cardIcon} size={20} strokeWidth={2.2} aria-hidden="true" />
      <h3>{card.title}</h3>
      <p>{card.description}</p>
      <span className={styles.disabledLabel}>기본 구성</span>
    </article>
  );
}

function UsageSummaryCard({ card }: { readonly card: UsageCard }) {
  const Icon = card.icon;
  return (
    <article className={styles.usageCard}>
      <Icon className={styles.cardIcon} size={20} strokeWidth={2.2} aria-hidden="true" />
      <h3>{card.title}</h3>
      <strong className={styles.usageValue}>{card.value}</strong>
      <p>{card.description}</p>
    </article>
  );
}
