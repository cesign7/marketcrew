"use client";

import { Image as ImageIcon, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useId, useState, type ChangeEvent } from "react";
import type { ProductImageStudioAiToolUploadSlot } from "./ProductImageStudioAiToolCatalog";
import { createProductImageStudioAiToolUploadObjectUrlRuntime } from "./ProductImageStudioAiToolUploadObjectUrlRuntime";
import styles from "./ProductImageStudioAiToolWorkspace.module.css";

export type ProductImageStudioAiToolUploadedAsset = {
  readonly file: File;
  readonly fileName: string;
  readonly fileSizeLabel: string;
  readonly id: string;
  readonly mimeTypeLabel: string;
  readonly previewUrl: string;
  readonly slotId: string;
  readonly slotTitle: string;
};

type UploadState = {
  readonly assets: readonly ProductImageStudioAiToolUploadedAsset[];
  readonly selectedAssetId: string | null;
};

type ProductImageStudioAiToolUploadSlotsProps = {
  readonly assets: readonly ProductImageStudioAiToolUploadedAsset[];
  readonly onAssetRemove: (assetId: string) => void;
  readonly onAssetSelect: (assetId: string) => void;
  readonly onAssetUpload: (slot: ProductImageStudioAiToolUploadSlot, event: ChangeEvent<HTMLInputElement>) => void;
  readonly selectedAssetId: string | null;
  readonly slots: readonly ProductImageStudioAiToolUploadSlot[];
  readonly uploadHint: string;
  readonly uploadTitle: string;
};

const EMPTY_UPLOAD_STATE: UploadState = { assets: [], selectedAssetId: null };

export function useProductImageStudioAiToolUploads() {
  const [state, setState] = useState<UploadState>(EMPTY_UPLOAD_STATE);
  const [objectUrls] = useState(() =>
    createProductImageStudioAiToolUploadObjectUrlRuntime({
      createObjectUrl: (file) => URL.createObjectURL(file),
      revokeObjectUrl: (previewUrl) => URL.revokeObjectURL(previewUrl),
    }),
  );

  useEffect(() => {
    return () => objectUrls.revokeAll();
  }, [objectUrls]);

  const uploadSlot = useCallback((slot: ProductImageStudioAiToolUploadSlot, event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    const previewUrl = objectUrls.createForSlot(slot.id, file);
    const uploadedAsset: ProductImageStudioAiToolUploadedAsset = {
      file,
      fileName: file.name,
      fileSizeLabel: formatFileSize(file.size),
      id: `${slot.id}-${file.name}-${file.lastModified}-${Date.now()}`,
      mimeTypeLabel: readMimeTypeLabel(file),
      previewUrl,
      slotId: slot.id,
      slotTitle: slot.title,
    };

    setState((current) => {
      const keptAssets = current.assets.filter((asset) => asset.slotId !== slot.id);
      return { assets: [...keptAssets, uploadedAsset], selectedAssetId: uploadedAsset.id };
    });
  }, [objectUrls]);

  const removeAsset = useCallback((assetId: string): void => {
    setState((current) => {
      const removed = current.assets.find((asset) => asset.id === assetId);
      if (removed) {
        objectUrls.revokeForSlot(removed.slotId);
      }
      const nextAssets = current.assets.filter((asset) => asset.id !== assetId);
      const nextSelectedAssetId = current.selectedAssetId === assetId ? nextAssets[0]?.id ?? null : current.selectedAssetId;
      return { assets: nextAssets, selectedAssetId: nextSelectedAssetId };
    });
  }, [objectUrls]);

  const selectAsset = useCallback((assetId: string): void => {
    setState((current) => ({ ...current, selectedAssetId: assetId }));
  }, []);

  return {
    assets: state.assets,
    removeAsset,
    selectAsset,
    selectedAsset: state.assets.find((asset) => asset.id === state.selectedAssetId),
    selectedAssetId: state.selectedAssetId,
    uploadSlot,
  };
}

export function ProductImageStudioAiToolUploadSlots({
  assets,
  onAssetRemove,
  onAssetSelect,
  onAssetUpload,
  selectedAssetId,
  slots,
  uploadHint,
  uploadTitle,
}: ProductImageStudioAiToolUploadSlotsProps) {
  const inputPrefix = useId();

  return (
    <section className={styles.section} aria-label={uploadTitle}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionTitle}>{uploadTitle}</p>
        <span>{uploadHint}</span>
      </div>
      <div className={styles.uploadSlotGrid}>
        {slots.map((slot) => {
          const asset = assets.find((candidate) => candidate.slotId === slot.id);
          return (
            <div
              className={styles.uploadSlot}
              data-ai-tool-upload-slot={slot.id}
              data-has-asset={asset ? "true" : "false"}
              data-selected={asset?.id === selectedAssetId ? "true" : "false"}
              key={slot.id}
            >
              {asset ? (
                <button className={styles.uploadPreviewButton} onClick={() => onAssetSelect(asset.id)} type="button">
                  <img alt={`${asset.slotTitle} 미리보기`} data-ai-tool-upload-preview="true" src={asset.previewUrl} />
                </button>
              ) : (
                <span className={styles.uploadEmptyIcon} aria-hidden="true">
                  <ImageIcon size={18} strokeWidth={2.2} />
                </span>
              )}
              <div className={styles.uploadSlotCopy}>
                <strong>{slot.title}</strong>
                <span>{asset ? `${asset.fileName} · ${asset.fileSizeLabel}` : slot.description}</span>
              </div>
              <label className={styles.uploadSelectButton} htmlFor={`${inputPrefix}-${slot.id}`}>
                <UploadCloud aria-hidden="true" size={14} strokeWidth={2.25} />
                {asset ? "교체" : "업로드"}
              </label>
              <input
                accept={slot.accept}
                aria-label={`${slot.title} 업로드`}
                className={styles.uploadInput}
                data-ai-tool-upload-input={slot.id}
                id={`${inputPrefix}-${slot.id}`}
                onChange={(event) => onAssetUpload(slot, event)}
                type="file"
              />
              {asset ? (
                <button aria-label={`${slot.title} 삭제`} className={styles.removeAssetButton} onClick={() => onAssetRemove(asset.id)} type="button">
                  <X aria-hidden="true" size={14} strokeWidth={2.35} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) {
    return `${Math.round(size / 1024 / 102.4) / 10}MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))}KB`;
}

function readMimeTypeLabel(file: File): string {
  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) return "SVG";
  if (file.type === "image/png") return "PNG";
  if (file.type === "image/webp") return "WebP";
  if (file.type === "image/jpeg") return "JPEG";
  return "이미지";
}
