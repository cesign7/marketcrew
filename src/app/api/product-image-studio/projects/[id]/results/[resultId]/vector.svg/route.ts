import { NextResponse } from "next/server";
import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";
import { toArrayBuffer } from "@/features/product-image-studio/server/resultImageResponse";
import { readProductImageStudioResultVectorSvg } from "@/features/product-image-studio/server/resultVectorSvgResponse";
import { parseProductImageStudioVectorSvgStyle } from "@/features/product-image-studio/server/vectorSvg";

type ProductImageStudioResultVectorSvgRouteContext = {
  readonly params: Promise<{ readonly id: string; readonly resultId: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: ProductImageStudioResultVectorSvgRouteContext) {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

  const { id, resultId } = await context.params;
  const style = parseProductImageStudioVectorSvgStyle(new URL(request.url).searchParams.get("style"));
  const resultSvg = await readProductImageStudioResultVectorSvg(normalizeRouteParam(id), normalizeRouteParam(resultId), style);
  if (!resultSvg.ok) {
    return NextResponse.json({ error: resultSvg.error, ok: false }, { status: resultSvg.status });
  }

  return new Response(toArrayBuffer(resultSvg.svg.bytes), {
    headers: {
      "content-disposition": `attachment; filename="${resultSvg.svg.fileName}"`,
      "content-type": `${resultSvg.svg.contentType}; charset=utf-8`,
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
