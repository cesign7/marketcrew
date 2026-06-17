"use client";

import { useEffect, useState } from "react";
import {
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_CONTRACTS,
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_LABELS,
  type ProductImageStudioImageGeneratorModelLabel,
} from "@/features/product-image-studio/domain/imageGenerator";
import { CompactWorkModal } from "./ProductImageStudioSaasPrimitives";
import type { ProductImageStudioAiTool } from "./ProductImageStudioAiToolCatalog";
import { ProductImageStudioAiToolOptionSheet, type ProductImageStudioAiToolOption } from "./ProductImageStudioAiToolOptionSheet";
import { ProductImageStudioAiToolPreviewPanel, type ProductImageStudioAiToolPreviewPhase } from "./ProductImageStudioAiToolPreviewPanel";
import {
  ProductImageStudioSvgConversionModal,
  type ProductImageStudioSvgConversionState,
} from "./ProductImageStudioSvgConversionModal";
import styles from "./ProductImageStudioAiToolWorkspace.module.css";

type OutputRatio = "1:1" | "16:9" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "original";
type OutputQuality = "1k" | "2k" | "4k";
type OutputCount = 1 | 2 | 4 | 8;
type SheetKind = "quality" | "ratio" | null;

type ProductImageStudioAiToolWorkspaceModalProps = {
  readonly onClose: () => void;
  readonly svgConversionInitialState?: ProductImageStudioSvgConversionState;
  readonly svgConversionInitialTitle?: string;
  readonly tool: ProductImageStudioAiTool;
};

const RATIO_OPTIONS = [
  { description: "업로드 비율 유지", label: "원본", value: "original" },
  { description: "릴스, 숏폼", label: "세로 9:16", value: "9:16" },
  { description: "상세페이지", label: "세로 3:4", value: "3:4" },
  { description: "포스터형", label: "세로 2:3", value: "2:3" },
  { description: "스마트스토어 대표", label: "정사각형 1:1", value: "1:1" },
  { description: "상품 목록", label: "가로 3:2", value: "3:2" },
  { description: "상세 설명", label: "가로 4:3", value: "4:3" },
  { description: "블로그, 배너", label: "가로 16:9", value: "16:9" },
] as const satisfies readonly ProductImageStudioAiToolOption<OutputRatio>[];

const QUALITY_OPTIONS = [
  { description: "시안 확인과 여러 안 비교에 적합합니다.", label: "1k", value: "1k" },
  { description: "상품 목록과 상세페이지용 기본 고화질입니다.", label: "2k", value: "2k" },
  { description: "확대 컷, 큰 상세 이미지, 보관용 결과에 사용합니다.", label: "4k", value: "4k" },
] as const satisfies readonly ProductImageStudioAiToolOption<OutputQuality>[];

const COUNT_OPTIONS = [1, 2, 4, 8] as const satisfies readonly OutputCount[];

export function ProductImageStudioAiToolWorkspaceModal({
  onClose,
  svgConversionInitialState,
  svgConversionInitialTitle,
  tool,
}: ProductImageStudioAiToolWorkspaceModalProps) {
  const [modelLabel, setModelLabel] = useState<ProductImageStudioImageGeneratorModelLabel>("gpt2");
  const [ratio, setRatio] = useState<OutputRatio>("1:1");
  const [quality, setQuality] = useState<OutputQuality>("1k");
  const [count, setCount] = useState<OutputCount>(1);
  const [phase, setPhase] = useState<ProductImageStudioAiToolPreviewPhase>("idle");
  const [activeSheet, setActiveSheet] = useState<SheetKind>(null);
  const [svgState, setSvgState] = useState<ProductImageStudioSvgConversionState>(svgConversionInitialState ?? { kind: "idle" });

  useEffect(() => {
    if (phase !== "generating") return undefined;
    const timeoutId = window.setTimeout(() => setPhase("ready"), 650);
    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  return (
    <>
      <CompactWorkModal description={tool.description} onClose={onClose} open size="workspace" title={tool.title}>
        <div className={styles.workspace} data-ai-tool-workspace="true">
          <div className={styles.controlPanel}>
            {tool.kind === "svg" ? (
              <div className={styles.controlBody}>
                <ProductImageStudioSvgConversionModal
                  initialState={svgState}
                  initialTitle={svgConversionInitialTitle}
                  onStateChange={setSvgState}
                />
              </div>
            ) : (
              <GeneratorControls
                count={count}
                modelLabel={modelLabel}
                onCountChange={setCount}
                onGenerate={() => setPhase("generating")}
                onModelLabelChange={setModelLabel}
                onQualityOpen={() => setActiveSheet("quality")}
                onRatioOpen={() => setActiveSheet("ratio")}
                quality={quality}
                ratio={ratio}
                tool={tool}
              />
            )}
          </div>
          <ProductImageStudioAiToolPreviewPanel
            countLabel={`${count}컷`}
            phase={phase}
            quality={quality}
            ratioLabel={readRatioLabel(ratio)}
            svgState={svgState}
            tool={tool}
          />
        </div>
      </CompactWorkModal>

      <ProductImageStudioAiToolOptionSheet
        eyebrow="사이즈"
        onClose={() => setActiveSheet(null)}
        onSelect={(value) => {
          setRatio(value);
          setActiveSheet(null);
        }}
        open={activeSheet === "ratio"}
        options={RATIO_OPTIONS}
        selected={ratio}
        title="출력 형태 선택"
      />
      <ProductImageStudioAiToolOptionSheet
        eyebrow="화질"
        onClose={() => setActiveSheet(null)}
        onSelect={(value) => {
          setQuality(value);
          setActiveSheet(null);
        }}
        open={activeSheet === "quality"}
        options={QUALITY_OPTIONS}
        selected={quality}
        title="출력 화질 선택"
      />
    </>
  );
}

function GeneratorControls({
  count,
  modelLabel,
  onCountChange,
  onGenerate,
  onModelLabelChange,
  onQualityOpen,
  onRatioOpen,
  quality,
  ratio,
  tool,
}: {
  readonly count: OutputCount;
  readonly modelLabel: ProductImageStudioImageGeneratorModelLabel;
  readonly onCountChange: (count: OutputCount) => void;
  readonly onGenerate: () => void;
  readonly onModelLabelChange: (modelLabel: ProductImageStudioImageGeneratorModelLabel) => void;
  readonly onQualityOpen: () => void;
  readonly onRatioOpen: () => void;
  readonly quality: OutputQuality;
  readonly ratio: OutputRatio;
  readonly tool: ProductImageStudioAiTool;
}) {
  return (
    <>
      <div className={styles.controlBody}>
        <section className={styles.section}>
          <p className={styles.sectionTitle}>작업</p>
          <div className={styles.toolSwitch} aria-label="AI 작업 선택">
            <button data-active="true" type="button">{tool.title}</button>
            <button type="button">배경/소품</button>
            <button type="button">SVG 변환</button>
          </div>
        </section>
        <section className={styles.section}>
          <p className={styles.sectionTitle}>참고 이미지</p>
          <div className={styles.uploadBox}>
            <strong>{tool.uploadTitle}</strong>
            <span>{tool.uploadHint}</span>
          </div>
        </section>
        <section className={styles.section}>
          <label className={styles.field}>
            <span>프롬프트</span>
            <textarea defaultValue={tool.initialPrompt} name={`${tool.id}-prompt`} />
          </label>
          <label className={styles.field}>
            <span>추가 지시</span>
            <textarea data-compact="true" defaultValue={tool.initialInstruction} name={`${tool.id}-instruction`} />
          </label>
        </section>
        <section className={styles.section}>
          <div className={styles.inlineGrid}>
            <label className={styles.field}>
              <span>모델</span>
              <select className={styles.selectLike} onChange={(event) => onModelLabelChange(readModelLabel(event.currentTarget.value, modelLabel))} value={modelLabel}>
                {PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_LABELS.map((option) => (
                  <option key={option} value={option}>{PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_CONTRACTS[option].displayLabel}</option>
                ))}
              </select>
            </label>
            <div className={styles.outputPanel}>
              <p className={styles.sectionTitle}>사이즈</p>
              <button className={styles.selectLike} data-ai-tool-size-trigger="true" onClick={onRatioOpen} type="button">
                <span>{readRatioLabel(ratio)}</span>
                <span>변경</span>
              </button>
            </div>
          </div>
        </section>
        <section className={styles.section}>
          <div className={styles.outputGrid}>
            <div className={styles.outputPanel}>
              <p className={styles.sectionTitle}>화질</p>
              <button className={styles.selectLike} data-ai-tool-quality-trigger="true" onClick={onQualityOpen} type="button">
                <span>{quality}</span>
                <span>변경</span>
              </button>
            </div>
            <div className={styles.outputPanel}>
              <p className={styles.sectionTitle}>생성 개수</p>
              <div className={styles.countGrid} aria-label="생성 개수">
                {COUNT_OPTIONS.map((option) => (
                  <button data-active={count === option ? "true" : "false"} key={option} onClick={() => onCountChange(option)} type="button">
                    {option}컷
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      <footer className={styles.controlFooter}>
        <button className={styles.secondaryButton} type="button">취소</button>
        <button className={styles.primaryButton} onClick={onGenerate} type="button">생성하기</button>
      </footer>
    </>
  );
}

function readModelLabel(value: string, fallback: ProductImageStudioImageGeneratorModelLabel): ProductImageStudioImageGeneratorModelLabel {
  return PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_LABELS.find((option) => option === value) ?? fallback;
}

function readRatioLabel(value: OutputRatio): string {
  return RATIO_OPTIONS.find((option) => option.value === value)?.label ?? "정사각형 1:1";
}
