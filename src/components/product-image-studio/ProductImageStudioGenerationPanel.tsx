import {
  describeProductImageStudioGenerationPoseSummary,
  type ProductImageStudioGenerationProviderOption,
  type ProductImageStudioGenerationResultPreview,
  type ProductImageStudioGenerationState,
} from "@/features/product-image-studio/domain/generationWorkflow";
import {
  getProductImageStudioAvailableOutputChoices,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";
import { ProductImageStudioDownloadPanel } from "./ProductImageStudioDownloadPanel";
import { ProductImageStudioResultGallery } from "./ProductImageStudioResultGallery";
import styles from "./ProductImageStudioGenerationPanel.module.css";

type ProductImageStudioGenerationPanelProps = {
  readonly concepts: readonly ProductImageStudioGenerationConcept[];
  readonly generationState: ProductImageStudioGenerationState;
  readonly onGenerate: () => void;
  readonly onRegeneratedResult: (result: ProductImageStudioGenerationResultPreview) => void;
  readonly onRetry: () => void;
  readonly onSelectConcept: (conceptId: string) => void;
  readonly onSelectProvider: (provider: ProductImageStudioProviderName) => void;
  readonly onSimilarVersion: () => void;
  readonly providerOptions: readonly ProductImageStudioGenerationProviderOption[];
  readonly providerStatus: "blocked" | "enabled";
  readonly projectId: string | null;
  readonly wizardState: ProductImageStudioWizardState;
};

type ProductImageStudioGenerationConcept = {
  readonly id: string;
  readonly label: string;
  readonly styleTags: readonly string[];
  readonly summary: string;
};

export function ProductImageStudioGenerationPanel({
  concepts,
  generationState,
  onGenerate,
  onRegeneratedResult,
  onRetry,
  onSelectConcept,
  onSelectProvider,
  onSimilarVersion,
  providerOptions,
  providerStatus,
  projectId,
  wizardState,
}: ProductImageStudioGenerationPanelProps) {
  const outputChoices = getProductImageStudioAvailableOutputChoices(wizardState);
  const selectedProviderOption = providerOptions.find((option) => option.provider === generationState.selectedProvider) ?? null;
  const selectedProviderLabel = selectedProviderOption?.label ?? generationState.selectedProvider;
  const canUseProvider = Boolean(selectedProviderOption?.connected) && providerStatus === "enabled";
  const canGenerate =
    generationState.selectedConceptId !== null && generationState.phase !== "generating" && outputChoices.length > 0 && canUseProvider;
  const statusClassName = getStatusClassName(generationState.phase);

  return (
    <section className={styles.panel} aria-label="콘셉트와 생성 설정">
      <div className={styles.heading}>
        <h3>추천 콘셉트</h3>
        <p>콘셉트를 고르고 현재 준비된 구성품으로 초안을 만듭니다.</p>
      </div>

      <div className={styles.conceptList}>
        {concepts.map((concept) => (
          <button
            className={styles.conceptButton}
            data-selected={generationState.selectedConceptId === concept.id ? "true" : "false"}
            key={concept.id}
            onClick={() => onSelectConcept(concept.id)}
            type="button"
          >
            <strong>{concept.label}</strong>
            {generationState.selectedConceptId === concept.id ? <span className={styles.selected}>선택됨</span> : null}
            <p className={styles.summary}>{concept.summary}</p>
            <span className={styles.tagLine}>{concept.styleTags.join(" · ")}</span>
          </button>
        ))}
      </div>

      <div className={styles.heading}>
        <h3>생성 출력</h3>
        <p>{describeProductImageStudioGenerationPoseSummary(wizardState)}</p>
      </div>
      <div className={styles.outputList}>
        {outputChoices.map((choice) => (
          <label className={styles.outputItem} key={choice.outputType}>
            <input checked disabled readOnly type="checkbox" />
            <span>{choice.label}</span>
          </label>
        ))}
      </div>
      {outputChoices.length === 0 ? <p className={styles.summary}>생성 가능한 출력이 아직 없습니다.</p> : null}

      <div className={styles.heading}>
        <h3>이번 생성 엔진</h3>
        <p>{selectedProviderOption?.helper ?? "생성 엔진 연결 상태를 확인해 주세요."}</p>
      </div>
      <div className={styles.providerList}>
        {providerOptions.map((option) => (
          <button
            aria-pressed={generationState.selectedProvider === option.provider}
            className={styles.providerChoice}
            data-selected={generationState.selectedProvider === option.provider ? "true" : "false"}
            disabled={option.disabled}
            key={option.provider}
            onClick={() => onSelectProvider(option.provider)}
            type="button"
          >
            <strong>{option.label}</strong>
            <span>{option.connected ? `${option.label} 연결됨` : `${option.label} 연결 안됨`}</span>
          </button>
        ))}
      </div>

      <div className={styles.heading}>
        <h3>생성 명령</h3>
        <p>위에서 고른 빠른 초안 또는 고품질 모드로 요청합니다.</p>
      </div>
      <div className={styles.actionBox}>
        <p className={`${styles.status} ${statusClassName}`}>{generationState.message}</p>
        <div className={styles.actions}>
          <button className={styles.primary} disabled={!canGenerate} onClick={onGenerate} type="button">
            {generationState.phase === "generating" ? "생성 중" : `초안 만들기 · ${selectedProviderLabel}`}
          </button>
          <button className={styles.secondary} disabled={!canGenerate} onClick={onSimilarVersion} type="button">
            비슷하게 다시 만들기
          </button>
          {generationState.phase === "blocked" || generationState.phase === "failed" ? (
            <button className={styles.secondary} onClick={onRetry} type="button">
              다시 시도
            </button>
          ) : null}
        </div>
      </div>

      {generationState.results.length > 0 ? (
        <ProductImageStudioResultGallery results={generationState.results} wizardState={wizardState} />
      ) : null}
      <ProductImageStudioDownloadPanel
        onRegeneratedResult={onRegeneratedResult}
        projectId={projectId}
        results={generationState.results}
      />
    </section>
  );
}

function getStatusClassName(phase: ProductImageStudioGenerationState["phase"]): string {
  switch (phase) {
    case "blocked":
      return styles.blocked;
    case "failed":
      return styles.failed;
    case "ready":
      return styles.ready;
    case "generating":
    case "idle":
      return "";
  }
}
