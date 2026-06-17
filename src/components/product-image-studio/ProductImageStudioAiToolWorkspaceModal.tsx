"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  startProductImageStudioImageGeneratorGeneration,
  type ProductImageStudioImageGeneratorResultPreview,
} from "@/features/product-image-studio/client/imageGeneratorApi";
import type { ProductImageStudioImageGeneratorModelLabel } from "@/features/product-image-studio/domain/imageGenerator";
import { CompactWorkModal } from "./ProductImageStudioSaasPrimitives";
import type { ProductImageStudioAiTool } from "./ProductImageStudioAiToolCatalog";
import {
  createProductImageStudioAiToolGenerationRunGuard,
  hasProductImageStudioAiToolRenderableGeneratedResult,
  readProductImageStudioAiToolGenerationInput,
} from "./ProductImageStudioAiToolGenerationRuntime";
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

const MALFORMED_GENERATION_RESULT_MESSAGE = "결과 URL을 받지 못했습니다. 다시 생성해 주세요.";

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
  const [prompt, setPrompt] = useState(tool.initialPrompt);
  const [instruction, setInstruction] = useState(tool.initialInstruction);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [generatedResults, setGeneratedResults] = useState<readonly ProductImageStudioImageGeneratorResultPreview[]>([]);
  const [activeSheet, setActiveSheet] = useState<SheetKind>(null);
  const [choiceSelections, setChoiceSelections] = useState<ProductImageStudioAiToolChoiceSelections>(() =>
    buildInitialChoiceSelections(tool),
  );
  const [svgState, setSvgState] = useState<ProductImageStudioSvgConversionState>(svgConversionInitialState ?? { kind: "idle" });
  const generationRunGuard = useRef(createProductImageStudioAiToolGenerationRunGuard());
  const uploads = useProductImageStudioAiToolUploads();

  const resetGenerationState = useCallback((): void => {
    generationRunGuard.current.invalidate();
    setPhase("idle");
    setGenerationMessage(null);
    setGeneratedResults([]);
  }, []);

  useEffect(() => {
    setChoiceSelections(buildInitialChoiceSelections(tool));
    setPrompt(tool.initialPrompt);
    setInstruction(tool.initialInstruction);
    resetGenerationState();
  }, [resetGenerationState, tool]);

  async function handleGenerate(): Promise<void> {
    const input = readProductImageStudioAiToolGenerationInput({ count, instruction, modelLabel, prompt, quality, ratio, referenceImages: uploads.assets.map((asset) => asset.file) });
    if (input.ok === false) {
      generationRunGuard.current.invalidate();
      setGeneratedResults([]);
      setGenerationMessage(input.message);
      setPhase("blocked");
      return;
    }

    const generationRun = generationRunGuard.current.start();
    setPhase("generating");
    setGenerationMessage("이미지를 생성하는 중입니다.");
    setGeneratedResults([]);

    try {
      const result = await startProductImageStudioImageGeneratorGeneration(input.value);
      if (!generationRunGuard.current.isCurrent(generationRun)) return;
      if (result.ok === false) {
        setGeneratedResults([]);
        setGenerationMessage(result.message);
        setPhase(result.kind);
        return;
      }
      const renderableResults = result.results.filter(hasProductImageStudioAiToolRenderableGeneratedResult);
      if (renderableResults.length === 0) {
        setGeneratedResults([]);
        setGenerationMessage(MALFORMED_GENERATION_RESULT_MESSAGE);
        setPhase("failed");
        return;
      }
      setGeneratedResults(renderableResults);
      setGenerationMessage(result.message);
      setPhase(result.generation.status);
    } catch (error) {
      if (!generationRunGuard.current.isCurrent(generationRun)) return;
      if (error instanceof TypeError || error instanceof DOMException) {
        setGeneratedResults([]);
        setGenerationMessage("이미지 생성 요청을 보내지 못했습니다. 네트워크 상태를 확인해 주세요.");
        setPhase("failed");
        return;
      }
      throw error;
    }
  }

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
                onAssetRemove={(assetId) => {
                  uploads.removeAsset(assetId);
                  resetGenerationState();
                }}
                onAssetSelect={uploads.selectAsset}
                onAssetUpload={(slot, event) => {
                  uploads.uploadSlot(slot, event);
                  resetGenerationState();
                }}
                onChoiceSelect={(groupId, optionId) => {
                  setChoiceSelections((current) => ({ ...current, [groupId]: optionId }));
                  resetGenerationState();
                }}
                onCountChange={(nextCount) => {
                  setCount(nextCount);
                  resetGenerationState();
                }}
                onGenerate={handleGenerate}
                onInstructionChange={(nextInstruction) => {
                  setInstruction(nextInstruction);
                  resetGenerationState();
                }}
                onModelLabelChange={(nextModelLabel) => {
                  setModelLabel(nextModelLabel);
                  resetGenerationState();
                }}
                onPromptChange={(nextPrompt) => {
                  setPrompt(nextPrompt);
                  resetGenerationState();
                }}
                onQualityOpen={() => setActiveSheet("quality")}
                onRatioOpen={() => setActiveSheet("ratio")}
                phase={phase}
                quality={quality}
                ratio={ratio}
                selectedAssetId={uploads.selectedAssetId}
                instruction={instruction}
                prompt={prompt}
                tool={tool}
              />
            )}
          </div>
          <ProductImageStudioAiToolPreviewPanel
            countLabel={`${count}컷`}
            featuredAsset={uploads.selectedAsset}
            generatedResults={generatedResults}
            message={generationMessage}
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
          resetGenerationState();
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
          resetGenerationState();
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
