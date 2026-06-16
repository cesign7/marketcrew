import { toProductImageStudioDownloadItems } from "@/features/product-image-studio/server/downloads";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";
import {
  createProductImageStudioVectorSvg,
  type ProductImageStudioVectorSvgResult,
  type ProductImageStudioVectorSvgStyle,
} from "@/features/product-image-studio/server/vectorSvg";
import type { ProductImageStudioResultArchiveItem } from "@/lib/persistence/productImageStudioArchiveReadModels";

export type ProductImageStudioResultVectorSvg =
  | {
      readonly svg: Extract<ProductImageStudioVectorSvgResult, { readonly ok: true }>;
      readonly ok: true;
    }
  | {
      readonly error: { readonly code: string; readonly message: string };
      readonly ok: false;
      readonly status: number;
    };

export async function readProductImageStudioResultVectorSvg(
  projectId: string,
  resultId: string,
  style: ProductImageStudioVectorSvgStyle,
): Promise<ProductImageStudioResultVectorSvg> {
  const repository = getProductImageStudioProjectRepository();
  const project = await repository.getProject(projectId);
  if (!project) {
    return { error: { code: "PROJECT_NOT_FOUND", message: "프로젝트를 찾지 못했습니다." }, ok: false, status: 404 };
  }

  const result = (await repository.listResults(project.id)).find((candidate) => candidate.id === resultId);
  if (!result) {
    return { error: { code: "RESULT_NOT_FOUND", message: "SVG로 저장할 결과 이미지를 찾지 못했습니다." }, ok: false, status: 404 };
  }

  const item = toProductImageStudioDownloadItems(project, [result])[0];
  if (!item) {
    return { error: { code: "RESULT_NOT_FOUND", message: "SVG로 저장할 결과 이미지를 찾지 못했습니다." }, ok: false, status: 404 };
  }

  const archiveItem = await readArchiveItem(project.id, result.id);
  const svg = createProductImageStudioVectorSvg({
    fileName: item.fileName,
    outputType: item.outputType,
    ratio: item.ratio,
    style,
    title: archiveItem?.promptPreview ?? project.name,
  });
  if (svg.ok === false) {
    return { error: svg.error, ok: false, status: 422 };
  }

  return { ok: true, svg };
}

async function readArchiveItem(
  projectId: string,
  resultId: string,
): Promise<ProductImageStudioResultArchiveItem | null> {
  const repository = getProductImageStudioProjectRepository();
  const items = await repository.listResultArchiveItems(projectId);
  return items.find((item) => item.resultId === resultId) ?? null;
}
