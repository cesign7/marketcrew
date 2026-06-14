import type { ProductImageStudioFileStorageMode } from "@/features/product-image-studio/server/assetUploadApi";
import type { ProductImageStudioRepositoryStorageMode } from "@/features/product-image-studio/server/projectApi";
import type { ProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import styles from "./ProductImageStudioStatusPanel.module.css";

type ProductImageStudioStatusPanelProps = {
  readonly fileStorageMode: ProductImageStudioFileStorageMode;
  readonly metadataStorageMode: ProductImageStudioRepositoryStorageMode;
  readonly status: ProductImageStudioProviderStatus;
};

type StatusBadgeKey = "download" | "file-storage" | "generation" | "metadata" | "provider";

type StatusBadge = {
  readonly key: StatusBadgeKey;
  readonly label: string;
  readonly marker: string;
  readonly tone: "blocked" | "ready" | "neutral";
  readonly value: string;
};

export function ProductImageStudioStatusPanel({
  fileStorageMode,
  metadataStorageMode,
  status,
}: ProductImageStudioStatusPanelProps) {
  const badges: readonly StatusBadge[] = [
    toGenerationBadge(status),
    toProviderBadge(status),
    toFileStorageBadge(fileStorageMode),
    toMetadataStorageBadge(metadataStorageMode),
    {
      key: "download",
      label: "다운로드",
      marker: "내",
      tone: "ready",
      value: "가능",
    },
  ];

  return (
    <section className={styles.panel} aria-label="작업 상태">
      <div className={styles.heading}>
        <h2>작업 상태</h2>
      </div>
      <div className={styles.badges}>
        {badges.map((badge) => (
          <StatusBadgeItem badge={badge} key={badge.key} />
        ))}
      </div>
    </section>
  );
}

function StatusBadgeItem({ badge }: { readonly badge: StatusBadge }) {
  return (
    <article
      aria-label={`${badge.label}: ${badge.value}`}
      className={styles.badge}
      data-status-badge={badge.key}
      data-tone={badge.tone}
    >
      <span className={styles.badgeMark} aria-hidden="true">
        {badge.marker}
      </span>
      <span className={styles.label}>{badge.label}</span>
      <strong className={styles.value}>{badge.value}</strong>
    </article>
  );
}

function toGenerationBadge(status: ProductImageStudioProviderStatus): StatusBadge {
  if (status.generation.status === "enabled") {
    return {
      key: "generation",
      label: "생성",
      marker: "생",
      tone: "ready",
      value: "가능",
    };
  }

  return {
    key: "generation",
    label: "생성",
    marker: "생",
    tone: "blocked",
    value: "차단",
  };
}

function toProviderBadge(status: ProductImageStudioProviderStatus): StatusBadge {
  const providerConnected =
    status.provider.configured && status.provider.credentialConfigured && status.provider.modelConfigured;

  if (providerConnected) {
    return {
      key: "provider",
      label: "연결",
      marker: "연",
      tone: "ready",
      value: "연결됨",
    };
  }

  return {
    key: "provider",
    label: "연결",
    marker: "연",
    tone: "neutral",
    value: "설정 필요",
  };
}

function toFileStorageBadge(storageMode: ProductImageStudioFileStorageMode): StatusBadge {
  switch (storageMode) {
    case "blob":
      return {
        key: "file-storage",
        label: "저장",
        marker: "저",
        tone: "ready",
        value: "Blob",
      };
    case "local":
      return {
        key: "file-storage",
        label: "저장",
        marker: "저",
        tone: "neutral",
        value: "로컬",
      };
  }
}

function toMetadataStorageBadge(storageMode: ProductImageStudioRepositoryStorageMode): StatusBadge {
  switch (storageMode) {
    case "postgres":
      return {
        key: "metadata",
        label: "기록",
        marker: "기",
        tone: "ready",
        value: "DB",
      };
    case "memory":
      return {
        key: "metadata",
        label: "기록",
        marker: "기",
        tone: "neutral",
        value: "메모리",
      };
  }
}
