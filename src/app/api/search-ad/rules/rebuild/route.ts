import { NextResponse } from "next/server";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { rebuildAndSaveSearchAdRuleResults } from "@/lib/persistence/searchAdRepository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const data = await rebuildAndSaveSearchAdRuleResults();
  return NextResponse.json({ ok: true, data });
}
