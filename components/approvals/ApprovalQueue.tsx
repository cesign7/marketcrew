import { ApprovalCard } from "@/components/approvals/ApprovalCard";
import type { ActionProposal } from "@/lib/domain/approvals";

export function ApprovalQueue({
  proposals,
}: {
  proposals: ActionProposal[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {proposals.map((proposal) => (
        <ApprovalCard key={proposal.id} proposal={proposal} />
      ))}
    </div>
  );
}
