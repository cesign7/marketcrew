import { NextResponse } from "next/server";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { runSampleAgendaCycle } from "@/lib/application/agenda-cycle";
import { buildReadOnlyProviderSyncReports } from "@/lib/integrations/providers/read-only-sync";
import { buildProviderReadinessReports } from "@/lib/integrations/providers/readiness";
import { buildDeterministicPlannerResult, buildPlannerInputFromApprovals } from "@/lib/llm/planner";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const agendaCycle = runSampleAgendaCycle();
  const providerReadiness = buildProviderReadinessReports(process.env, agendaCycle.generatedAt);
  const providerSyncReports = buildReadOnlyProviderSyncReports(process.env, agendaCycle.generatedAt);
  const plannerInput = buildPlannerInputFromApprovals(agendaCycle.approvalRequests, agendaCycle.generatedAt);
  const plannerPreview = buildDeterministicPlannerResult(plannerInput);

  return NextResponse.json({
    generatedAt: agendaCycle.generatedAt,
    providerReadiness,
    providerSyncReports,
    plannerPreview,
  });
}
