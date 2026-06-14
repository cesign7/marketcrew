"use client";

import { useCallback, useRef, useState, type ChangeEvent, type SetStateAction } from "react";
import type { ProductImageStudioAssetRole } from "@/features/product-image-studio/domain/types";
import {
  createProductImageStudioProject,
  fetchProductImageStudioConcepts,
  startProductImageStudioGeneration,
  uploadProductImageStudioAsset,
  type ProductImageStudioConceptCard,
} from "@/features/product-image-studio/client/projectWizardApi";
import {
  buildProductImageStudioGenerationPayload,
  createGeneratingProductImageStudioGenerationState,
  createInitialProductImageStudioGenerationState,
  mergeProductImageStudioGenerationResultState,
  selectProductImageStudioConcept,
  selectProductImageStudioGenerationProvider,
  type ProductImageStudioGenerationResultPreview,
  type ProductImageStudioGenerationState,
} from "@/features/product-image-studio/domain/generationWorkflow";
import {
  canUploadProductImageStudioAssetRole,
  canRequestProductImageStudioConcepts,
  createInitialProductImageStudioWizardState,
  recordProductImageStudioUploadedRole,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";
import type { ProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import type { ProductImageStudioProviderSettingsSummary } from "@/features/product-image-studio/server/providerSettingsStore";
import { ProductImageStudioGenerationPanel } from "./ProductImageStudioGenerationPanel";
import { ProductImageStudioOutputControls } from "./ProductImageStudioOutputControls";
import { ProductImageStudioProductionSettingsPanel } from "./ProductImageStudioProductionSettingsPanel";
import { ProductImageStudioProjectSettings } from "./ProductImageStudioProjectSettings";
import { ProductImageStudioQualityOption } from "./ProductImageStudioQualityOption";
import { ProductImageStudioUploadSection } from "./ProductImageStudioUploadSection";
import { ProductImageStudioWorkbenchIntro } from "./ProductImageStudioWorkbenchIntro";
import { ProductImageStudioWorkflowSteps } from "./ProductImageStudioWorkflowSteps";
import {
  createProductImageStudioGenerationProviderOptions,
  getInitialProductImageStudioGenerationProvider,
} from "./productImageStudioGenerationProviders";
import styles from "./ProductImageStudioWizard.module.css";

type StatusMessage = {
  readonly tone: "error" | "info" | "success";
  readonly text: string;
};

type ProductImageStudioWizardProps = {
  readonly initialProviderSettings: ProductImageStudioProviderSettingsSummary | null;
  readonly providerStatus: ProductImageStudioProviderStatus;
};

export function ProductImageStudioWizard({ initialProviderSettings, providerStatus }: ProductImageStudioWizardProps) {
  const [state, setState] = useState<ProductImageStudioWizardState>(createInitialProductImageStudioWizardState);
  const stateRef = useRef<ProductImageStudioWizardState>(state);
  const projectIdRef = useRef<string | null>(null);
  const projectRequestRef = useRef<Promise<string | null> | null>(null);
  const [concepts, setConcepts] = useState<readonly ProductImageStudioConceptCard[]>([]);
  const [generationState, setGenerationState] = useState<ProductImageStudioGenerationState>(
    () =>
      createInitialProductImageStudioGenerationState(
        getInitialProductImageStudioGenerationProvider(initialProviderSettings, providerStatus),
      ),
  );
  const [statusMessage, setStatusMessage] = useState<StatusMessage>({
    text: "프로젝트 이름, 실제 규격, 생성할 구성품 이미지를 준비하면 콘셉트를 추천받을 수 있습니다.",
    tone: "info",
  });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [busyRole, setBusyRole] = useState<ProductImageStudioAssetRole | null>(null);
  const [isRecommending, setIsRecommending] = useState(false);
  const canRecommend = canRequestProductImageStudioConcepts(state);
  const providerOptions = createProductImageStudioGenerationProviderOptions(providerStatus);
  stateRef.current = state;
  const setWizardState = useCallback((update: SetStateAction<ProductImageStudioWizardState>) => {
    const nextState = typeof update === "function" ? update(stateRef.current) : update;
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  return (
    <div className={styles.layout}>
      <section className={styles.mainPanel} aria-label="상품 이미지 프로젝트 위저드">
        <ProductImageStudioWorkbenchIntro />

        <ProductImageStudioWorkflowSteps state={state} />
        <ProductImageStudioProjectSettings setState={setWizardState} state={state} />
        <ProductImageStudioProductionSettingsPanel setState={setWizardState} state={state} />
        <ProductImageStudioUploadSection busyRole={busyRole} onUpload={handleUpload} state={state} />
      </section>

      <aside className={styles.sidePanel} aria-label="추천 준비 설정">
        <ProductImageStudioOutputControls state={state} />

        <fieldset className={styles.qualityGroup}>
          <legend>품질 모드</legend>
          <ProductImageStudioQualityOption current={state.qualityMode} label="빠른 초안" mode="draft" setState={setWizardState} />
          <ProductImageStudioQualityOption current={state.qualityMode} label="고품질" mode="high" setState={setWizardState} />
        </fieldset>

        <div className={styles.actionBox}>
          <p className={styles[statusMessage.tone]}>{statusMessage.text}</p>
          <button
            className={styles.primaryAction}
            disabled={!canRecommend || isRecommending}
            onClick={() => void handleRecommendConcepts()}
            type="button"
          >
            {isRecommending ? "추천 불러오는 중" : "콘셉트 추천"}
          </button>
        </div>

        {concepts.length === 0 ? (
          <section className={styles.conceptPanel} aria-live="polite">
            <div className={styles.sectionTitle}>
              <h3>추천 콘셉트</h3>
              <p>선택한 형식과 업로드 이미지를 기준으로 생성 명령을 준비합니다.</p>
            </div>
            <p className={styles.emptyText}>아직 추천 콘셉트가 없습니다.</p>
          </section>
        ) : (
          <ProductImageStudioGenerationPanel
            concepts={concepts}
            generationState={generationState}
            onGenerate={() => void handleStartGeneration()}
            onRegeneratedResult={handleRegeneratedResult}
            onRetry={() => void handleStartGeneration()}
            onSelectConcept={(conceptId) =>
              setGenerationState((current) => selectProductImageStudioConcept(current, conceptId))
            }
            onSelectProvider={handleSelectProvider}
            onSimilarVersion={() => void handleStartGeneration()}
            providerOptions={providerOptions}
            providerStatus={providerStatus.generation.status}
            projectId={projectId}
            wizardState={state}
          />
        )}
      </aside>
    </div>
  );

  async function handleUpload(role: ProductImageStudioAssetRole, event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.item(0) ?? null;
    if (!file) {
      return;
    }
    if (!canUploadProductImageStudioAssetRole(stateRef.current, role)) {
      setStatusMessage({ text: "프로젝트 이름과 해당 구성품의 실제 규격을 먼저 입력해 주세요.", tone: "error" });
      return;
    }

    const ensuredProjectId = await ensureProjectId(stateRef.current);
    if (!ensuredProjectId) {
      return;
    }

    setBusyRole(role);
    const result = await uploadProductImageStudioAsset(ensuredProjectId, role, file);
    setBusyRole(null);

    if (!result.ok) {
      setStatusMessage({ text: result.message, tone: "error" });
      return;
    }

    setWizardState((current) => recordProductImageStudioUploadedRole(current, result.value));
    setStatusMessage({ text: "이미지가 업로드되었습니다.", tone: "success" });
  }

  async function handleRecommendConcepts(): Promise<void> {
    if (!canRequestProductImageStudioConcepts(stateRef.current)) {
      return;
    }

    setIsRecommending(true);
    const ensuredProjectId = await ensureProjectId(stateRef.current);
    if (!ensuredProjectId) {
      setIsRecommending(false);
      return;
    }

    const result = await fetchProductImageStudioConcepts();
    if (result.ok) {
      setConcepts(result.value);
      setStatusMessage({ text: "추천 콘셉트를 불러왔습니다.", tone: "success" });
    } else {
      setStatusMessage({ text: result.message, tone: "error" });
    }
    setIsRecommending(false);
  }

  async function handleStartGeneration(): Promise<void> {
    const payload = buildProductImageStudioGenerationPayload(stateRef.current, generationState);
    if (!payload) {
      setStatusMessage({ text: "생성 가능한 출력이 없습니다. 규격과 이미지를 먼저 확인해 주세요.", tone: "error" });
      return;
    }

    const ensuredProjectId = await ensureProjectId(stateRef.current);
    if (!ensuredProjectId) {
      return;
    }

    const previousGenerationState = generationState;
    setGenerationState((current) => createGeneratingProductImageStudioGenerationState(current));
    const result = await startProductImageStudioGeneration(ensuredProjectId, payload);
    setGenerationState({
      ...mergeProductImageStudioGenerationResultState(previousGenerationState, result),
      selectedConceptId: payload.conceptId,
    });
  }

  function handleRegeneratedResult(result: ProductImageStudioGenerationResultPreview): void {
    setGenerationState((current) => {
      const nextResults = current.results.some((candidate) => candidate.id === result.id)
        ? current.results
        : [...current.results, result];
      return {
        ...current,
        message: "비율 변경 이미지가 준비되었습니다.",
        phase: "ready",
        results: nextResults,
      };
    });
  }

  function handleSelectProvider(provider: ProductImageStudioProviderName): void {
    setGenerationState((current) => selectProductImageStudioGenerationProvider(current, provider));
  }

  async function ensureProjectId(snapshot: ProductImageStudioWizardState): Promise<string | null> {
    if (projectIdRef.current) {
      return projectIdRef.current;
    }

    if (projectRequestRef.current) {
      return projectRequestRef.current;
    }

    const request = createProductImageStudioProject(snapshot)
      .then((result) => {
        if (!result.ok) {
          setStatusMessage({ text: result.message, tone: "error" });
          return null;
        }

        projectIdRef.current = result.value;
        setProjectId(result.value);
        return result.value;
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          setStatusMessage({ text: "프로젝트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.", tone: "error" });
          return null;
        }
        throw error;
      })
      .finally(() => {
        projectRequestRef.current = null;
      });

    projectRequestRef.current = request;
    return request;
  }
}
