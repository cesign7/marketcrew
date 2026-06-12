import { NextResponse } from "next/server";
import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";
import {
  readProductImageStudioResultImage,
  toArrayBuffer,
} from "@/features/product-image-studio/server/resultImageResponse";

type ProductImageStudioResultDownloadRouteContext = {
  readonly params: Promise<{ readonly id: string; readonly resultId: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: ProductImageStudioResultDownloadRouteContext) {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

  const { id, resultId } = await context.params;
  const projectId = normalizeRouteParam(id);
  const selectedResultId = normalizeRouteParam(resultId);
  const resultImage = await readProductImageStudioResultImage(projectId, selectedResultId);
  if (!resultImage.ok) {
    return NextResponse.json({ error: resultImage.error, ok: false }, { status: resultImage.status });
  }

  return new Response(toArrayBuffer(resultImage.image.bytes), {
    headers: {
      "content-disposition": `attachment; filename="${resultImage.fileName}"`,
      "content-type": resultImage.image.contentType,
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
