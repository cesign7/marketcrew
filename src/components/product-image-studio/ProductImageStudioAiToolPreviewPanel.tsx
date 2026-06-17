"use client";

import { Download, Image as ImageIcon, Loader2 } from "lucide-react";
import type { ProductImageStudioAiTool } from "./ProductImageStudioAiToolCatalog";
import type { ProductImageStudioSvgConversionState } from "./ProductImageStudioSvgConversionModal";
import styles from "./ProductImageStudioAiToolWorkspace.module.css";

export type ProductImageStudioAiToolPreviewPhase = "generating" | "idle" | "ready";

type ProductImageStudioAiToolPreviewPanelProps = {
  readonly countLabel: string;
  readonly phase: ProductImageStudioAiToolPreviewPhase;
  readonly quality: string;
  readonly ratioLabel: string;
  readonly svgState?: ProductImageStudioSvgConversionState;
  readonly tool: ProductImageStudioAiTool;
};

export function ProductImageStudioAiToolPreviewPanel({
  countLabel,
  phase,
  quality,
  ratioLabel,
  svgState,
  tool,
}: ProductImageStudioAiToolPreviewPanelProps) {
  const state = readPreviewState(phase, svgState);

  return (
    <aside aria-label="생성 결과 미리보기" className={styles.resultPanel} data-ai-tool-result-panel="true">
      <div className={styles.resultHeader}>
        <div>
          <p>{state.status}</p>
          <h3>오른쪽 미리보기</h3>
        </div>
        <button aria-label="결과 다운로드" className={styles.secondaryButton} type="button">
          <Download aria-hidden="true" size={15} strokeWidth={2.3} />
        </button>
      </div>
      <div className={styles.previewStage}>{renderPreviewContent({ countLabel, quality, ratioLabel, state, svgState, tool })}</div>
    </aside>
  );
}

function renderPreviewContent(input: {
  readonly countLabel: string;
  readonly quality: string;
  readonly ratioLabel: string;
  readonly state: ReturnType<typeof readPreviewState>;
  readonly svgState?: ProductImageStudioSvgConversionState;
  readonly tool: ProductImageStudioAiTool;
}) {
  if (input.state.kind === "loading") {
    return (
      <div className={styles.loadingPreview}>
        <span className={styles.previewIcon}>
          <Loader2 aria-hidden="true" size={24} strokeWidth={2.2} />
        </span>
        <div className={styles.previewText}>
          <strong>이미지를 생성 중입니다.</strong>
          <span>완료되면 이 자리에서 바로 결과가 열립니다.</span>
        </div>
      </div>
    );
  }

  if (input.svgState?.kind === "success") {
    return <SvgResultCard state={input.svgState} />;
  }

  if (input.state.kind === "ready") {
    return <GeneratedResultCard countLabel={input.countLabel} quality={input.quality} ratioLabel={input.ratioLabel} tool={input.tool} />;
  }

  return (
    <div className={styles.emptyPreview}>
      <span className={styles.previewIcon}>
        <ImageIcon aria-hidden="true" size={24} strokeWidth={2.2} />
      </span>
      <div className={styles.previewText}>
        <strong>생성 결과가 이곳에 표시됩니다.</strong>
        <span>페이지를 이동하지 않고 같은 모달 오른쪽에서 바로 확인합니다.</span>
      </div>
    </div>
  );
}

function GeneratedResultCard({
  countLabel,
  quality,
  ratioLabel,
  tool,
}: {
  readonly countLabel: string;
  readonly quality: string;
  readonly ratioLabel: string;
  readonly tool: ProductImageStudioAiTool;
}) {
  return (
    <article className={styles.resultCard}>
      <div className={styles.generatedImage}>
        <span className={styles.generatedBadge}>{quality}</span>
      </div>
      <div className={styles.resultMeta}>
        <div>
          <strong>{tool.previewLabel}</strong>
          <span>
            {ratioLabel} · {countLabel} · 모달 내 생성
          </span>
        </div>
        <button className={styles.secondaryButton} type="button">
          저장
        </button>
      </div>
    </article>
  );
}

function SvgResultCard({ state }: { readonly state: Extract<ProductImageStudioSvgConversionState, { readonly kind: "success" }> }) {
  return (
    <article className={styles.resultCard}>
      <object aria-label="SVG 변환 결과 미리보기" className={styles.generatedImage} data={state.downloadUrl} type={state.contentType}>
        SVG 미리보기
      </object>
      <div className={styles.resultMeta}>
        <div>
          <strong>{state.fileName}</strong>
          <span>{state.contentType}</span>
        </div>
        <a className={styles.secondaryButton} download={state.fileName} href={state.downloadUrl}>
          저장
        </a>
      </div>
    </article>
  );
}

function readPreviewState(
  phase: ProductImageStudioAiToolPreviewPhase,
  svgState: ProductImageStudioSvgConversionState | undefined,
): { readonly kind: "empty"; readonly status: string } | { readonly kind: "loading"; readonly status: string } | { readonly kind: "ready"; readonly status: string } {
  if (svgState?.kind === "loading" || phase === "generating") {
    return { kind: "loading", status: "생성 중" };
  }
  if (svgState?.kind === "success" || phase === "ready") {
    return { kind: "ready", status: "생성 완료" };
  }
  return { kind: "empty", status: "대기 중" };
}
