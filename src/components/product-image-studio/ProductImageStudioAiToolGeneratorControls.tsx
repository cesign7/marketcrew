"use client";

import { PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_LABELS, type ProductImageStudioImageGeneratorModelLabel } from "@/features/product-image-studio/domain/imageGenerator";
import type { ChangeEvent } from "react";
import type { ProductImageStudioAiTool, ProductImageStudioAiToolChoiceGroup, ProductImageStudioAiToolUploadSlot } from "./ProductImageStudioAiToolCatalog";
import { ProductImageStudioAiToolUploadSlots, type ProductImageStudioAiToolUploadedAsset } from "./ProductImageStudioAiToolUploads";
import {
  PRODUCT_IMAGE_STUDIO_AI_TOOL_COUNT_OPTIONS,
  readProductImageStudioAiToolModelDisplayLabel,
  readProductImageStudioAiToolModelLabel,
  readProductImageStudioAiToolRatioLabel,
  type ProductImageStudioAiToolOutputCount,
  type ProductImageStudioAiToolOutputQuality,
  type ProductImageStudioAiToolOutputRatio,
} from "./ProductImageStudioAiToolWorkspaceOptions";
import styles from "./ProductImageStudioAiToolWorkspace.module.css";

export type ProductImageStudioAiToolChoiceSelections = Readonly<Record<string, string>>;

type ProductImageStudioAiToolGeneratorControlsProps = {
  readonly assets: readonly ProductImageStudioAiToolUploadedAsset[];
  readonly choiceSelections: ProductImageStudioAiToolChoiceSelections;
  readonly count: ProductImageStudioAiToolOutputCount;
  readonly modelLabel: ProductImageStudioImageGeneratorModelLabel;
  readonly onAssetRemove: (assetId: string) => void;
  readonly onAssetSelect: (assetId: string) => void;
  readonly onAssetUpload: (slot: ProductImageStudioAiToolUploadSlot, event: ChangeEvent<HTMLInputElement>) => void;
  readonly onChoiceSelect: (groupId: string, optionId: string) => void;
  readonly onCountChange: (count: ProductImageStudioAiToolOutputCount) => void;
  readonly onGenerate: () => void;
  readonly onInstructionChange: (instruction: string) => void;
  readonly onModelLabelChange: (modelLabel: ProductImageStudioImageGeneratorModelLabel) => void;
  readonly onPromptChange: (prompt: string) => void;
  readonly onQualityOpen: () => void;
  readonly onRatioOpen: () => void;
  readonly phase: "blocked" | "failed" | "generating" | "idle" | "partial" | "ready";
  readonly quality: ProductImageStudioAiToolOutputQuality;
  readonly ratio: ProductImageStudioAiToolOutputRatio;
  readonly selectedAssetId: string | null;
  readonly instruction: string;
  readonly prompt: string;
  readonly tool: ProductImageStudioAiTool;
};

export function ProductImageStudioAiToolGeneratorControls({
  assets,
  choiceSelections,
  count,
  modelLabel,
  onAssetRemove,
  onAssetSelect,
  onAssetUpload,
  onChoiceSelect,
  onCountChange,
  onGenerate,
  onInstructionChange,
  onModelLabelChange,
  onPromptChange,
  onQualityOpen,
  onRatioOpen,
  phase,
  quality,
  ratio,
  selectedAssetId,
  instruction,
  prompt,
  tool,
}: ProductImageStudioAiToolGeneratorControlsProps) {
  return (
    <>
      <div className={styles.controlBody}>
        <ProductImageStudioAiToolUploadSlots
          assets={assets}
          onAssetRemove={onAssetRemove}
          onAssetSelect={onAssetSelect}
          onAssetUpload={onAssetUpload}
          selectedAssetId={selectedAssetId}
          slots={tool.uploadSlots}
          uploadHint={tool.uploadHint}
          uploadTitle={tool.uploadTitle}
        />
        <ToolChoiceGroups groups={tool.choiceGroups} onChoiceSelect={onChoiceSelect} selections={choiceSelections} />
        <section className={styles.section}>
          <label className={styles.field}>
            <span>프롬프트</span>
            <textarea
              aria-invalid={prompt.trim().length === 0 ? "true" : undefined}
              name={`${tool.id}-prompt`}
              onChange={(event) => onPromptChange(event.currentTarget.value)}
              value={prompt}
            />
          </label>
          <label className={styles.field}>
            <span>추가 지시</span>
            <textarea
              data-compact="true"
              name={`${tool.id}-instruction`}
              onChange={(event) => onInstructionChange(event.currentTarget.value)}
              value={instruction}
            />
          </label>
        </section>
        <section className={styles.section}>
          <div className={styles.inlineGrid}>
            <label className={styles.field}>
              <span>모델</span>
              <select
                className={styles.selectLike}
                onChange={(event) => onModelLabelChange(readProductImageStudioAiToolModelLabel(event.currentTarget.value, modelLabel))}
                value={modelLabel}
              >
                {PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_LABELS.map((option) => (
                  <option key={option} value={option}>
                    {readProductImageStudioAiToolModelDisplayLabel(option)}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.outputPanel}>
              <p className={styles.sectionTitle}>사이즈</p>
              <button className={styles.selectLike} data-ai-tool-size-trigger="true" onClick={onRatioOpen} type="button">
                <span>{readProductImageStudioAiToolRatioLabel(ratio)}</span>
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
                {PRODUCT_IMAGE_STUDIO_AI_TOOL_COUNT_OPTIONS.map((option) => (
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
        <button className={styles.primaryButton} disabled={phase === "generating"} onClick={onGenerate} type="button">
          {phase === "generating" ? "생성 중" : "생성하기"}
        </button>
      </footer>
    </>
  );
}

function ToolChoiceGroups({
  groups,
  onChoiceSelect,
  selections,
}: {
  readonly groups: readonly ProductImageStudioAiToolChoiceGroup[];
  readonly onChoiceSelect: (groupId: string, optionId: string) => void;
  readonly selections: ProductImageStudioAiToolChoiceSelections;
}) {
  if (groups.length === 0) return null;

  return (
    <section className={styles.section} aria-label="도구 옵션">
      <p className={styles.sectionTitle}>작업 옵션</p>
      <div className={styles.choiceGroupStack}>
        {groups.map((group) => (
          <div className={styles.choiceGroup} data-ai-tool-choice-group={group.id} key={group.id}>
            <span>{group.title}</span>
            <div className={styles.choiceGrid}>
              {group.options.map((option) => (
                <button
                  data-active={selections[group.id] === option.id ? "true" : "false"}
                  data-ai-tool-choice-option={option.id}
                  key={option.id}
                  onClick={() => onChoiceSelect(group.id, option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
