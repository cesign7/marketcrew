import { NextResponse } from "next/server";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { applySearchAdActionPreview } from "@/lib/persistence/searchAdRepository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const body = (await request.json().catch(() => ({}))) as { previewId?: string };
  if (!body.previewId) {
    return NextResponse.json({ ok: false, code: "SEARCH_AD_PREVIEW_ID_REQUIRED", message: "미리보기 ID가 필요합니다." }, { status: 400 });
  }

  try {
    const data = await applySearchAdActionPreview(body.previewId);
    return NextResponse.json({ ok: true, data }, { status: data.status === "blocked" ? 423 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "실행 요청 처리에 실패했습니다.";
    return NextResponse.json({ ok: false, code: "SEARCH_AD_ACTION_APPLY_FAILED", message }, { status: 404 });
  }
}
