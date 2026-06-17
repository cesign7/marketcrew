"use client";

import { useState } from "react";
import type { ProductImageStudioUploadArchiveItem } from "@/features/product-image-studio/server/uploadArchive";
import styles from "./ProductImageStudioUploadLibrary.module.css";

type ProductImageStudioUploadArchiveGridProps = {
  readonly uploads: readonly ProductImageStudioUploadArchiveItem[];
};

type DeleteState =
  | { readonly kind: "idle" }
  | { readonly assetId: string; readonly kind: "deleting" }
  | { readonly assetId: string; readonly kind: "failed"; readonly message: string };

export function ProductImageStudioUploadArchiveGrid({ uploads }: ProductImageStudioUploadArchiveGridProps) {
  const [items, setItems] = useState<readonly ProductImageStudioUploadArchiveItem[]>(uploads);
  const [deleteState, setDeleteState] = useState<DeleteState>({ kind: "idle" });

  async function handleDeleteUpload(upload: ProductImageStudioUploadArchiveItem): Promise<void> {
    const deleteUrl = getUploadDeleteUrl(upload);
    setDeleteState({ assetId: upload.assetId, kind: "deleting" });
    try {
      const response = await fetch(deleteUrl, { method: "DELETE" });
      if (!response.ok) {
        setDeleteState({ assetId: upload.assetId, kind: "failed", message: "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." });
        return;
      }
    } catch (error) {
      if (error instanceof TypeError) {
        setDeleteState({ assetId: upload.assetId, kind: "failed", message: "삭제 요청을 보내지 못했습니다. 연결을 확인해 주세요." });
        return;
      }
      throw error;
    }

    setItems((currentItems) => currentItems.filter((item) => item.assetId !== upload.assetId));
    setDeleteState({ kind: "idle" });
  }

  if (items.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h2>표시할 업로드가 없습니다.</h2>
        <p>삭제한 이미지는 업로드 목록에서 제외됩니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.uploadGrid}>
      {items.map((upload) => (
        <UploadCard deleteState={deleteState} key={upload.assetId} onDelete={handleDeleteUpload} upload={upload} />
      ))}
    </div>
  );
}

function UploadCard({
  deleteState,
  onDelete,
  upload,
}: {
  readonly deleteState: DeleteState;
  readonly onDelete: (upload: ProductImageStudioUploadArchiveItem) => Promise<void>;
  readonly upload: ProductImageStudioUploadArchiveItem;
}) {
  const deleteUrl = getUploadDeleteUrl(upload);
  const isDeleting = deleteState.kind === "deleting" && deleteState.assetId === upload.assetId;
  const deleteError = deleteState.kind === "failed" && deleteState.assetId === upload.assetId ? deleteState.message : null;
  return (
    <article className={styles.uploadCard}>
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
        <button aria-label={`${upload.originalFileName} 삭제`} data-delete-url={deleteUrl} disabled={isDeleting} onClick={() => onDelete(upload)} type="button">
          {isDeleting ? "삭제 중" : "삭제"}
        </button>
      </div>
      {deleteError ? <p className={styles.inlineError}>{deleteError}</p> : null}
    </article>
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

function getUploadDeleteUrl(upload: ProductImageStudioUploadArchiveItem): string {
  return `/api/product-image-studio/projects/${encodeURIComponent(upload.projectId)}/assets/${encodeURIComponent(upload.assetId)}`;
}
