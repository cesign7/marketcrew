import { NextResponse } from "next/server";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { getLatestSearchAdBackfillRun, rebuildAndSaveSearchAdRuleResults } from "@/lib/persistence/searchAdRepository";
import { getRuleRebuildBackfillGuard } from "@/server/search-ad/ruleRebuildGuard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const body = (await request.json().catch(() => ({}))) as { force?: boolean };
  if (body.force !== true) {
    const guard = getRuleRebuildBackfillGuard(await getLatestSearchAdBackfillRun());
    if (guard.blocked) {
      return NextResponse.json({ ok: false, code: "SEARCH_AD_BACKFILL_RUNNING", message: guard.message, data: guard }, { status: 409 });
    }
  }

  const data = await rebuildAndSaveSearchAdRuleResults();
  return NextResponse.json({ ok: true, data });
}
