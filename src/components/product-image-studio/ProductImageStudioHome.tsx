import Link from "next/link";
import { BookOpen, Plus, Sparkles, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProductImageStudioFileStorageMode } from "@/features/product-image-studio/server/assetUploadApi";
import type { ProductImageStudioRepositoryStorageMode } from "@/features/product-image-studio/server/projectApi";
import type { ProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import { assertNever } from "@/features/product-image-studio/domain/types";
import type {
  ProductImageStudioProjectSummary,
  ProductImageStudioResultArchiveItem,
} from "@/lib/persistence/productImageStudioArchiveReadModels";
import { ProductImageStudioStatusPanel } from "./ProductImageStudioStatusPanel";
import {
  formatProductImageStudioArchiveDate,
  getProductImageStudioArchiveCardFormatLabel,
} from "./productImageStudioArchiveCopy";
import { CompactActionCard, CompactCardGrid, CompactPageHeader } from "./ProductImageStudioSaasPrimitives";
import styles from "./ProductImageStudioHome.module.css";

const PRODUCT_STAGING_PATH = "/product-image-studio/ai-tools/product-staging";
const RECENT_ITEM_LIMIT = 3;

type ProductImageStudioHomeProps = {
  readonly fileStorageMode: ProductImageStudioFileStorageMode;
  readonly metadataStorageMode: ProductImageStudioRepositoryStorageMode;
  readonly projects: readonly ProductImageStudioProjectSummary[];
  readonly providerStatus: ProductImageStudioProviderStatus;
  readonly results: readonly ProductImageStudioResultArchiveItem[];
};

type HomeAction = {
  readonly description: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly id: string;
  readonly title: string;
};

const WORKSPACE_SHORTCUTS: readonly HomeAction[] = [
  {
    description: "디자인을 올려 상품컷을 만듭니다.",
    href: PRODUCT_STAGING_PATH,
    icon: Plus,
    id: "new-product-cut",
    title: "새 상품컷",
  },
  {
    description: "생성, 보정, 변환을 엽니다.",
    href: "/product-image-studio/ai-tools",
    icon: Sparkles,
    id: "ai-tools",
    title: "AI 도구",
  },
  {
    description: "원본과 참고 이미지를 봅니다.",
    href: "/product-image-studio/uploads",
    icon: Upload,
    id: "uploads",
    title: "업로드",
  },
  {
    description: "목업, 재질, 규격을 엽니다.",
    href: "/product-image-studio/library",
    icon: BookOpen,
    id: "library",
    title: "라이브러리",
  },
] as const;

export function ProductImageStudioHome({
  fileStorageMode,
  metadataStorageMode,
  projects,
  providerStatus,
  results,
}: ProductImageStudioHomeProps) {
  const recentProjects = projects.slice(0, RECENT_ITEM_LIMIT);

  return (
    <section className={styles.home} aria-label="상품 이미지 스튜디오 홈">
      <CompactPageHeader
        eyebrow="홈"
        title="작업 현황"
        description="최근 디자인과 핵심 작업만 봅니다."
        meta={`${projects.length}개 디자인`}
      />

      <SectionHeader title="작업 바로가기" />
      <CompactCardGrid ariaLabel="작업 바로가기">
        {WORKSPACE_SHORTCUTS.map((action) => (
          <CompactActionCard
            actionKind="link"
            actionLabel="열기"
            description={action.description}
            href={action.href}
            iconNode={renderCompactIcon(action.icon)}
            id={action.id}
            key={action.id}
            title={action.title}
          />
        ))}
      </CompactCardGrid>

      <SectionHeader actionHref="/product-image-studio/designs" actionLabel="디자인 보기" title="최근 디자인" />
      {recentProjects.length === 0 ? (
        <EmptyState title="저장된 디자인이 아직 없습니다." description="새 상품컷에서 첫 작업을 시작해 주세요." />
      ) : (
        <div className={styles.designList}>
          {recentProjects.map((project) => (
            <Link
              className={styles.designItem}
              href={`/product-image-studio/designs/${encodeURIComponent(project.id)}`}
              key={project.id}
              prefetch={false}
            >
              <span>
                <strong>{project.name}</strong>
                <small>{getProductImageStudioArchiveCardFormatLabel(project.cardFormat)}</small>
              </span>
              <span className={styles.itemMeta}>
                {project.resultCount}개 · {formatProductImageStudioArchiveDate(project.latestResultAt)}
              </span>
            </Link>
          ))}
        </div>
      )}

      <SectionHeader actionHref="/product-image-studio/usage" actionLabel="사용량 보기" title="사용량" />
      <dl className={styles.usageGrid}>
        <Metric label="디자인" value={`${projects.length}개`} />
        <Metric label="생성 결과" value={`${results.length}개`} />
        <Metric label="최근 생성" value={formatLatestResultDate(results)} />
        <Metric label="AI 생성" value={formatGenerationStatus(providerStatus)} />
        <Metric label="저장" value={formatFileStorageMode(fileStorageMode)} />
        <Metric label="기록" value={formatMetadataStorageMode(metadataStorageMode)} />
      </dl>
      <ProductImageStudioStatusPanel
        fileStorageMode={fileStorageMode}
        metadataStorageMode={metadataStorageMode}
        status={providerStatus}
      />
    </section>
  );
}

function SectionHeader({
  actionHref,
  actionLabel,
  title,
}: {
  readonly actionHref?: string;
  readonly actionLabel?: string;
  readonly title: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <h2>{title}</h2>
      {actionHref && actionLabel ? (
        <Link href={actionHref} prefetch={false}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function EmptyState({ description, title }: { readonly description: string; readonly title: string }) {
  return (
    <div className={styles.emptyState}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function renderCompactIcon(Icon: LucideIcon) {
  return <Icon size={20} strokeWidth={2.2} />;
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatLatestResultDate(results: readonly ProductImageStudioResultArchiveItem[]): string {
  const latest = results[0];
  return latest ? formatProductImageStudioArchiveDate(latest.createdAt) : "기록 없음";
}

function formatGenerationStatus(status: ProductImageStudioProviderStatus): string {
  switch (status.generation.status) {
    case "enabled":
      return "가능";
    case "blocked":
      return "차단";
    default:
      return assertNever(status.generation);
  }
}

function formatFileStorageMode(mode: ProductImageStudioFileStorageMode): string {
  switch (mode) {
    case "blob":
      return "Blob";
    case "local":
      return "로컬";
    default:
      return assertNever(mode);
  }
}

function formatMetadataStorageMode(mode: ProductImageStudioRepositoryStorageMode): string {
  switch (mode) {
    case "postgres":
      return "DB";
    case "memory":
      return "메모리";
    default:
      return assertNever(mode);
  }
}
