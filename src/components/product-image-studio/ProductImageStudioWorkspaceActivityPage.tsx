import Link from "next/link";
import type { ProductImageStudioResultArchiveItem } from "@/lib/persistence/productImageStudioArchiveReadModels";
import {
  formatProductImageStudioArchiveDate,
  getProductImageStudioArchiveOutputLabel,
} from "./productImageStudioArchiveCopy";
import { EmptyState, SectionHeading, WorkspaceSupportShell } from "./ProductImageStudioWorkspaceSupportLayout";
import styles from "./ProductImageStudioWorkspaceSupportPages.module.css";

type ProjectUpdate = {
  readonly latestAt: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly resultCount: number;
};

export function ProductImageStudioActivityWorkspacePage({
  results,
}: {
  readonly results: readonly ProductImageStudioResultArchiveItem[];
}) {
  const recentResults = results.slice(0, 6);
  const projectUpdates = getProjectUpdates(results);

  return (
    <WorkspaceSupportShell
      activePath="/product-image-studio/activity"
      description="최근 생성 결과와 프로젝트 변경 흐름을 확인합니다."
      title="활동"
    >
      {results.length === 0 ? (
        <EmptyState
          title="저장된 활동이 아직 없습니다."
          description="이미지를 생성하면 최근 결과와 프로젝트 업데이트가 이곳에 기록됩니다."
        />
      ) : null}
      <div className={styles.twoColumn}>
        <section className={styles.panel} aria-label="최근 생성 결과">
          <SectionHeading
            eyebrow="결과"
            title="최근 생성 결과"
            description="기존 결과 보관 데이터에서 최근 항목을 보여줍니다."
          />
          {recentResults.length === 0 ? <EmptyState title="저장된 생성 결과가 아직 없습니다." description="생성된 상품컷이 없습니다." /> : null}
          {recentResults.length > 0 ? <RecentResultList results={recentResults} /> : null}
        </section>
        <section className={styles.panel} aria-label="프로젝트 업데이트">
          <SectionHeading
            eyebrow="프로젝트"
            title="프로젝트 업데이트"
            description="생성 결과가 있는 프로젝트만 업데이트로 표시합니다."
          />
          {projectUpdates.length === 0 ? (
            <EmptyState title="저장된 프로젝트 업데이트가 아직 없습니다." description="프로젝트 결과가 생기면 최근 변경 항목이 표시됩니다." />
          ) : null}
          {projectUpdates.length > 0 ? <ProjectUpdateList updates={projectUpdates} /> : null}
        </section>
      </div>
    </WorkspaceSupportShell>
  );
}

function RecentResultList({ results }: { readonly results: readonly ProductImageStudioResultArchiveItem[] }) {
  return (
    <ul className={styles.activityList}>
      {results.map((result) => (
        <li className={styles.activityItem} key={result.resultId}>
          <span className={styles.cardMeta}>{getProductImageStudioArchiveOutputLabel(result.outputType)}</span>
          <strong>{result.projectName}</strong>
          <p className={styles.activityMeta}>{formatProductImageStudioArchiveDate(result.createdAt)}</p>
          <div className={styles.activityActions}>
            <a href={result.previewUrl}>미리보기</a>
            <a href={result.downloadUrl}>다운로드</a>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProjectUpdateList({ updates }: { readonly updates: readonly ProjectUpdate[] }) {
  return (
    <ul className={styles.activityList}>
      {updates.map((update) => (
        <li className={styles.activityItem} key={update.projectId}>
          <span className={styles.cardMeta}>{formatProductImageStudioArchiveDate(update.latestAt)}</span>
          <strong>{update.projectName}</strong>
          <p className={styles.activityMeta}>생성 결과 {update.resultCount}개</p>
          <div className={styles.activityActions}>
            <Link href={`/product-image-studio/projects/${encodeURIComponent(update.projectId)}`} prefetch={false}>
              프로젝트 열기
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

function getProjectUpdates(results: readonly ProductImageStudioResultArchiveItem[]): readonly ProjectUpdate[] {
  const updatesByProject = new Map<string, ProjectUpdate>();
  for (const result of results) {
    const existing = updatesByProject.get(result.projectId);
    updatesByProject.set(result.projectId, {
      latestAt: getLatestDate(existing?.latestAt, result.createdAt),
      projectId: result.projectId,
      projectName: result.projectName,
      resultCount: (existing?.resultCount ?? 0) + 1,
    });
  }
  return Array.from(updatesByProject.values()).sort(compareProjectUpdateByLatest).slice(0, 5);
}

function getLatestDate(left: string | undefined, right: string): string {
  return left && left > right ? left : right;
}

function compareProjectUpdateByLatest(left: ProjectUpdate, right: ProjectUpdate): number {
  return Date.parse(right.latestAt) - Date.parse(left.latestAt);
}
