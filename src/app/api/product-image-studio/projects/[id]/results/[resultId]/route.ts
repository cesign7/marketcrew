import { NextResponse } from "next/server";
import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";
import {
  getProductImageStudioProject,
  getProductImageStudioProjectRepository,
} from "@/features/product-image-studio/server/projectApi";

type ProductImageStudioResultRouteContext = {
  readonly params: Promise<{ readonly id: string; readonly resultId: string }>;
};

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: ProductImageStudioResultRouteContext) {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

  const { id, resultId } = await context.params;
  const projectId = normalizeRouteParam(id);
  const selectedResultId = normalizeRouteParam(resultId);
  const project = await getProductImageStudioProject(projectId);
  if (!project) {
    return NextResponse.json({ error: { code: "PROJECT_NOT_FOUND", message: "디자인을 찾지 못했습니다." }, ok: false }, { status: 404 });
  }

  const deleted = await getProductImageStudioProjectRepository().deleteResult(project.id, selectedResultId);
  if (!deleted) {
    return NextResponse.json({ error: { code: "RESULT_NOT_FOUND", message: "삭제할 결과를 찾지 못했습니다." }, ok: false }, { status: 404 });
  }

  return NextResponse.json({ deletedResultId: deleted.id, ok: true });
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
