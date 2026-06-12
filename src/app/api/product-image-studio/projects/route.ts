import { NextResponse } from "next/server";
import { createProductImageStudioProjectFromPayload } from "@/features/product-image-studio/server/projectApi";
import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

  const payload = await readJsonPayload(request);
  const result = await createProductImageStudioProjectFromPayload(payload);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: result.project.id, project: result.project }, { status: 201 });
}

async function readJsonPayload(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof Error) {
      return null;
    }
    throw error;
  }
}
