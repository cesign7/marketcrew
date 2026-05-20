import { AgentRoom } from "@/components/marketing-room/AgentRoom";
import { AppShell } from "@/components/layout/AppShell";
import {
  mockActionProposals,
  mockAgentReports,
} from "@/lib/mock/marketingOperationsMock";

export default function OperationsPage() {
  return (
    <AppShell>
      <AgentRoom reports={mockAgentReports} proposals={mockActionProposals} />
    </AppShell>
  );
}
