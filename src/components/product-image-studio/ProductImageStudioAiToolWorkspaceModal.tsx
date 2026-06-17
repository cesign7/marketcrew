"use client";

import { useEffect, useState } from "react";
import type { ProductImageStudioImageGeneratorModelLabel } from "@/features/product-image-studio/domain/imageGenerator";
import { CompactWorkModal } from "./ProductImageStudioSaasPrimitives";
import type { ProductImageStudioAiTool } from "./ProductImageStudioAiToolCatalog";
import {
  ProductImageStudioAiToolGeneratorControls,
  type ProductImageStudioAiToolChoiceSelections,
} from "./ProductImageStudioAiToolGeneratorControls";
import { ProductImageStudioAiToolOptionSheet } from "./ProductImageStudioAiToolOptionSheet";
import { ProductImageStudioAiToolPreviewPanel, type ProductImageStudioAiToolPreviewPhase } from "./ProductImageStudioAiToolPreviewPanel";
import { useProductImageStudioAiToolUploads } from "./ProductImageStudioAiToolUploads";
import {
  ProductImageStudioSvgConversionModal,
  type ProductImageStudioSvgConversionState,
} from "./ProductImageStudioSvgConversionModal";
import {
  PRODUCT_IMAGE_STUDIO_AI_TOOL_QUALITY_OPTIONS,
  PRODUCT_IMAGE_STUDIO_AI_TOOL_RATIO_OPTIONS,
  readProductImageStudioAiToolRatioLabel,
  type ProductImageStudioAiToolOutputCount,
  type ProductImageStudioAiToolOutputQuality,
  type ProductImageStudioAiToolOutputRatio,
} from "./ProductImageStudioAiToolWorkspaceOptions";
import styles from "./ProductImageStudioAiToolWorkspace.module.css";

type SheetKind = "quality" | "ratio" | null;

type ProductImageStudioAiToolWorkspaceModalProps = {
  readonly onClose: () => void;
  readonly svgConversionInitialState?: ProductImageStudioSvgConversionState;
  readonly svgConversionInitialTitle?: string;
  readonly tool: ProductImageStudioAiTool;
};

export function ProductImageStudioAiToolWorkspaceModal({
  onClose,
  svgConversionInitialState,
  svgConversionInitialTitle,
  tool,
}: ProductImageStudioAiToolWorkspaceModalProps) {
  const [modelLabel, setModelLabel] = useState<ProductImageStudioImageGeneratorModelLabel>("gpt2");
  const [ratio, setRatio] = useState<ProductImageStudioAiToolOutputRatio>("1:1");
  const [quality, setQuality] = useState<ProductImageStudioAiToolOutputQuality>("1k");
  const [count, setCount] = useState<ProductImageStudioAiToolOutputCount>(1);
  const [phase, setPhase] = useState<ProductImageStudioAiToolPreviewPhase>("idle");
  const [activeSheet, setActiveSheet] = useState<SheetKind>(null);
  const [choiceSelections, setChoiceSelections] = useState<ProductImageStudioAiToolChoiceSelections>(() =>
    buildInitialChoiceSelections(tool),
  );
  const [svgState, setSvgState] = useState<ProductImageStudioSvgConversionState>(svgConversionInitialState ?? { kind: "idle" });
  const uploads = useProductImageStudioAiToolUploads();

  useEffect(() => {
    if (phase !== "generating") return undefined;
    const timeoutId = window.setTimeout(() => setPhase("ready"), 650);
    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  useEffect(() => {
    setChoiceSelections(buildInitialChoiceSelections(tool));
  }, [tool]);

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
              <ProductImageStudioAiToolGeneratorControls
                assets={uploads.assets}
                choiceSelections={choiceSelections}
                count={count}
                modelLabel={modelLabel}
                onAssetRemove={uploads.removeAsset}
                onAssetSelect={uploads.selectAsset}
                onAssetUpload={(slot, event) => {
                  uploads.uploadSlot(slot, event);
                  setPhase("idle");
                }}
                onChoiceSelect={(groupId, optionId) => {
                  setChoiceSelections((current) => ({ ...current, [groupId]: optionId }));
                }}
                onCountChange={setCount}
                onGenerate={() => setPhase("generating")}
                onModelLabelChange={setModelLabel}
                onQualityOpen={() => setActiveSheet("quality")}
                onRatioOpen={() => setActiveSheet("ratio")}
                quality={quality}
                ratio={ratio}
                selectedAssetId={uploads.selectedAssetId}
                tool={tool}
              />
            )}
          </div>
          <ProductImageStudioAiToolPreviewPanel
            countLabel={`${count}컷`}
            featuredAsset={uploads.selectedAsset}
            phase={phase}
            quality={quality}
            ratioLabel={readProductImageStudioAiToolRatioLabel(ratio)}
            ratioValue={ratio}
            svgState={svgState}
            tool={tool}
            uploadedCount={uploads.assets.length}
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
        options={PRODUCT_IMAGE_STUDIO_AI_TOOL_RATIO_OPTIONS}
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
        options={PRODUCT_IMAGE_STUDIO_AI_TOOL_QUALITY_OPTIONS}
        selected={quality}
        title="출력 화질 선택"
      />
    </>
  );
}

function buildInitialChoiceSelections(tool: ProductImageStudioAiTool): ProductImageStudioAiToolChoiceSelections {
  const selections: Record<string, string> = {};
  for (const group of tool.choiceGroups) {
    selections[group.id] = group.options[0].id;
  }
  return selections;
}
