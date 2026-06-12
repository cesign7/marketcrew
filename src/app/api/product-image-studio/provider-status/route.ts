import { NextResponse } from "next/server";
import { getConfiguredProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";

export const dynamic = "force-dynamic";

export async function GET(_request: Request) {
  return NextResponse.json({
    ok: true,
    data: await getConfiguredProductImageStudioProviderStatus(),
  });
}
