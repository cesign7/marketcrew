import {
  buildProductImageStudioImageGeneratorPromptHarness,
  type ProductImageStudioImageGeneratorPayload,
} from "@/features/product-image-studio/domain/imageGenerator";

export function buildProductImageStudioImageGeneratorProviderPrompt(
  payload: ProductImageStudioImageGeneratorPayload,
  referenceImageCount: number,
): string {
  const harness = buildProductImageStudioImageGeneratorPromptHarness(payload, referenceImageCount);
  return [
    "Create a polished product image from the user prompt.",
    ...harness.systemContract,
    `modelLabel=${harness.routing.modelLabel}`,
    `ratio=${harness.userContent.ratio}`,
    `resolution=${harness.userContent.resolution}`,
    `referenceImageCount=${harness.userContent.referenceImageCount}`,
    "userPrompt:",
    harness.userContent.prompt,
  ].join("\n");
}

export function buildProductImageStudioImageGeneratorPromptSummary(
  payload: ProductImageStudioImageGeneratorPayload,
  referenceImageCount: number,
): {
  readonly modelLabel: string;
  readonly promptPreview: string;
  readonly referenceImageCount: number;
  readonly requestedCount: number;
} {
  return {
    modelLabel: payload.modelLabel,
    promptPreview: payload.prompt.slice(0, 120),
    referenceImageCount,
    requestedCount: payload.count,
  };
}
