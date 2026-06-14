import Link from "next/link";
import { ArrowUpRight, BarChart3, Image, Plus, Sparkles, Upload } from "lucide-react";
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
  readonly href?: string;
  readonly icon: LucideIcon;
  readonly title: string;
};

const QUICK_ACTIONS: readonly Required<HomeAction>[] = [
  { description: "카드, 봉투, 봉합스티커를 바로 설정샷으로 만듭니다.", href: PRODUCT_STAGING_PATH, icon: Plus, title: "새 이미지 만들기" },
  { description: "생성, 보정, 비율 작업을 한곳에서 확인합니다.", href: "/product-image-studio/ai-tools", icon: Sparkles, title: "AI 도구" },
  { description: "최근 올린 원본과 작업 파일을 정리합니다.", href: "/product-image-studio/uploads", icon: Upload, title: "업로드" },
] as const;

const RECOMMENDED_TOOLS: readonly HomeAction[] = [
  { description: "업로드한 인쇄물을 보존하면서 판매용 설정샷을 만듭니다.", href: PRODUCT_STAGING_PATH, icon: Sparkles, title: "상품 설정샷 생성" },
  { description: "상세페이지에 맞는 배경과 소품 방향을 준비합니다.", icon: Image, title: "배경/소품 생성" },
  { description: "대표 이미지와 상세 이미지 비율을 작업별로 맞춥니다.", icon: BarChart3, title: "비율 변경" },
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
      <section className={styles.startBand} aria-labelledby="studio-home-start-heading">
        <div className={styles.startCopy}>
          <span>AI 도구 &gt; 상품 설정샷 생성</span>
          <h2 id="studio-home-start-heading">새 이미지 만들기</h2>
          <p>디자인 파일을 올리고 상품 설정샷 생성 흐름으로 바로 이어갑니다.</p>
        </div>
        <Link className={styles.primaryAction} href={PRODUCT_STAGING_PATH} prefetch={false}>
          <Plus size={17} strokeWidth={2.35} aria-hidden="true" />
          새 이미지 만들기
        </Link>
      </section>

      <section className={styles.quickActions} aria-label="빠른 실행">
        {QUICK_ACTIONS.map((action) => (
          <Link className={styles.quickAction} href={action.href} key={action.title} prefetch={false}>
            <ActionIcon icon={action.icon} />
            <span>
              <strong>{action.title}</strong>
              <small>{action.description}</small>
            </span>
            <ArrowUpRight size={15} strokeWidth={2.25} aria-hidden="true" />
          </Link>
        ))}
      </section>

      <div className={styles.twoColumnGrid}>
        <section className={styles.sectionBlock} aria-labelledby="recent-designs-heading">
          <SectionHeader actionHref="/product-image-studio/designs" actionLabel="디자인 보기" title="최근 디자인" />
          {recentProjects.length === 0 ? (
            <EmptyState title="저장된 디자인이 아직 없습니다." description="새 이미지 만들기에서 첫 작업을 시작해 주세요." />
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
        </section>

        <section className={styles.sectionBlock} aria-labelledby="recent-uploads-heading">
          <SectionHeader actionHref="/product-image-studio/uploads" actionLabel="업로드 보기" title="최근 업로드" />
          <EmptyState title="저장된 업로드가 아직 없습니다." description="업로드는 프로젝트 생성 흐름에서 연결됩니다." />
        </section>
      </div>

      <section className={styles.sectionBlock} aria-labelledby="recommended-tools-heading">
        <SectionHeader actionHref="/product-image-studio/ai-tools" actionLabel="AI 도구 보기" title="추천 AI 도구" />
        <div className={styles.toolGrid}>
          {RECOMMENDED_TOOLS.map((tool) => (
            <RecommendedToolCard tool={tool} key={tool.title} />
          ))}
        </div>
      </section>

      <section className={styles.sectionBlock} aria-labelledby="usage-heading">
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
    </section>
  );
}

function SectionHeader({
  actionHref,
  actionLabel,
  title,
}: {
  readonly actionHref: string;
  readonly actionLabel: string;
  readonly title: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <h2>{title}</h2>
      <Link href={actionHref} prefetch={false}>
        {actionLabel}
      </Link>
    </div>
  );
}

function RecommendedToolCard({ tool }: { readonly tool: (typeof RECOMMENDED_TOOLS)[number] }) {
  const content = (
    <>
      <ActionIcon icon={tool.icon} />
      <span>
        <strong>{tool.title}</strong>
        <small>{tool.description}</small>
      </span>
      {tool.href ? <ArrowUpRight size={15} strokeWidth={2.25} aria-hidden="true" /> : <em>준비 중</em>}
    </>
  );

  return tool.href ? (
    <Link className={styles.toolCard} href={tool.href} prefetch={false}>
      {content}
    </Link>
  ) : (
    <article className={styles.toolCard} aria-label={`${tool.title}: 준비 중`}>
      {content}
    </article>
  );
}

function ActionIcon({ icon: Icon }: { readonly icon: LucideIcon }) {
  return (
    <span className={styles.actionIcon} aria-hidden="true">
      <Icon size={18} strokeWidth={2.25} />
    </span>
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
