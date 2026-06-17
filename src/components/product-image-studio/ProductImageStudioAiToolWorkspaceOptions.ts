import {
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_CONTRACTS,
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_LABELS,
  type ProductImageStudioImageGeneratorModelLabel,
} from "@/features/product-image-studio/domain/imageGenerator";
import type { ProductImageStudioAiToolOption } from "./ProductImageStudioAiToolOptionSheet";

export type ProductImageStudioAiToolOutputRatio = "1:1" | "16:9" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "original";
export type ProductImageStudioAiToolOutputQuality = "1k" | "2k" | "4k";
export type ProductImageStudioAiToolOutputCount = 1 | 2 | 4 | 8;

export const PRODUCT_IMAGE_STUDIO_AI_TOOL_RATIO_OPTIONS = [
  { description: "업로드 비율 유지", label: "원본", value: "original" },
  { description: "릴스, 숏폼", label: "세로 9:16", value: "9:16" },
  { description: "상세페이지", label: "세로 3:4", value: "3:4" },
  { description: "포스터형", label: "세로 2:3", value: "2:3" },
  { description: "스마트스토어 대표", label: "정사각형 1:1", value: "1:1" },
  { description: "상품 목록", label: "가로 3:2", value: "3:2" },
  { description: "상세 설명", label: "가로 4:3", value: "4:3" },
  { description: "블로그, 배너", label: "가로 16:9", value: "16:9" },
] as const satisfies readonly ProductImageStudioAiToolOption<ProductImageStudioAiToolOutputRatio>[];

export const PRODUCT_IMAGE_STUDIO_AI_TOOL_QUALITY_OPTIONS = [
  { description: "시안 확인과 여러 안 비교에 적합합니다.", label: "1k", value: "1k" },
  { description: "상품 목록과 상세페이지용 기본 고화질입니다.", label: "2k", value: "2k" },
  { description: "확대 컷, 큰 상세 이미지, 보관용 결과에 사용합니다.", label: "4k", value: "4k" },
] as const satisfies readonly ProductImageStudioAiToolOption<ProductImageStudioAiToolOutputQuality>[];

export const PRODUCT_IMAGE_STUDIO_AI_TOOL_COUNT_OPTIONS = [1, 2, 4, 8] as const satisfies readonly ProductImageStudioAiToolOutputCount[];

export function readProductImageStudioAiToolModelLabel(
  value: string,
  fallback: ProductImageStudioImageGeneratorModelLabel,
): ProductImageStudioImageGeneratorModelLabel {
  return PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_LABELS.find((option) => option === value) ?? fallback;
}

export function readProductImageStudioAiToolRatioLabel(value: ProductImageStudioAiToolOutputRatio): string {
  return PRODUCT_IMAGE_STUDIO_AI_TOOL_RATIO_OPTIONS.find((option) => option.value === value)?.label ?? "정사각형 1:1";
}

export function readProductImageStudioAiToolModelDisplayLabel(modelLabel: ProductImageStudioImageGeneratorModelLabel): string {
  return PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_CONTRACTS[modelLabel].displayLabel;
}
