import { NextResponse } from "next/server";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { getSearchAdRuleResultDetailView } from "@/lib/persistence/searchAdRepository";

type RuleResultDetailRouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RuleResultDetailRouteContext) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const { id } = await context.params;
  const data = await getSearchAdRuleResultDetailView(normalizeRouteParam(id));
  if (!data) {
    return NextResponse.json({ ok: false, code: "SEARCH_AD_RULE_RESULT_NOT_FOUND", message: "규칙 결과를 찾지 못했습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data });
}

function normalizeRouteParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
