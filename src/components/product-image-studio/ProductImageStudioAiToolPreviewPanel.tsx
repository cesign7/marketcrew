"use client";

import { AlertTriangle, Download, FileDown, Image as ImageIcon, Loader2 } from "lucide-react";
import type { ProductImageStudioImageGeneratorResultPreview } from "@/features/product-image-studio/client/imageGeneratorApi";
import type { ProductImageStudioAiTool } from "./ProductImageStudioAiToolCatalog";
import type { ProductImageStudioAiToolUploadedAsset } from "./ProductImageStudioAiToolUploads";
import type { ProductImageStudioSvgConversionState } from "./ProductImageStudioSvgConversionModal";
import type { ProductImageStudioAiToolOutputRatio } from "./ProductImageStudioAiToolWorkspaceOptions";
import styles from "./ProductImageStudioAiToolWorkspace.module.css";

export type ProductImageStudioAiToolPreviewPhase = "blocked" | "failed" | "generating" | "idle" | "partial" | "ready";

type ProductImageStudioAiToolPreviewPanelProps = {
  readonly countLabel: string;
  readonly featuredAsset?: ProductImageStudioAiToolUploadedAsset;
  readonly generatedResults: readonly ProductImageStudioImageGeneratorResultPreview[];
  readonly message: string | null;
  readonly phase: ProductImageStudioAiToolPreviewPhase;
  readonly quality: string;
  readonly ratioLabel: string;
  readonly ratioValue: ProductImageStudioAiToolOutputRatio;
  readonly svgState?: ProductImageStudioSvgConversionState;
  readonly tool: ProductImageStudioAiTool;
  readonly uploadedCount: number;
};

type GeneratedResultCardsProps = {
  readonly countLabel: string;
  readonly message: string | null;
  readonly phase: "partial" | "ready";
  readonly quality: string;
  readonly results: readonly ProductImageStudioImageGeneratorResultPreview[];
  readonly tool: ProductImageStudioAiTool;
};

type PreviewState =
  | { readonly kind: "blocked" | "failed" | "partial" | "ready"; readonly message: string; readonly status: string }
  | { readonly kind: "empty" | "loading"; readonly status: string };

type PreviewContentInput = ProductImageStudioAiToolPreviewPanelProps & { readonly state: PreviewState };

export function ProductImageStudioAiToolPreviewPanel(props: ProductImageStudioAiToolPreviewPanelProps) {
  const state = readPreviewState(props.phase, props.message, props.svgState);

  return (
    <aside aria-label="생성 결과 미리보기" className={styles.resultPanel} data-ai-tool-result-panel="true">
      <div className={styles.resultHeader}>
        <div>
          <p>{state.status}</p>
          <h3>오른쪽 미리보기</h3>
        </div>
        <button aria-label="결과 다운로드" className={styles.secondaryButton} disabled type="button">
          <Download aria-hidden="true" size={15} strokeWidth={2.3} />
        </button>
      </div>
      <div className={styles.previewStage}>
        {renderPreviewContent({ ...props, state })}
      </div>
    </aside>
  );
}

function renderPreviewContent(input: PreviewContentInput) {
  if (input.state.kind === "loading") {
    return <StatusPreview icon="loading" message="완료되면 이 자리에서 바로 결과가 열립니다." title="이미지를 생성 중입니다." />;
  }

  if (input.svgState?.kind === "success") {
    return <SvgResultCard state={input.svgState} />;
  }

  if (input.state.kind === "ready" || input.state.kind === "partial") {
    if (input.generatedResults.length > 0) {
      return (
        <GeneratedResultCards
          countLabel={input.countLabel}
          message={input.state.message}
          phase={input.state.kind}
          quality={input.quality}
          results={input.generatedResults}
          tool={input.tool}
        />
      );
    }
    return <StatusPreview icon="warning" message={input.state.message} title={input.state.kind === "partial" ? "일부 결과만 준비되었습니다." : "생성 결과를 기다리는 중입니다."} />;
  }

  if (input.state.kind === "blocked" || input.state.kind === "failed") {
    return <StatusPreview icon="warning" message={input.state.message} title={input.state.kind === "blocked" ? "생성을 시작할 수 없습니다." : "생성에 실패했습니다."} />;
  }

  return (
    <SizePreview
      featuredAsset={input.featuredAsset}
      ratioLabel={input.ratioLabel}
      ratioValue={input.ratioValue}
      tool={input.tool}
      uploadedCount={input.uploadedCount}
    />
  );
}

function GeneratedResultCards({ countLabel, message, phase, quality, results, tool }: GeneratedResultCardsProps) {
  return (
    <div className={styles.sizePreview} data-ai-tool-generated-results="true" data-ai-tool-generated-state={phase}>
      {message ? (
        <p className={styles.resultNotice} data-ai-tool-result-message="true">
          {message}
        </p>
      ) : null}
      {results.map((result, index) => (
        <article className={styles.resultCard} data-ai-tool-generated-result="true" key={result.id}>
          <div className={styles.generatedImage} data-has-preview={result.previewUrl ? "true" : "false"}>
            {result.previewUrl ? (
              <img alt={`${tool.previewLabel} ${index + 1}`} className={styles.sizePreviewImage} data-ai-tool-generated-preview="true" src={result.previewUrl} />
            ) : (
              <span className={styles.previewText}>미리보기 URL 대기</span>
            )}
            <span className={styles.generatedBadge}>{quality}</span>
          </div>
          <div className={styles.resultMeta}>
            <div>
              <strong>{result.label}</strong>
              <span>
                {result.ratio} · {countLabel} · 모달 내 생성
              </span>
            </div>
            <GeneratedResultActions result={result} />
          </div>
        </article>
      ))}
    </div>
  );
}

function GeneratedResultActions({ result }: { readonly result: ProductImageStudioImageGeneratorResultPreview }) {
  if (!result.previewUrl && !result.downloadUrl && !result.vectorSvgUrl) {
    return <span className={styles.sizePreviewRule}>URL 대기</span>;
  }

  return (
    <div className={styles.resultActions}>
      {result.previewUrl ? (
        <a className={styles.secondaryButton} data-ai-tool-generated-preview-action="true" href={result.previewUrl}>
          <ImageIcon aria-hidden="true" size={14} strokeWidth={2.25} /> 생성 미리보기
        </a>
      ) : null}
      {result.downloadUrl ? (
        <a className={styles.secondaryButton} data-ai-tool-generated-download="true" download href={result.downloadUrl}>
          <Download aria-hidden="true" size={14} strokeWidth={2.25} /> 이미지 다운로드
        </a>
      ) : null}
      {result.vectorSvgUrl ? (
        <a className={styles.secondaryButton} data-ai-tool-generated-vector="true" download href={result.vectorSvgUrl}>
          <FileDown aria-hidden="true" size={14} strokeWidth={2.25} /> SVG 다운로드
        </a>
      ) : null}
    </div>
  );
}

function StatusPreview({
  icon,
  message,
  title,
}: {
  readonly icon: "loading" | "warning";
  readonly message: string;
  readonly title: string;
}) {
  return (
    <div className={styles.loadingPreview}>
      <span className={styles.previewIcon}>
        {icon === "loading" ? (
          <Loader2 aria-hidden="true" size={24} strokeWidth={2.2} />
        ) : (
          <AlertTriangle aria-hidden="true" size={24} strokeWidth={2.2} />
        )}
      </span>
      <div className={styles.previewText}>
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}

function SizePreview({
  featuredAsset,
  ratioLabel,
  ratioValue,
  tool,
  uploadedCount,
}: {
  readonly featuredAsset?: ProductImageStudioAiToolUploadedAsset;
  readonly ratioLabel: string;
  readonly ratioValue: ProductImageStudioAiToolOutputRatio;
  readonly tool: ProductImageStudioAiTool;
  readonly uploadedCount: number;
}) {
  return (
    <div className={styles.sizePreview} data-ai-tool-size-preview="true" data-output-ratio={ratioValue}>
      <div className={styles.sizePreviewFrame} data-ai-tool-size-preview-frame="true" data-output-ratio={ratioValue}>
        {featuredAsset ? (
          <img alt={`${featuredAsset.slotTitle} 크기 미리보기`} className={styles.sizePreviewImage} src={featuredAsset.previewUrl} />
        ) : (
          <div className={styles.sizePreviewEmpty}>
            <span className={styles.previewIcon}>
              <ImageIcon aria-hidden="true" size={24} strokeWidth={2.2} />
            </span>
            <strong>업로드하면 이 영역에서 바로 확인합니다.</strong>
            <span>출력 비율에 맞춘 여백과 잘림을 먼저 볼 수 있습니다.</span>
          </div>
        )}
      </div>
      <div className={styles.sizePreviewMeta}>
        <div>
          <strong>{featuredAsset ? featuredAsset.fileName : tool.previewLabel}</strong>
          <span>
            {ratioLabel} · {uploadedCount > 0 ? `${uploadedCount}개 업로드` : "업로드 대기"}
          </span>
        </div>
        <span className={styles.sizePreviewRule}>{featuredAsset ? featuredAsset.slotTitle : "프리뷰"}</span>
      </div>
    </div>
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
  message: string | null,
  svgState: ProductImageStudioSvgConversionState | undefined,
): PreviewState {
  if (svgState?.kind === "loading" || phase === "generating") {
    return { kind: "loading", status: "생성 중" };
  }
  if (svgState?.kind === "success" || phase === "ready") {
    return { kind: "ready", message: message ?? "생성 이미지가 준비되었습니다.", status: "생성 완료" };
  }
  if (phase === "partial") {
    return { kind: "partial", message: message ?? "일부 이미지만 준비되었습니다.", status: "일부 완료" };
  }
  if (phase === "blocked") {
    return { kind: "blocked", message: message ?? "생성 조건을 다시 확인해 주세요.", status: "생성 차단" };
  }
  if (phase === "failed") {
    return { kind: "failed", message: message ?? "이미지를 생성하지 못했습니다.", status: "생성 실패" };
  }
  return { kind: "empty", status: "대기 중" };
}
