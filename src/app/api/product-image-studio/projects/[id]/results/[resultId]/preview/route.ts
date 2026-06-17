import { NextResponse } from "next/server";
import { createProductImageStudioAssetPreviewHeaders } from "@/features/product-image-studio/server/assetImageResponse";
import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";
import {
  readProductImageStudioResultImage,
  toArrayBuffer,
} from "@/features/product-image-studio/server/resultImageResponse";

type ProductImageStudioResultPreviewRouteContext = {
  readonly params: Promise<{ readonly id: string; readonly resultId: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: ProductImageStudioResultPreviewRouteContext) {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

  const { id, resultId } = await context.params;
  const resultImage = await readProductImageStudioResultImage(normalizeRouteParam(id), normalizeRouteParam(resultId));
  if (!resultImage.ok) {
    return NextResponse.json({ error: resultImage.error, ok: false }, { status: resultImage.status });
  }

  return new Response(toArrayBuffer(resultImage.image.bytes), {
    headers: createProductImageStudioAssetPreviewHeaders({
      contentType: resultImage.image.contentType,
      fileName: resultImage.fileName,
    }),
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
