import { NextResponse } from "next/server";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { listSearchAdRuleCriteria } from "@/lib/persistence/searchAdRepository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  return NextResponse.json({ ok: true, data: await listSearchAdRuleCriteria() });
}
