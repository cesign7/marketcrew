import { NextResponse } from "next/server";
import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";
import {
  getProductImageStudioProject,
  getProductImageStudioProjectRepository,
} from "@/features/product-image-studio/server/projectApi";

type ProductImageStudioAssetRouteContext = {
  readonly params: Promise<{ readonly assetId: string; readonly id: string }>;
};

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: ProductImageStudioAssetRouteContext) {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

  const { assetId, id } = await context.params;
  const projectId = normalizeRouteParam(id);
  const selectedAssetId = normalizeRouteParam(assetId);
  const project = await getProductImageStudioProject(projectId);
  if (!project) {
    return NextResponse.json({ error: { code: "PROJECT_NOT_FOUND", message: "디자인을 찾지 못했습니다." }, ok: false }, { status: 404 });
  }

  const deleted = await getProductImageStudioProjectRepository().deleteAsset(project.id, selectedAssetId);
  if (!deleted) {
    return NextResponse.json({ error: { code: "ASSET_NOT_FOUND", message: "삭제할 업로드를 찾지 못했습니다." }, ok: false }, { status: 404 });
  }

  return NextResponse.json({ deletedAssetId: deleted.id, ok: true });
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
