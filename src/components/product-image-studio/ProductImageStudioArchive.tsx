import Link from "next/link";
import type {
  ProductImageStudioProjectSummary,
  ProductImageStudioResultArchiveItem,
} from "@/lib/persistence/productImageStudioArchiveReadModels";
import type { ProductImageStudioArchivePageProject } from "@/features/product-image-studio/server/archivePageData";
import {
  formatProductImageStudioArchiveDate,
  formatProductImageStudioProviderValue,
  getProductImageStudioArchiveCardFormatLabel,
  getProductImageStudioArchiveOutputLabel,
  getProductImageStudioArchivePoseLabel,
  getProductImageStudioArchiveProductTypeLabel,
  PRODUCT_IMAGE_STUDIO_ARCHIVE_OUTPUT_GROUPS,
} from "./productImageStudioArchiveCopy";
import styles from "./ProductImageStudioArchive.module.css";

type ProductImageStudioProjectArchiveProps = {
  readonly projects: readonly ProductImageStudioProjectSummary[];
};

type ProductImageStudioResultArchiveProps = {
  readonly results: readonly ProductImageStudioResultArchiveItem[];
};

type ProductImageStudioProjectDetailArchiveProps = {
  readonly project: ProductImageStudioArchivePageProject;
  readonly results: readonly ProductImageStudioResultArchiveItem[];
};

export function ProductImageStudioProjectArchive({ projects }: ProductImageStudioProjectArchiveProps) {
  return (
    <section className={styles.archive} aria-label="프로젝트 보관함">
      <ArchiveHeading
        eyebrow="리소스"
        title="프로젝트 보관함"
        description="상품컷 리소스에서 프로젝트별 상품 이미지 제작 기록과 생성 결과 수를 확인합니다."
        action={<Link href="/product-image-studio">새 프로젝트</Link>}
      />
      {projects.length === 0 ? (
        <ArchiveEmpty title="저장된 프로젝트가 없습니다." description="스튜디오에서 이미지를 생성하면 이곳에 프로젝트가 쌓입니다." />
      ) : (
        <div className={styles.projectGrid}>
          {projects.map((project) => (
            <article className={styles.projectCard} key={project.id}>
              <div className={styles.cardHeader}>
                <div>
                  <p>{getProductImageStudioArchiveProductTypeLabel(project.productType)}</p>
                  <h2>{project.name}</h2>
                </div>
                <span>{getProductImageStudioArchiveCardFormatLabel(project.cardFormat)}</span>
              </div>
              <dl className={styles.metrics}>
                <Metric label="결과" value={`결과 ${project.resultCount}개`} />
                <Metric label="마지막 활동" value={formatProductImageStudioArchiveDate(project.latestResultAt)} />
              </dl>
              <div className={styles.actions}>
                <Link href={`/product-image-studio/projects/${encodeURIComponent(project.id)}`}>상세 보기</Link>
                {project.resultCount > 0 ? <a href={project.zipDownloadUrl}>ZIP 다운로드</a> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function ProductImageStudioResultArchive({ results }: ProductImageStudioResultArchiveProps) {
  return (
    <section className={styles.archive} aria-label="결과 보관함">
      <ArchiveHeading
        eyebrow="리소스"
        title="상품컷 갤러리"
        description="상품컷 리소스의 결과 보관함에서 프로젝트 전체의 생성 이미지를 한 번에 확인합니다."
      />
      {results.length === 0 ? (
        <ArchiveEmpty title="아직 생성 결과가 없습니다." description="카드, 봉투, 봉합스티커 설정샷을 생성하면 이곳에 표시됩니다." />
      ) : (
        <ResultGrid results={results} showProjectLink />
      )}
    </section>
  );
}

export function ProductImageStudioProjectDetailArchive({
  project,
  results,
}: ProductImageStudioProjectDetailArchiveProps) {
  return (
    <section className={styles.archive} aria-label="프로젝트 결과">
      <ArchiveHeading
        eyebrow="리소스"
        title="프로젝트 결과"
        description={`${project.name}의 상품컷 리소스를 출력 타입별로 확인합니다.`}
        action={results.length > 0 ? <a href={results[0].projectZipUrl}>프로젝트 ZIP 다운로드</a> : undefined}
      />
      <dl className={styles.summaryStrip}>
        <Metric label="상품" value={getProductImageStudioArchiveProductTypeLabel(project.productType)} />
        <Metric label="카드 형식" value={getProductImageStudioArchiveCardFormatLabel(project.cardFormat)} />
        <Metric label="결과 수" value={`${results.length}개`} />
        <Metric label="생성일" value={formatProductImageStudioArchiveDate(project.createdAt)} />
      </dl>
      {results.length === 0 ? (
        <ArchiveEmpty title="이 프로젝트에는 아직 결과가 없습니다." description="스튜디오에서 초안을 생성하면 출력 타입별로 정리됩니다." />
      ) : (
        <div className={styles.outputSections}>
          {PRODUCT_IMAGE_STUDIO_ARCHIVE_OUTPUT_GROUPS.map((outputType) => {
            const groupResults = results.filter((result) => result.outputType === outputType);
            return (
              <section className={styles.outputSection} key={outputType}>
                <div className={styles.outputHeading}>
                  <h2>{getProductImageStudioArchiveOutputLabel(outputType)}</h2>
                  <span>{groupResults.length}개</span>
                </div>
                {groupResults.length === 0 ? (
                  <p className={styles.emptyLine}>아직 {getProductImageStudioArchiveOutputLabel(outputType)} 결과가 없습니다.</p>
                ) : (
                  <ResultGrid results={groupResults} />
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ResultGrid({
  results,
  showProjectLink = false,
}: {
  readonly results: readonly ProductImageStudioResultArchiveItem[];
  readonly showProjectLink?: boolean;
}) {
  return (
    <div className={styles.resultGrid}>
      {results.map((result) => (
        <article className={styles.resultCard} key={result.resultId}>
          <img alt={`${result.projectName} ${getProductImageStudioArchiveOutputLabel(result.outputType)}`} src={result.previewUrl} />
          <div className={styles.resultBody}>
            <div className={styles.cardHeader}>
              <div>
                <p>{getProductImageStudioArchiveOutputLabel(result.outputType)}</p>
                <h2>{result.projectName}</h2>
              </div>
              <span>{result.ratio}</span>
            </div>
            <dl className={styles.metaList}>
              <Metric label="크기" value={`${result.width}x${result.height}px`} />
              <Metric label="provider" value={formatProductImageStudioProviderValue(result.provider)} />
              <Metric label="model" value={formatProductImageStudioProviderValue(result.model)} />
              <Metric label="생성" value={formatProductImageStudioArchiveDate(result.createdAt)} />
              {result.outputType === "card_single" ? <Metric label="카드 자세" value={getProductImageStudioArchivePoseLabel(result.cardPose)} /> : null}
            </dl>
            <div className={styles.actions}>
              {showProjectLink ? <Link href={`/product-image-studio/projects/${encodeURIComponent(result.projectId)}`}>프로젝트 보기</Link> : null}
              <a href={result.previewUrl}>미리보기</a>
              <a href={result.downloadUrl}>다운로드</a>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ArchiveHeading({
  action,
  description,
  eyebrow,
  title,
}: {
  readonly action?: React.ReactNode;
  readonly description: string;
  readonly eyebrow?: string;
  readonly title: string;
}) {
  return (
    <div className={styles.heading}>
      <div>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? <div className={styles.headingAction}>{action}</div> : null}
    </div>
  );
}

function ArchiveEmpty({ description, title }: { readonly description: string; readonly title: string }) {
  return (
    <div className={styles.emptyState}>
      <h2>{title}</h2>
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
