import { NextResponse } from "next/server";
import { PRODUCT_IMAGE_STUDIO_PRODUCT_TYPES } from "@/features/product-image-studio/domain/types";
import { listProductImageStudioConceptRecommendations } from "@/features/product-image-studio/domain/concepts";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const productType = url.searchParams.get("productType") ?? "card_envelope_seal_set";
  if (!PRODUCT_IMAGE_STUDIO_PRODUCT_TYPES.some((candidate) => candidate === productType)) {
    return NextResponse.json(
      { error: { code: "INVALID_PRODUCT_TYPE", message: "지원하지 않는 상품 유형입니다." }, ok: false },
      { status: 400 },
    );
  }

  return NextResponse.json({
    data: {
      concepts: listProductImageStudioConceptRecommendations("card_envelope_seal_set"),
    },
    ok: true,
  });
}
