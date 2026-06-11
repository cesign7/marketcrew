import { NextResponse } from "next/server";
import { getProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";

export const dynamic = "force-dynamic";

export async function GET(_request: Request) {
  return NextResponse.json({
    ok: true,
    data: getProductImageStudioProviderStatus(),
  });
}
