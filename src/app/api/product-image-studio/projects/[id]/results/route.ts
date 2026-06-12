import { NextResponse } from "next/server";
import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";
import {
  getProductImageStudioProject,
  getProductImageStudioProjectRepository,
} from "@/features/product-image-studio/server/projectApi";

type ProductImageStudioProjectResultsRouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: ProductImageStudioProjectResultsRouteContext) {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

  const { id } = await context.params;
  const projectId = normalizeRouteParam(id);
  const project = await getProductImageStudioProject(projectId);
  if (!project) {
    return NextResponse.json({ error: { code: "PROJECT_NOT_FOUND", message: "프로젝트를 찾지 못했습니다." }, ok: false }, { status: 404 });
  }

  const results = await getProductImageStudioProjectRepository().listResultArchiveItems(project.id);
  return NextResponse.json({ ok: true, project, results });
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
