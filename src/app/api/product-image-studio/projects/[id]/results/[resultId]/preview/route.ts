import { NextResponse } from "next/server";
import {
  readProductImageStudioResultImage,
  toArrayBuffer,
} from "@/features/product-image-studio/server/resultImageResponse";

type ProductImageStudioResultPreviewRouteContext = {
  readonly params: Promise<{ readonly id: string; readonly resultId: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: ProductImageStudioResultPreviewRouteContext) {
  const { id, resultId } = await context.params;
  const resultImage = await readProductImageStudioResultImage(normalizeRouteParam(id), normalizeRouteParam(resultId));
  if (!resultImage.ok) {
    return NextResponse.json({ error: resultImage.error, ok: false }, { status: resultImage.status });
  }

  return new Response(toArrayBuffer(resultImage.image.bytes), {
    headers: {
      "content-disposition": `inline; filename="${resultImage.fileName}"`,
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
