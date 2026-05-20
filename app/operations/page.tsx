import { AgentRoom } from "@/components/marketing-room/AgentRoom";
import { AppShell } from "@/components/layout/AppShell";
import {
  getActionProposals,
  getAgentReports,
} from "@/lib/db/marketing-operations";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const [reports, proposals] = await Promise.all([
    getAgentReports(),
    getActionProposals(),
  ]);

  return (
    <AppShell>
      <AgentRoom reports={reports} proposals={proposals} />
    </AppShell>
  );
}
