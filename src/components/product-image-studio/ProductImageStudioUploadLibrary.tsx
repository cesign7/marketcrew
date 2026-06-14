import Link from "next/link";
import { FileImage, LayoutTemplate, PencilRuler, Plus, UploadCloud } from "lucide-react";
import { getProductImageStudioUploadSlotLabel } from "@/features/product-image-studio/domain/projectWizardLabels";
import type { ProductImageStudioUploadArchiveItem } from "@/features/product-image-studio/server/uploadArchive";
import { EmptyState, SectionHeading, WorkspaceSupportShell } from "./ProductImageStudioWorkspaceSupportLayout";
import styles from "./ProductImageStudioUploadLibrary.module.css";

type ProductImageStudioUploadsWorkspacePageProps = {
  readonly uploads?: readonly ProductImageStudioUploadArchiveItem[];
};

export function ProductImageStudioUploadsWorkspacePage({
  uploads = [],
}: ProductImageStudioUploadsWorkspacePageProps) {
  return (
    <WorkspaceSupportShell
      activePath="/product-image-studio/uploads"
      description="업로드한 원본 이미지를 모아두고 디자인과 템플릿 작업에 연결합니다."
      title="업로드"
    >
      <section className={styles.hero} aria-label="업로드 시작">
        <div>
          <span className={styles.iconBubble} aria-hidden="true">
            <UploadCloud size={22} strokeWidth={2.25} />
          </span>
          <h2>상품 디자인을 먼저 올려두세요</h2>
          <p>카드, 봉투, 봉합스티커 이미지를 프로젝트에 올리면 이곳에서 다시 찾고 다음 작업에 연결할 수 있습니다.</p>
        </div>
        <Link className={styles.primaryAction} href="/product-image-studio/ai-tools/product-staging" prefetch={false}>
          <Plus size={16} strokeWidth={2.35} aria-hidden="true" />
          새 업로드
        </Link>
      </section>

      <section className={styles.panel} aria-label="업로드 라이브러리">
        <div className={styles.toolbar}>
          <SectionHeading
            eyebrow="라이브러리"
            title="업로드 라이브러리"
            description="최근 올린 원본 이미지를 리스트 형태로 확인합니다."
          />
          <span className={styles.countBadge}>{uploads.length}개</span>
        </div>

        {uploads.length === 0 ? (
          <EmptyState
            title="저장된 업로드가 아직 없습니다."
            description="상품컷 작업에서 파일을 올리면 카드, 봉투, 봉합스티커 자산이 이곳에 표시됩니다."
          />
        ) : (
          <div className={styles.uploadGrid}>
            {uploads.map((upload) => (
              <UploadCard key={upload.assetId} upload={upload} />
            ))}
          </div>
        )}
      </section>
    </WorkspaceSupportShell>
  );
}

function UploadCard({ upload }: { readonly upload: ProductImageStudioUploadArchiveItem }) {
  const slotLabel = getProductImageStudioUploadSlotLabel(upload.role);
  return (
    <article className={styles.uploadCard}>
      <a className={styles.thumbLink} href={upload.previewUrl} aria-label={`${upload.originalFileName} 원본 보기`}>
        <img alt={`${slotLabel.label} ${upload.originalFileName}`} src={upload.previewUrl} />
      </a>
      <div className={styles.cardBody}>
        <div className={styles.cardTitleRow}>
          <div>
            <span className={styles.slotBadge}>{slotLabel.label}</span>
            <h3>{upload.originalFileName}</h3>
          </div>
          <FileImage size={18} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <dl className={styles.metaList}>
          <MetaItem label="프로젝트" value={upload.projectName} />
          <MetaItem label="파일" value={`${formatByteSize(upload.byteSize)} · ${formatContentType(upload.contentType)}`} />
          <MetaItem label="업로드" value={formatArchiveDate(upload.createdAt)} />
        </dl>
        <div className={styles.actions}>
          <Link href={upload.designUseUrl} prefetch={false}>
            <PencilRuler size={15} strokeWidth={2.25} aria-hidden="true" />
            디자인에서 사용
          </Link>
          <Link href={upload.templateUseUrl} prefetch={false}>
            <LayoutTemplate size={15} strokeWidth={2.25} aria-hidden="true" />
            템플릿에 적용
          </Link>
          <a href={upload.previewUrl}>원본 보기</a>
        </div>
      </div>
    </article>
  );
}

function MetaItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatByteSize(byteSize: number): string {
  if (byteSize < 1024) {
    return `${byteSize}B`;
  }
  if (byteSize < 1024 * 1024) {
    return `${Math.round(byteSize / 1024)}KB`;
  }
  return `${(byteSize / (1024 * 1024)).toFixed(1)}MB`;
}

function formatContentType(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "JPG";
    case "image/png":
      return "PNG";
    case "image/webp":
      return "WEBP";
    default:
      return "이미지";
  }
}

function formatArchiveDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
