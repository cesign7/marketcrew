import { NextResponse } from "next/server";
import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

  const results = await getProductImageStudioProjectRepository().listResultArchiveItems();
  return NextResponse.json({ ok: true, results });
}
