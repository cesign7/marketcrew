import type { ProductImageStudioResultRecord } from "@/lib/persistence/productImageStudioRepository";

export type ProductImageStudioResultPreviewResponse = ProductImageStudioResultRecord & {
  readonly previewUrl: string;
};

export function toProductImageStudioResultPreviewResponse(
  projectId: string,
  result: ProductImageStudioResultRecord,
): ProductImageStudioResultPreviewResponse {
  return {
    ...result,
    previewUrl: `/api/product-image-studio/projects/${encodeURIComponent(projectId)}/results/${encodeURIComponent(result.id)}/preview`,
  };
}
