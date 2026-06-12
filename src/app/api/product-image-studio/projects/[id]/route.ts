import { NextResponse } from "next/server";
import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";
import { getProductImageStudioProject } from "@/features/product-image-studio/server/projectApi";

type ProductImageStudioProjectRouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: ProductImageStudioProjectRouteContext) {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

  const { id } = await context.params;
  const project = await getProductImageStudioProject(normalizeRouteParam(id));
  if (!project) {
    return NextResponse.json({ ok: false, error: { code: "PROJECT_NOT_FOUND", message: "프로젝트를 찾지 못했습니다." } }, { status: 404 });
  }

  return NextResponse.json({ ok: true, project });
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
