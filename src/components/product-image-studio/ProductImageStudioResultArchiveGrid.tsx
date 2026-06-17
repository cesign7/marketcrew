"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductImageStudioResultArchiveItem } from "@/lib/persistence/productImageStudioArchiveReadModels";
import {
  formatProductImageStudioArchiveDate,
  formatProductImageStudioProviderValue,
  getProductImageStudioArchiveOutputLabel,
  getProductImageStudioArchivePoseLabel,
  getProductImageStudioArchiveResultProjectLabel,
  isProductImageStudioSvgArchiveResult,
  toProductImageStudioSvgDownloadFileName,
} from "./productImageStudioArchiveCopy";
import styles from "./ProductImageStudioArchive.module.css";

type ProductImageStudioResultArchiveGridProps = {
  readonly results: readonly ProductImageStudioResultArchiveItem[];
  readonly showProjectLink?: boolean;
};

type DeleteState =
  | { readonly kind: "idle" }
  | { readonly kind: "deleting"; readonly resultId: string }
  | { readonly kind: "failed"; readonly message: string; readonly resultId: string };

export function ProductImageStudioResultArchiveGrid({
  results,
  showProjectLink = false,
}: ProductImageStudioResultArchiveGridProps) {
  const [items, setItems] = useState<readonly ProductImageStudioResultArchiveItem[]>(results);
  const [preview, setPreview] = useState<ProductImageStudioResultArchiveItem | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>({ kind: "idle" });

  function removeResultAfterDelete(result: ProductImageStudioResultArchiveItem): void {
    setItems((currentItems) => currentItems.filter((item) => item.resultId !== result.resultId));
    setDeleteState({ kind: "idle" });
    if (preview?.resultId === result.resultId) {
      setPreview(null);
    }
  }

  async function handleDeleteResult(result: ProductImageStudioResultArchiveItem): Promise<void> {
    const deleteUrl = getDeleteUrl(result);
    setDeleteState({ kind: "deleting", resultId: result.resultId });
    try {
      const response = await fetch(deleteUrl, { method: "DELETE" });
      if (!response.ok) {
        setDeleteState({
          kind: "failed",
          message: "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          resultId: result.resultId,
        });
        return;
      }
    } catch (error) {
      if (error instanceof TypeError) {
        setDeleteState({
          kind: "failed",
          message: "삭제 요청을 보내지 못했습니다. 연결을 확인해 주세요.",
          resultId: result.resultId,
        });
        return;
      }
      throw error;
    }
    removeResultAfterDelete(result);
  }

  return (
    <>
      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>표시할 결과가 없습니다.</h2>
          <p>삭제한 결과는 보관함 목록에서 제외됩니다.</p>
        </div>
      ) : (
        <div className={styles.resultGrid}>
          {items.map((result) => (
            <ResultCard
              deleteState={deleteState}
              key={result.resultId}
              onDelete={handleDeleteResult}
              onPreview={setPreview}
              result={result}
              showProjectLink={showProjectLink}
            />
          ))}
        </div>
      )}
      {preview ? <PreviewModal onClose={() => setPreview(null)} result={preview} /> : null}
    </>
  );
}

function ResultCard({
  deleteState,
  onDelete,
  onPreview,
  result,
  showProjectLink,
}: {
  readonly deleteState: DeleteState;
  readonly onDelete: (result: ProductImageStudioResultArchiveItem) => Promise<void>;
  readonly onPreview: (result: ProductImageStudioResultArchiveItem) => void;
  readonly result: ProductImageStudioResultArchiveItem;
  readonly showProjectLink: boolean;
}) {
  const outputLabel = getResultOutputLabel(result);
  const title = `${getProductImageStudioArchiveResultProjectLabel(result)} ${outputLabel}`;
  const deleteUrl = getDeleteUrl(result);
  const isDeleting = deleteState.kind === "deleting" && deleteState.resultId === result.resultId;
  const deleteError = deleteState.kind === "failed" && deleteState.resultId === result.resultId ? deleteState.message : null;
  return (
    <article className={styles.resultCard}>
      <button className={styles.previewImageButton} onClick={() => onPreview(result)} type="button">
        <img alt={title} src={result.previewUrl} />
      </button>
      <div className={styles.resultBody}>
        <div className={styles.cardHeader}>
          <div>
            <p>{outputLabel}</p>
            <h2>{getProductImageStudioArchiveResultProjectLabel(result)}</h2>
          </div>
          <span>{result.ratio}</span>
        </div>
        <ResultMetaList result={result} />
        <div className={styles.actions}>
          {showProjectLink ? <Link href={`/product-image-studio/designs/${encodeURIComponent(result.projectId)}`}>디자인 보기</Link> : null}
          <button aria-label={`${title} 미리보기 열기`} onClick={() => onPreview(result)} type="button">
            미리보기
          </button>
          <a aria-label={getDownloadActionLabel(result)} download={getDownloadFileName(result)} href={result.downloadUrl}>
            {getDownloadActionLabel(result)}
          </a>
          <button aria-label={`${title} 삭제`} data-delete-url={deleteUrl} disabled={isDeleting} onClick={() => onDelete(result)} type="button">
            {isDeleting ? "삭제 중" : "삭제"}
          </button>
        </div>
        {deleteError ? <p className={styles.inlineError}>{deleteError}</p> : null}
      </div>
    </article>
  );
}

function ResultMetaList({ result }: { readonly result: ProductImageStudioResultArchiveItem }) {
  return (
    <dl className={styles.metaList}>
      <Metric label="크기" value={`${result.width}x${result.height}px`} />
      <Metric label="provider" value={formatProductImageStudioProviderValue(result.provider)} />
      <Metric label="model" value={formatProductImageStudioProviderValue(result.model)} />
      <Metric label="생성" value={formatProductImageStudioArchiveDate(result.createdAt)} />
      {result.workflow === "image_generator" && result.promptPreview ? <Metric label="프롬프트" value={result.promptPreview} /> : null}
      {result.outputType === "card_single" && result.workflow !== "image_generator" ? (
        <Metric label="카드 자세" value={getProductImageStudioArchivePoseLabel(result.cardPose)} />
      ) : null}
    </dl>
  );
}

function PreviewModal({
  onClose,
  result,
}: {
  readonly onClose: () => void;
  readonly result: ProductImageStudioResultArchiveItem;
}) {
  const title = `${getProductImageStudioArchiveResultProjectLabel(result)} ${getResultOutputLabel(result)}`;
  return (
    <div aria-labelledby="product-image-studio-result-preview-title" aria-modal="true" className={styles.modalBackdrop} role="dialog">
      <section className={styles.previewModal}>
        <header className={styles.modalHeader}>
          <div>
            <p>{getResultOutputLabel(result)}</p>
            <h2 id="product-image-studio-result-preview-title">{getProductImageStudioArchiveResultProjectLabel(result)}</h2>
          </div>
          <button aria-label="미리보기 닫기" onClick={onClose} type="button">
            닫기
          </button>
        </header>
        <img alt={title} src={result.previewUrl} />
        <div className={styles.modalActions}>
          <a download={getDownloadFileName(result)} href={result.downloadUrl}>
            {getDownloadActionLabel(result)}
          </a>
        </div>
      </section>
    </div>
  );
}

function getResultOutputLabel(result: ProductImageStudioResultArchiveItem): string {
  return getProductImageStudioArchiveOutputLabel(result.outputType, result.workflow);
}

function getDownloadActionLabel(result: ProductImageStudioResultArchiveItem): string {
  return isProductImageStudioSvgArchiveResult(result) ? "SVG 다운로드" : "다운로드";
}

function getDownloadFileName(result: ProductImageStudioResultArchiveItem): string | undefined {
  return isProductImageStudioSvgArchiveResult(result) ? toProductImageStudioSvgDownloadFileName(result.resultId) : undefined;
}

function getDeleteUrl(result: ProductImageStudioResultArchiveItem): string {
  return `/api/product-image-studio/projects/${encodeURIComponent(result.projectId)}/results/${encodeURIComponent(result.resultId)}`;
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
