"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_CONTRACTS,
  type ProductImageStudioImageGeneratorCount,
  type ProductImageStudioImageGeneratorModelLabel,
  type ProductImageStudioImageGeneratorRatio,
  type ProductImageStudioImageGeneratorResolution,
} from "@/features/product-image-studio/domain/imageGenerator";
import {
  selectProductImageStudioGenerationProvider,
  type ProductImageStudioGenerationState,
} from "@/features/product-image-studio/domain/generationWorkflow";
import {
  setProductImageStudioGenerationResolution,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import { ProductImageStudioGenerationOptionControls } from "./ProductImageStudioGenerationOptionControls";

type ProductImageStudioWizardGenerationOptionsProps = {
  readonly setGenerationState: Dispatch<SetStateAction<ProductImageStudioGenerationState>>;
  readonly setWizardState: Dispatch<SetStateAction<ProductImageStudioWizardState>>;
  readonly state: ProductImageStudioWizardState;
};

export function ProductImageStudioWizardGenerationOptions({
  setGenerationState,
  setWizardState,
  state,
}: ProductImageStudioWizardGenerationOptionsProps) {
  return (
    <ProductImageStudioGenerationOptionControls
      count={state.generationCount}
      description="모델, 개수, 비율, 해상도만 고릅니다."
      modelLabel={state.generationModelLabel}
      namePrefix="staging"
      onCountChange={handleSelectGenerationCount}
      onModelLabelChange={handleSelectGenerationModel}
      onRatioChange={handleSelectGenerationRatio}
      onResolutionChange={handleSelectGenerationResolution}
      ratio={state.generationRatio}
      resolution={state.generationResolution}
      title="생성 옵션"
    />
  );

  function handleSelectGenerationModel(modelLabel: ProductImageStudioImageGeneratorModelLabel): void {
    const provider = PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_CONTRACTS[modelLabel].provider;
    setWizardState((current) => ({ ...current, generationModelLabel: modelLabel }));
    setGenerationState((current) => selectProductImageStudioGenerationProvider(current, provider));
  }

  function handleSelectGenerationCount(generationCount: ProductImageStudioImageGeneratorCount): void {
    setWizardState((current) => ({ ...current, generationCount }));
  }

  function handleSelectGenerationRatio(generationRatio: ProductImageStudioImageGeneratorRatio): void {
    setWizardState((current) => ({ ...current, generationRatio, ratios: [generationRatio] }));
  }

  function handleSelectGenerationResolution(generationResolution: ProductImageStudioImageGeneratorResolution): void {
    setWizardState((current) => setProductImageStudioGenerationResolution(current, generationResolution));
  }
}
