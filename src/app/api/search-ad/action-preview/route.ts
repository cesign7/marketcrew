import { NextResponse } from "next/server";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { createSearchAdActionPreview } from "@/lib/persistence/searchAdRepository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const body = (await request.json().catch(() => ({}))) as {
    targetType?: string;
    targetId?: string;
    requestedAction?: string;
  };
  if (
    (body.targetType !== "campaign" && body.targetType !== "adgroup" && body.targetType !== "keyword") ||
    !body.targetId ||
    (body.requestedAction !== "turn_on" && body.requestedAction !== "turn_off")
  ) {
    return NextResponse.json({ ok: false, code: "SEARCH_AD_ACTION_INPUT_INVALID", message: "대상과 요청 작업을 확인해 주세요." }, { status: 400 });
  }

  const data = await createSearchAdActionPreview({
    targetType: body.targetType,
    targetId: body.targetId,
    requestedAction: body.requestedAction,
  });
  if (!data) {
    return NextResponse.json({ ok: false, code: "SEARCH_AD_ACTION_TARGET_NOT_FOUND", message: "대상을 찾지 못했습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data });
}
