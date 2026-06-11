import { PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES } from "@/features/product-image-studio/domain/types";
import {
  describeProductImageStudioGenerationPoseSummary,
  type ProductImageStudioGenerationResultPreview,
  type ProductImageStudioGenerationState,
} from "@/features/product-image-studio/domain/generationWorkflow";
import { getProductImageStudioOutputChoices, type ProductImageStudioWizardState } from "@/features/product-image-studio/domain/projectWizard";
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
  readonly onSimilarVersion: () => void;
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
  onSimilarVersion,
  projectId,
  wizardState,
}: ProductImageStudioGenerationPanelProps) {
  const canGenerate = generationState.selectedConceptId !== null && generationState.phase !== "generating";
  const statusClassName = getStatusClassName(generationState.phase);

  return (
    <section className={styles.panel} aria-label="콘셉트와 생성 설정">
      <div className={styles.heading}>
        <h3>콘셉트 선택</h3>
        <p>선택한 콘셉트로 네 가지 기본 출력 이미지를 함께 생성합니다.</p>
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
        {getProductImageStudioOutputChoices().map((choice) => (
          <label className={styles.outputItem} key={choice.outputType}>
            <input checked={PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES.some((outputType) => outputType === choice.outputType)} disabled readOnly type="checkbox" />
            <span>{choice.label}</span>
          </label>
        ))}
      </div>

      <div className={styles.actionBox}>
        <p className={`${styles.status} ${statusClassName}`}>{generationState.message}</p>
        <div className={styles.actions}>
          <button className={styles.primary} disabled={!canGenerate} onClick={onGenerate} type="button">
            {generationState.phase === "generating" ? "생성 중" : "초안 생성"}
          </button>
          <button className={styles.secondary} disabled={!canGenerate} onClick={onSimilarVersion} type="button">
            비슷한 버전 생성
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
