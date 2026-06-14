import type { ProductImageStudioAssetRole } from "@/features/product-image-studio/domain/types";
import {
  getProductImageStudioProjectRepository,
} from "@/features/product-image-studio/server/projectApi";
import type {
  ProductImageStudioRepository,
} from "@/lib/persistence/productImageStudioRepository";

export type ProductImageStudioUploadArchiveItem = {
  readonly assetId: string;
  readonly byteSize: number;
  readonly contentType: string;
  readonly createdAt: string;
  readonly designUseUrl: string;
  readonly originalFileName: string;
  readonly previewUrl: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly role: ProductImageStudioAssetRole;
  readonly storageKey: string;
  readonly templateUseUrl: string;
};

export async function listProductImageStudioUploadArchiveItems(
  repository: ProductImageStudioRepository = getProductImageStudioProjectRepository(),
): Promise<readonly ProductImageStudioUploadArchiveItem[]> {
  const projects = await repository.listProjectSummaries();
  const groups = await Promise.all(
    projects.map(async (project) => {
      const assets = await repository.listAssets(project.id);
      return assets.map((asset) => ({
        assetId: asset.id,
        byteSize: asset.byteSize,
        contentType: asset.contentType,
        createdAt: asset.createdAt,
        designUseUrl: toDesignUseUrl(asset.id),
        originalFileName: asset.originalFileName,
        previewUrl: toAssetPreviewUrl(project.id, asset.id),
        projectId: project.id,
        projectName: project.name,
        role: asset.role,
        storageKey: asset.storageKey,
        templateUseUrl: toTemplateUseUrl(asset.id),
      }));
    }),
  );

  return groups.flat().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function toAssetPreviewUrl(projectId: string, assetId: string): string {
  return `/api/product-image-studio/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/preview`;
}

function toDesignUseUrl(assetId: string): string {
  return `/product-image-studio/designs?upload=${encodeURIComponent(assetId)}`;
}

function toTemplateUseUrl(assetId: string): string {
  return `/product-image-studio/templates?upload=${encodeURIComponent(assetId)}`;
}
