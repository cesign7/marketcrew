import { toProductImageStudioDownloadItems } from "@/features/product-image-studio/server/downloads";
import { getDefaultProductImageStudioFileStore } from "@/features/product-image-studio/server/assetUploadApi";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";
import type { StoredProductImageFile } from "@/features/product-image-studio/server/fileStore";

export type ProductImageStudioResultImage =
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

export async function readProductImageStudioResultImage(
  projectId: string,
  resultId: string,
): Promise<ProductImageStudioResultImage> {
  const repository = getProductImageStudioProjectRepository();
  const project = await repository.getProject(projectId);
  if (!project) {
    return { error: { code: "PROJECT_NOT_FOUND", message: "프로젝트를 찾지 못했습니다." }, ok: false, status: 404 };
  }

  const result = (await repository.listResults(project.id)).find((candidate) => candidate.id === resultId);
  if (!result) {
    return { error: { code: "RESULT_NOT_FOUND", message: "다운로드할 이미지를 찾지 못했습니다." }, ok: false, status: 404 };
  }

  const item = toProductImageStudioDownloadItems(project, [result])[0];
  if (!item) {
    return { error: { code: "RESULT_NOT_FOUND", message: "다운로드할 이미지를 찾지 못했습니다." }, ok: false, status: 404 };
  }

  const image = await getDefaultProductImageStudioFileStore().readImage(item.storageKey);
  if (!image) {
    return { error: { code: "RESULT_FILE_NOT_FOUND", message: "생성 이미지 파일을 찾지 못했습니다." }, ok: false, status: 404 };
  }

  return { fileName: item.fileName, image, ok: true };
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
