import { NextResponse } from "next/server";
import { getConfiguredProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import { proxyRequestToBackend } from "@/lib/backend/proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  return NextResponse.json({
    ok: true,
    data: await getConfiguredProductImageStudioProviderStatus(),
  });
}
