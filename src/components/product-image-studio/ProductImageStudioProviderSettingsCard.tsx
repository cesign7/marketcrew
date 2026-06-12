"use client";

import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";
import styles from "./ProductImageStudioProviderSettingsCard.module.css";

export type ProductImageStudioProviderCardOption = {
  readonly apiKeyHint: string;
  readonly description: string;
  readonly label: string;
  readonly provider: ProductImageStudioProviderName;
};

export type ProductImageStudioProviderCardState = {
  readonly apiKey: string;
  readonly hasCredential: boolean;
  readonly model: string;
  readonly updatedAt: string | null;
};

type ProductImageStudioProviderSettingsCardProps = {
  readonly isBusy: boolean;
  readonly isDefault: boolean;
  readonly onApiKeyChange: (provider: ProductImageStudioProviderName, value: string) => void;
  readonly onDisconnect: (provider: ProductImageStudioProviderName) => void;
  readonly onModelChange: (provider: ProductImageStudioProviderName, value: string) => void;
  readonly onSave: (provider: ProductImageStudioProviderName) => void;
  readonly onSetDefault: (provider: ProductImageStudioProviderName) => void;
  readonly option: ProductImageStudioProviderCardOption;
  readonly state: ProductImageStudioProviderCardState;
};

export function ProductImageStudioProviderSettingsCard({
  isBusy,
  isDefault,
  onApiKeyChange,
  onDisconnect,
  onModelChange,
  onSave,
  onSetDefault,
  option,
  state,
}: ProductImageStudioProviderSettingsCardProps) {
  const connectionText = `${option.label} ${state.hasCredential ? "연결됨" : "연결 안됨"}`;

  return (
    <article
      aria-label={`${option.label} 설정 카드`}
      className={styles.card}
      data-connected={state.hasCredential}
      data-default={isDefault}
    >
      <header className={styles.header}>
        <div>
          <span>{option.label} 설정 카드</span>
          <h3>{option.label}</h3>
        </div>
        <strong>{connectionText}</strong>
      </header>
      <p>{option.description}</p>

      <div className={styles.fields}>
        <label>
          <span>모델</span>
          <input
            disabled={isBusy}
            onChange={(event) => onModelChange(option.provider, event.target.value)}
            type="text"
            value={state.model}
          />
        </label>
        <label>
          <span>API 키</span>
          <input
            autoComplete="off"
            disabled={isBusy}
            onChange={(event) => onApiKeyChange(option.provider, event.target.value)}
            placeholder={state.hasCredential ? "변경할 때만 새 키 입력" : option.apiKeyHint}
            type="password"
            value={state.apiKey}
          />
          <small>{option.apiKeyHint}</small>
        </label>
      </div>

      <div className={styles.actions}>
        <button disabled={isBusy} onClick={() => onSave(option.provider)} type="button">
          저장
        </button>
        <button
          aria-pressed={isDefault}
          data-role="default"
          disabled={isBusy}
          onClick={() => onSetDefault(option.provider)}
          type="button"
        >
          {isDefault ? "기본 provider" : "기본으로 사용"}
        </button>
        <button disabled={isBusy || !state.hasCredential} onClick={() => onDisconnect(option.provider)} type="button">
          연결 해제
        </button>
      </div>
    </article>
  );
}
