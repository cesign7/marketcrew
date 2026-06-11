import { NextResponse } from "next/server";
import { uploadProductImageStudioAssetFromFormData } from "@/features/product-image-studio/server/assetUploadApi";

type ProductImageStudioAssetRouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: ProductImageStudioAssetRouteContext) {
  const { id } = await context.params;
  const formData = await readFormData(request);
  if (!formData) {
    return NextResponse.json(
      { error: { code: "MALFORMED_MULTIPART", message: "업로드 요청 형식이 올바르지 않습니다." }, ok: false },
      { status: 400 },
    );
  }

  const result = await uploadProductImageStudioAssetFromFormData({
    formData,
    projectId: normalizeRouteParam(id),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message }, ok: false },
      { status: result.error.status },
    );
  }

  return NextResponse.json({ asset: result.asset, ok: true }, { status: 201 });
}

async function readFormData(request: Request): Promise<FormData | null> {
  try {
    return await request.formData();
  } catch {
    return null;
  }
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
