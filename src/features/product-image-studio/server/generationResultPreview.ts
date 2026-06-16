import type { ProductImageStudioResultRecord } from "@/lib/persistence/productImageStudioRepository";

export type ProductImageStudioResultPreviewResponse = ProductImageStudioResultRecord & {
  readonly previewUrl: string;
  readonly vectorSvgUrl: string;
};

export function toProductImageStudioResultPreviewResponse(
  projectId: string,
  result: ProductImageStudioResultRecord,
): ProductImageStudioResultPreviewResponse {
  return {
    ...result,
    previewUrl: `/api/product-image-studio/projects/${encodeURIComponent(projectId)}/results/${encodeURIComponent(result.id)}/preview`,
    vectorSvgUrl: `/api/product-image-studio/projects/${encodeURIComponent(projectId)}/results/${encodeURIComponent(result.id)}/vector.svg?style=flat_illustration`,
  };
}
