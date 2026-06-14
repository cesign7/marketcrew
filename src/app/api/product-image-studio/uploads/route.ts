import { NextResponse } from "next/server";
import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";
import { listProductImageStudioUploadArchiveItems } from "@/features/product-image-studio/server/uploadArchive";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

  const uploads = await listProductImageStudioUploadArchiveItems();
  return NextResponse.json({ ok: true, uploads });
}
