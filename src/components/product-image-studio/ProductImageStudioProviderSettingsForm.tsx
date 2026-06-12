"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";
import type {
  ProductImageStudioProviderSettingsStorageMode,
  ProductImageStudioProviderSettingsSummary,
} from "@/features/product-image-studio/server/providerSettingsStore";
import { requestProductImageStudioProviderSettings } from "@/features/product-image-studio/client/providerSettingsApi";
import styles from "./ProductImageStudioProviderSettingsForm.module.css";

type ProductImageStudioProviderSettingsFormProps = {
  readonly initialSettings: ProductImageStudioProviderSettingsSummary | null;
  readonly initialStorageMode: ProductImageStudioProviderSettingsStorageMode;
};

type ProviderOption = {
  readonly description: string;
  readonly label: string;
  readonly provider: ProductImageStudioProviderName;
};

type FormMessage = {
  readonly text: string;
  readonly tone: "error" | "success";
};

const PROVIDER_OPTIONS = [
  {
    description: "기존 생성 품질을 유지하면서 설정샷과 목업 합성에 사용합니다.",
    label: "OpenAI",
    provider: "openai",
  },
  {
    description: "참조 이미지 기반 장면 생성과 다양한 비율 초안에 사용합니다.",
    label: "Gemini",
    provider: "gemini",
  },
] as const satisfies readonly ProviderOption[];

const DEFAULT_MODELS: Record<ProductImageStudioProviderName, string> = {
  gemini: "gemini-3.1-flash-image",
  openai: "gpt-image-1",
};

export function ProductImageStudioProviderSettingsForm({
  initialSettings,
  initialStorageMode,
}: ProductImageStudioProviderSettingsFormProps) {
  const [apiKey, setApiKey] = useState("");
  const [generationEnabled, setGenerationEnabled] = useState(initialSettings?.generationEnabled ?? false);
  const [hasCredential, setHasCredential] = useState(initialSettings?.hasCredential ?? false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [model, setModel] = useState(initialSettings?.model ?? DEFAULT_MODELS.openai);
  const [provider, setProvider] = useState<ProductImageStudioProviderName>(initialSettings?.provider ?? "openai");
  const [storageMode, setStorageMode] = useState(initialSettings?.storageMode ?? initialStorageMode);
  const [updatedAt, setUpdatedAt] = useState(initialSettings?.updatedAt ?? null);

  const selectedOption = useMemo(
    () => PROVIDER_OPTIONS.find((option) => option.provider === provider) ?? PROVIDER_OPTIONS[0],
    [provider],
  );
  const hasPendingCredential = apiKey.trim().length > 0;
  const canOpenGate = hasCredential || hasPendingCredential;
  const gateSummary = generationEnabled ? `${selectedOption.label} 실제 호출 허용 중` : "실제 provider 호출 차단 중";

  return (
    <section className={styles.panel} aria-label="이미지 생성 provider 설정">
      <div className={styles.heading}>
        <div>
          <h2>생성 연결 설정</h2>
          <p>키는 서버에만 저장하고 화면에는 연결 상태만 남깁니다.</p>
        </div>
        <div className={styles.badges} aria-label="저장 상태">
          <span>{storageMode === "postgres" ? "운영 DB" : "서버 메모리"}</span>
          <strong>{hasCredential ? "키 저장됨" : "키 필요"}</strong>
        </div>
      </div>

      <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
        <fieldset className={styles.providerFieldset}>
          <legend>생성 provider</legend>
          <div className={styles.providerOptions}>
            {PROVIDER_OPTIONS.map((option) => (
              <label className={styles.providerOption} data-active={provider === option.provider} key={option.provider}>
                <input
                  checked={provider === option.provider}
                  disabled={isBusy}
                  name="provider"
                  onChange={() => handleProviderChange(option.provider)}
                  type="radio"
                  value={option.provider}
                />
                <span>{option.label}</span>
                <small>{option.description}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.fields}>
          <label className={styles.field}>
            <span>모델</span>
            <input
              disabled={isBusy}
              onChange={(event) => setModel(event.target.value)}
              placeholder={DEFAULT_MODELS[provider]}
              type="text"
              value={model}
            />
          </label>

          <label className={styles.field}>
            <span>API 키</span>
            <input
              autoComplete="off"
              disabled={isBusy}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={hasCredential ? "변경할 때만 새 키 입력" : "provider API 키 입력"}
              type="password"
              value={apiKey}
            />
          </label>
        </div>

        <section className={styles.gatePanel} data-state={generationEnabled ? "open" : "closed"} aria-labelledby="generation-gate-heading">
          <div className={styles.gateCopy}>
            <span>생성 게이트</span>
            <h3 id="generation-gate-heading">{generationEnabled ? "게이트 열림" : "게이트 닫힘"}</h3>
            <p>실제 이미지 생성 허용 상태입니다. 키가 저장된 provider만 호출합니다.</p>
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
              disabled={isBusy || !generationEnabled || (!hasCredential && !hasPendingCredential)}
              onClick={() => void handleGateChange(false)}
              type="button"
            >
              게이트 닫기
            </button>
          </div>
          <p className={styles.gateHint}>
            {canOpenGate ? "버튼을 누르면 현재 provider 설정과 함께 바로 저장됩니다." : "먼저 API 키를 저장하거나 입력해 주세요."}
          </p>
        </section>

        <div className={styles.actions}>
          <button className={styles.primary} disabled={isBusy} type="submit">
            {isBusy ? "저장 중" : "연결 정보 저장"}
          </button>
          <button className={styles.secondary} disabled={isBusy || !hasCredential} onClick={() => void handleDelete()} type="button">
            연결 해제
          </button>
        </div>
      </form>

      <div className={styles.footer}>
        <p>{updatedAt ? `마지막 저장: ${formatDateTime(updatedAt)}` : "저장된 provider 연결이 없습니다."}</p>
        {message ? <strong data-tone={message.tone}>{message.text}</strong> : null}
      </div>
    </section>
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsBusy(true);
    setMessage(null);

    const result = await requestProductImageStudioProviderSettings("POST", {
      apiKey,
      generationEnabled,
      model,
      provider,
    });
    setIsBusy(false);
    if (!result.ok) {
      setMessage({ text: result.message, tone: "error" });
      return;
    }

    applySettingsResult(result.settings, result.storageMode);
    setApiKey("");
    setMessage({ text: "생성 연결 정보를 저장했습니다.", tone: "success" });
  }

  async function handleDelete(): Promise<void> {
    setIsBusy(true);
    setMessage(null);
    const result = await requestProductImageStudioProviderSettings("DELETE", null);
    setIsBusy(false);
    if (!result.ok) {
      setMessage({ text: result.message, tone: "error" });
      return;
    }

    setApiKey("");
    setGenerationEnabled(false);
    setHasCredential(false);
    setUpdatedAt(null);
    setStorageMode(result.storageMode);
    setMessage({ text: "provider 연결을 해제했습니다.", tone: "success" });
  }

  async function handleGateChange(nextGenerationEnabled: boolean): Promise<void> {
    if (nextGenerationEnabled && !canOpenGate) {
      setMessage({ text: "먼저 API 키를 저장하거나 입력해 주세요.", tone: "error" });
      return;
    }

    setIsBusy(true);
    setMessage(null);
    const result = await requestProductImageStudioProviderSettings("POST", {
      apiKey,
      generationEnabled: nextGenerationEnabled,
      model,
      provider,
    });
    setIsBusy(false);
    if (!result.ok) {
      setMessage({ text: result.message, tone: "error" });
      return;
    }

    applySettingsResult(result.settings, result.storageMode);
    setApiKey("");
    setMessage({
      text: nextGenerationEnabled ? "생성 게이트를 열었습니다." : "생성 게이트를 닫았습니다.",
      tone: "success",
    });
  }

  function handleProviderChange(nextProvider: ProductImageStudioProviderName): void {
    setProvider(nextProvider);
    setModel(DEFAULT_MODELS[nextProvider]);
  }

  function applySettingsResult(
    settings: ProductImageStudioProviderSettingsSummary | null,
    nextStorageMode: ProductImageStudioProviderSettingsStorageMode,
  ): void {
    setStorageMode(nextStorageMode);
    if (!settings) {
      return;
    }
    setGenerationEnabled(settings.generationEnabled);
    setHasCredential(settings.hasCredential);
    setModel(settings.model);
    setProvider(settings.provider);
    setUpdatedAt(settings.updatedAt);
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}
