import { NextResponse } from "next/server";
import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";
import { readProductImageStudioAssetImage } from "@/features/product-image-studio/server/assetImageResponse";
import { toArrayBuffer } from "@/features/product-image-studio/server/resultImageResponse";

type ProductImageStudioAssetPreviewRouteContext = {
  readonly params: Promise<{ readonly assetId: string; readonly id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: ProductImageStudioAssetPreviewRouteContext) {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

  const { assetId, id } = await context.params;
  const assetImage = await readProductImageStudioAssetImage(normalizeRouteParam(id), normalizeRouteParam(assetId));
  if (!assetImage.ok) {
    return NextResponse.json({ error: assetImage.error, ok: false }, { status: assetImage.status });
  }

  return new Response(toArrayBuffer(assetImage.image.bytes), {
    headers: {
      "content-disposition": `inline; filename="${assetImage.fileName}"`,
      "content-type": assetImage.image.contentType,
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
