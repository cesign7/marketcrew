import { NextResponse } from "next/server";
import { normalizeSearchAdOperationStrategyInput } from "@/features/search-ad/domain/operationStrategies";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { listSearchAdOperationStrategies, updateSearchAdOperationStrategy } from "@/lib/persistence/searchAdRepository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  return NextResponse.json({ ok: true, data: await listSearchAdOperationStrategies() });
}

export async function PATCH(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const input = normalizeSearchAdOperationStrategyInput(body);
    return NextResponse.json({ ok: true, data: await updateSearchAdOperationStrategy(input) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "SEARCH_AD_OPERATION_STRATEGY_INVALID",
        message: error instanceof Error ? error.message : "운영 전략을 저장하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
