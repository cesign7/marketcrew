import { AgentRoom } from "@/components/marketing-room/AgentRoom";
import { AppShell } from "@/components/layout/AppShell";
import {
  getActionProposals,
  getAgentReports,
  getOperationsDiagnosticsOverview,
} from "@/lib/db/marketing-operations";
import {
  runKeywordDiagnosticsAction,
  runLlmAgentShadowAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const [agentReports, actionProposals, diagnostics] = await Promise.all([
    getAgentReports(),
    getActionProposals(),
    getOperationsDiagnosticsOverview(),
  ]);

  return (
    <AppShell>
      <AgentRoom
        reports={agentReports}
        proposals={actionProposals}
        diagnostics={diagnostics}
        runDiagnosticsAction={runKeywordDiagnosticsAction}
        runLlmAgentShadowAction={runLlmAgentShadowAction}
      />
    </AppShell>
  );
}
