import type { ProductImageStudioUploadArchiveItem } from "@/features/product-image-studio/server/uploadArchive";
import { WorkspaceSupportShell } from "./ProductImageStudioWorkspaceSupportLayout";
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
      description=""
      showPrimaryAction={false}
      title="업로드"
    >
      <section className={styles.library} aria-label="업로드 이미지 목록">
        <div className={styles.uploadGrid}>
          {uploads.map((upload) => (
            <article className={styles.uploadCard} key={upload.assetId}>
              <img className={styles.uploadImage} alt={upload.originalFileName} src={upload.previewUrl} />
              <div className={styles.uploadMeta}>
                <strong>{upload.originalFileName}</strong>
                <span>{upload.projectName}</span>
                <span>{getUploadRoleLabel(upload.role)} · {upload.contentType} · {formatByteSize(upload.byteSize)}</span>
              </div>
              <div className={styles.uploadActions}>
                <a href={upload.designUseUrl}>디자인에 사용</a>
                <a href={upload.templateUseUrl}>템플릿에 적용</a>
                <a href={upload.svgConversionUrl}>SVG 변환</a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </WorkspaceSupportShell>
  );
}

function getUploadRoleLabel(role: ProductImageStudioUploadArchiveItem["role"]): string {
  switch (role) {
    case "envelope_front":
      return "봉투 앞면";
    case "envelope_inside_flap":
      return "봉투 안쪽 덮개";
    case "folded_card_back":
      return "접이식 카드 뒷면";
    case "folded_card_fold_metadata":
      return "접이식 카드 접지 정보";
    case "folded_card_inner_spread":
      return "접이식 카드 안쪽 펼침면";
    case "folded_card_outer_front":
      return "접이식 카드 앞면";
    case "postcard_back":
      return "엽서 뒷면";
    case "postcard_front":
      return "엽서 앞면";
    case "reference_mood":
      return "참고 이미지";
    case "seal_sticker":
      return "봉합스티커";
  }
}

function formatByteSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  return `${Math.round(bytes / 1024)}KB`;
}
