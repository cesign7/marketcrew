import type {
  ProductImageStudioImageGeneratorGenerationInput,
  ProductImageStudioImageGeneratorResultPreview,
} from "@/features/product-image-studio/client/imageGeneratorApi";
import type {
  ProductImageStudioImageGeneratorCount,
  ProductImageStudioImageGeneratorRatio,
  ProductImageStudioImageGeneratorResolution,
} from "@/features/product-image-studio/domain/imageGenerator";
import type {
  ProductImageStudioAiToolOutputCount,
  ProductImageStudioAiToolOutputQuality,
  ProductImageStudioAiToolOutputRatio,
} from "./ProductImageStudioAiToolWorkspaceOptions";

export type ProductImageStudioAiToolGenerationRunToken = {
  readonly id: number;
};

export type ProductImageStudioAiToolGenerationRunGuard = {
  readonly invalidate: () => void;
  readonly isCurrent: (run: ProductImageStudioAiToolGenerationRunToken) => boolean;
  readonly start: () => ProductImageStudioAiToolGenerationRunToken;
};

export type ProductImageStudioAiToolGenerationInputReadResult =
  | {
      readonly ok: false;
      readonly message: string;
    }
  | {
      readonly ok: true;
      readonly value: ProductImageStudioImageGeneratorGenerationInput;
    };

export function createProductImageStudioAiToolGenerationRunGuard(): ProductImageStudioAiToolGenerationRunGuard {
  let currentRunId = 0;
  return {
    invalidate: () => {
      currentRunId += 1;
    },
    isCurrent: (run) => run.id === currentRunId,
    start: () => {
      currentRunId += 1;
      return { id: currentRunId };
    },
  };
}

export function readProductImageStudioAiToolGenerationInput(input: {
  readonly count: ProductImageStudioAiToolOutputCount;
  readonly instruction: string;
  readonly modelLabel: ProductImageStudioImageGeneratorGenerationInput["modelLabel"];
  readonly prompt: string;
  readonly quality: ProductImageStudioAiToolOutputQuality;
  readonly ratio: ProductImageStudioAiToolOutputRatio;
  readonly referenceImages: readonly File[];
}): ProductImageStudioAiToolGenerationInputReadResult {
  const prompt = input.prompt.trim();
  if (prompt.length === 0) {
    return { message: "프롬프트를 입력하면 생성할 수 있습니다.", ok: false };
  }

  const count = readGeneratorCount(input.count);
  const ratio = readGeneratorRatio(input.ratio);
  const resolution = readGeneratorResolution(input.quality);
  if (count === null) return { message: "이미지 개수는 1개부터 4개까지 선택해 주세요.", ok: false };
  if (ratio === null) return { message: "이 비율은 현재 생성기에서 아직 지원하지 않습니다.", ok: false };
  if (resolution === null) return { message: "이 화질은 현재 생성기에서 아직 지원하지 않습니다.", ok: false };

  return {
    ok: true,
    value: {
      count,
      modelLabel: input.modelLabel,
      prompt: buildGeneratorPrompt(prompt, input.instruction),
      ratio,
      referenceImages: input.referenceImages,
      resolution,
    },
  };
}

export function hasProductImageStudioAiToolRenderableGeneratedResult(
  result: ProductImageStudioImageGeneratorResultPreview,
): boolean {
  return Boolean(result.previewUrl || result.downloadUrl || result.vectorSvgUrl);
}

function buildGeneratorPrompt(prompt: string, instruction: string): string {
  const trimmedInstruction = instruction.trim();
  if (trimmedInstruction.length === 0) return prompt;
  return `${prompt}\n\n추가 지시: ${trimmedInstruction}`;
}

function readGeneratorCount(count: ProductImageStudioAiToolOutputCount): ProductImageStudioImageGeneratorCount | null {
  switch (count) {
    case 1:
    case 2:
    case 4:
      return count;
    case 8:
      return null;
  }
}

function readGeneratorRatio(ratio: ProductImageStudioAiToolOutputRatio): ProductImageStudioImageGeneratorRatio | null {
  switch (ratio) {
    case "1:1":
    case "16:9":
    case "3:4":
      return ratio;
    case "2:3":
    case "3:2":
    case "4:3":
    case "9:16":
    case "original":
      return null;
  }
}

function readGeneratorResolution(quality: ProductImageStudioAiToolOutputQuality): ProductImageStudioImageGeneratorResolution | null {
  switch (quality) {
    case "1k":
    case "2k":
      return quality;
    case "4k":
      return null;
  }
}
