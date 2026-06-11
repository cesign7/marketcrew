import { NextResponse } from "next/server";
import { toProductImageStudioDownloadItems } from "@/features/product-image-studio/server/downloads";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";

type ProductImageStudioResultDownloadRouteContext = {
  readonly params: Promise<{ readonly id: string; readonly resultId: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: ProductImageStudioResultDownloadRouteContext) {
  const { id, resultId } = await context.params;
  const projectId = normalizeRouteParam(id);
  const selectedResultId = normalizeRouteParam(resultId);
  const repository = getProductImageStudioProjectRepository();
  const project = await repository.getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: { code: "PROJECT_NOT_FOUND", message: "프로젝트를 찾지 못했습니다." }, ok: false }, { status: 404 });
  }

  const result = (await repository.listResults(project.id)).find((candidate) => candidate.id === selectedResultId);
  if (!result) {
    return NextResponse.json({ error: { code: "RESULT_NOT_FOUND", message: "다운로드할 이미지를 찾지 못했습니다." }, ok: false }, { status: 404 });
  }

  const item = toProductImageStudioDownloadItems(project, [result])[0];
  if (!item) {
    return NextResponse.json({ error: { code: "RESULT_NOT_FOUND", message: "다운로드할 이미지를 찾지 못했습니다." }, ok: false }, { status: 404 });
  }

  const bytes = new TextEncoder().encode(`storageKey=${item.storageKey}\noutputType=${item.outputType}\n`);
  return new Response(bytes, {
    headers: {
      "content-disposition": `attachment; filename="${item.fileName}"`,
      "content-type": "application/octet-stream",
    },
    status: 200,
  });
}

function normalizeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    if (error instanceof URIError) {
      return value;
    }
    throw error;
  }
}
