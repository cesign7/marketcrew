import { getDefaultProductImageStudioFileStore } from "@/features/product-image-studio/server/assetUploadApi";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";
import type { StoredProductImageFile } from "@/features/product-image-studio/server/fileStore";

export type ProductImageStudioAssetImage =
  | {
      readonly fileName: string;
      readonly image: StoredProductImageFile;
      readonly ok: true;
    }
  | {
      readonly error: { readonly code: string; readonly message: string };
      readonly ok: false;
      readonly status: number;
    };

export async function readProductImageStudioAssetImage(
  projectId: string,
  assetId: string,
): Promise<ProductImageStudioAssetImage> {
  const repository = getProductImageStudioProjectRepository();
  const project = await repository.getProject(projectId);
  if (!project) {
    return { error: { code: "PROJECT_NOT_FOUND", message: "프로젝트를 찾지 못했습니다." }, ok: false, status: 404 };
  }

  const asset = (await repository.listAssets(project.id)).find((candidate) => candidate.id === assetId);
  if (!asset) {
    return { error: { code: "ASSET_NOT_FOUND", message: "업로드 이미지를 찾지 못했습니다." }, ok: false, status: 404 };
  }

  const image = await getDefaultProductImageStudioFileStore().readImage(asset.storageKey);
  if (!image) {
    return { error: { code: "ASSET_FILE_NOT_FOUND", message: "업로드 이미지 파일을 찾지 못했습니다." }, ok: false, status: 404 };
  }

  return { fileName: asset.originalFileName, image, ok: true };
}
