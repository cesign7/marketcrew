import { NextResponse } from "next/server";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { listSearchAdRuleCriteria, updateSearchAdRuleCriteria } from "@/lib/persistence/searchAdRepository";
import { normalizeSearchAdRuleCriteriaInput } from "@/features/search-ad/domain/ruleCriteriaSettings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  return NextResponse.json({ ok: true, data: await listSearchAdRuleCriteria() });
}

export async function PATCH(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const input = normalizeSearchAdRuleCriteriaInput(body);
    return NextResponse.json({ ok: true, data: await updateSearchAdRuleCriteria(input) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "SEARCH_AD_RULE_CRITERIA_INVALID",
        message: error instanceof Error ? error.message : "성과 기준을 저장하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
