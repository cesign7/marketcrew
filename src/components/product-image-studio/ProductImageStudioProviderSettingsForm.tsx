"use client";

import { useMemo, useState } from "react";
import { PRODUCT_IMAGE_STUDIO_DEFAULT_PROVIDER_MODELS } from "@/features/product-image-studio/domain/providerModels";
import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";
import type {
  ProductImageStudioProviderSettingsStorageMode as SettingsStorageMode,
  ProductImageStudioProviderSettingsSummary as SettingsSummary,
} from "@/features/product-image-studio/server/providerSettingsStore";
import { requestProductImageStudioProviderSettings } from "@/features/product-image-studio/client/providerSettingsApi";
import {
  ProductImageStudioProviderSettingsCard,
  type ProductImageStudioProviderCardOption,
  type ProductImageStudioProviderCardState,
} from "./ProductImageStudioProviderSettingsCard";
import styles from "./ProductImageStudioProviderSettingsForm.module.css";

type ProductImageStudioProviderSettingsFormProps = {
  readonly initialSettings: SettingsSummary | null;
  readonly initialStorageMode: SettingsStorageMode;
};

type ProviderFormStates = Record<ProductImageStudioProviderName, ProductImageStudioProviderCardState>;
type FormMessage = { readonly text: string; readonly tone: "error" | "success" };

const PROVIDER_OPTIONS: readonly ProductImageStudioProviderCardOption[] = [
  {
    apiKeyHint: "관리 콘솔에서 발급한 비밀 키",
    description: "설정샷, 목업 합성, 고품질 인쇄물 이미지 생성에 사용합니다.",
    label: "OpenAI",
    provider: "openai",
  },
  {
    apiKeyHint: "관리 콘솔에서 발급한 비밀 키",
    description: "참조 이미지 기반 장면 생성과 빠른 비율 초안에 사용합니다.",
    label: "Gemini",
    provider: "gemini",
  },
];

export function ProductImageStudioProviderSettingsForm({
  initialSettings,
  initialStorageMode,
}: ProductImageStudioProviderSettingsFormProps) {
  const [defaultProvider, setDefaultProvider] = useState<ProductImageStudioProviderName>(
    initialSettings?.defaultProvider ?? "openai",
  );
  const [generationEnabled, setGenerationEnabled] = useState(initialSettings?.generationEnabled ?? false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [providerStates, setProviderStates] = useState<ProviderFormStates>(() => createProviderStates(initialSettings));
  const [storageMode, setStorageMode] = useState(initialSettings?.storageMode ?? initialStorageMode);
  const [updatedAt, setUpdatedAt] = useState(initialSettings?.updatedAt ?? null);

  const defaultState = providerStates[defaultProvider];
  const hasAnyCredential = useMemo(
    () => PROVIDER_OPTIONS.some((option) => providerStates[option.provider].hasCredential),
    [providerStates],
  );
  const hasPendingDefaultCredential = defaultState.apiKey.trim().length > 0;
  const canOpenGate = defaultState.hasCredential || hasPendingDefaultCredential;
  const gateSummary = generationEnabled ? `${providerLabel(defaultProvider)} 생성 허용 중` : "실제 생성 차단 중";

  return (
    <section className={styles.panel} aria-label="이미지 생성 연결 리소스 설정">
      <div className={styles.heading}>
        <div>
          <span>연결 리소스</span>
          <h2>이미지 생성 연결</h2>
          <p>기본 생성 엔진을 고르고 비밀 키는 서버에만 저장합니다.</p>
        </div>
        <div className={styles.badges} aria-label="저장 상태">
          <span>{storageMode === "postgres" ? "운영 DB" : "서버 메모리"}</span>
          <strong>{hasAnyCredential ? "저장됨" : "연결 필요"}</strong>
        </div>
      </div>

      <div className={styles.providerGrid}>
        <h3 className={styles.providerTitle}>기본 생성 엔진</h3>
        {PROVIDER_OPTIONS.map((option) => (
          <ProductImageStudioProviderSettingsCard
            isBusy={isBusy}
            isDefault={defaultProvider === option.provider}
            key={option.provider}
            onApiKeyChange={handleApiKeyChange}
            onDisconnect={handleDisconnectProvider}
            onModelChange={handleModelChange}
            onSave={handleSaveProvider}
            onSetDefault={handleSetDefaultProvider}
            option={option}
            state={providerStates[option.provider]}
          />
        ))}
      </div>

      <section
        className={styles.gatePanel}
        data-state={generationEnabled ? "open" : "closed"}
        aria-labelledby="generation-gate-heading"
      >
        <div className={styles.gateCopy}>
          <span>실제 이미지 생성 허용</span>
          <h3 id="generation-gate-heading">전체 생성 게이트</h3>
          <p>키를 저장해도 게이트가 닫혀 있으면 실제 이미지는 생성되지 않습니다.</p>
        </div>
        <strong className={styles.gateStatus}>{gateSummary}</strong>
        <div className={styles.gateActions} aria-label="생성 게이트 열기 닫기">
          <button
            aria-pressed={generationEnabled}
            className={styles.gateOpen}
            disabled={isBusy || generationEnabled || !canOpenGate}
            onClick={() => void handleGateChange(true)}
            type="button"
          >
            게이트 열기
          </button>
          <button
            aria-pressed={!generationEnabled}
            className={styles.gateClose}
            disabled={isBusy || !generationEnabled}
            onClick={() => void handleGateChange(false)}
            type="button"
          >
            게이트 닫기
          </button>
        </div>
        <p className={styles.gateHint}>
          {canOpenGate ? "현재 기본 생성 엔진 설정으로 저장됩니다." : "기본 생성 엔진의 비밀 키를 먼저 저장해 주세요."}
        </p>
      </section>

      <div className={styles.footer}>
        <p>{updatedAt ? `마지막 저장: ${formatDateTime(updatedAt)}` : "저장된 연결 리소스가 없습니다."}</p>
        {message ? <strong data-tone={message.tone}>{message.text}</strong> : null}
      </div>
    </section>
  );

  function handleApiKeyChange(provider: ProductImageStudioProviderName, value: string): void {
    updateProviderState(provider, { apiKey: value });
  }

  function handleModelChange(provider: ProductImageStudioProviderName, value: string): void {
    updateProviderState(provider, { model: value });
  }

  function handleSaveProvider(provider: ProductImageStudioProviderName): void {
    void persistProviderSettings(provider, generationEnabled, "연결 리소스를 저장했습니다.");
  }

  function handleSetDefaultProvider(provider: ProductImageStudioProviderName): void {
    setDefaultProvider(provider);
    if (providerStates[provider].hasCredential || providerStates[provider].apiKey.trim().length > 0) {
      void persistProviderSettings(provider, generationEnabled, "기본 생성 엔진을 변경했습니다.");
      return;
    }
    setMessage({ text: "비밀 키를 저장하면 기본 생성 엔진으로 사용할 수 있습니다.", tone: "error" });
  }

  async function handleDisconnectProvider(provider: ProductImageStudioProviderName): Promise<void> {
    setIsBusy(true);
    setMessage(null);
    const result = await requestProductImageStudioProviderSettings("DELETE", null, provider);
    setIsBusy(false);
    if (!result.ok) {
      setMessage({ text: result.message, tone: "error" });
      return;
    }
    applySettingsResult(result.settings, result.storageMode);
    setMessage({ text: `${providerLabel(provider)} 연결을 해제했습니다.`, tone: "success" });
  }

  async function handleGateChange(nextGenerationEnabled: boolean): Promise<void> {
    if (nextGenerationEnabled && !canOpenGate) {
      setMessage({ text: "먼저 기본 생성 엔진의 비밀 키를 저장하거나 입력해 주세요.", tone: "error" });
      return;
    }
    await persistProviderSettings(
      defaultProvider,
      nextGenerationEnabled,
      nextGenerationEnabled ? "생성 게이트를 열었습니다." : "생성 게이트를 닫았습니다.",
    );
  }

  async function persistProviderSettings(
    provider: ProductImageStudioProviderName,
    nextGenerationEnabled: boolean,
    successText: string,
  ): Promise<void> {
    setIsBusy(true);
    setMessage(null);
    const state = providerStates[provider];
    const result = await requestProductImageStudioProviderSettings("POST", {
      apiKey: state.apiKey,
      generationEnabled: nextGenerationEnabled,
      model: state.model,
      provider,
    });
    setIsBusy(false);
    if (!result.ok) {
      setMessage({ text: result.message, tone: "error" });
      return;
    }

    applySettingsResult(result.settings, result.storageMode);
    setMessage({ text: successText, tone: "success" });
  }

  function updateProviderState(provider: ProductImageStudioProviderName, patch: Partial<ProductImageStudioProviderCardState>) {
    setProviderStates((current) => ({
      ...current,
      [provider]: { ...current[provider], ...patch },
    }));
  }

  function applySettingsResult(settings: SettingsSummary | null, nextStorageMode: SettingsStorageMode): void {
    setStorageMode(nextStorageMode);
    if (!settings) {
      setProviderStates(createProviderStates(null));
      setGenerationEnabled(false);
      setUpdatedAt(null);
      return;
    }
    setDefaultProvider(settings.defaultProvider);
    setGenerationEnabled(settings.generationEnabled);
    setProviderStates(createProviderStates(settings));
    setUpdatedAt(settings.updatedAt);
  }
}

function createProviderStates(settings: SettingsSummary | null): ProviderFormStates {
  return {
    gemini: createProviderState(settings, "gemini"),
    openai: createProviderState(settings, "openai"),
  };
}

function createProviderState(settings: SettingsSummary | null, provider: ProductImageStudioProviderName) {
  const providerSummary = settings?.providers[provider];
  return {
    apiKey: "",
    hasCredential: providerSummary?.hasCredential ?? false,
    model: providerSummary?.model ?? PRODUCT_IMAGE_STUDIO_DEFAULT_PROVIDER_MODELS[provider],
    updatedAt: providerSummary?.updatedAt ?? null,
  };
}

function providerLabel(provider: ProductImageStudioProviderName): string {
  switch (provider) {
    case "gemini":
      return "Gemini";
    case "openai":
      return "OpenAI";
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}
