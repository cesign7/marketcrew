import { ApprovalCard } from "@/components/approvals/ApprovalCard";
import type { ActionProposal } from "@/lib/domain/approvals";

export function ApprovalQueue({
  proposals,
}: {
  proposals: ActionProposal[];
}) {
  if (proposals.length === 0) {
    return (
      <div className="rounded-[28px] border border-[#eadfc8] bg-white p-8 text-center">
        <p className="text-lg font-black">승인 대기 작업이 없습니다.</p>
        <p className="mt-2 text-sm font-semibold text-[#69727c]">
          검색광고 dry-run 동기화가 시작되면 AI 제안이 이곳에 쌓입니다.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {proposals.map((proposal) => (
        <ApprovalCard key={proposal.id} proposal={proposal} />
      ))}
    </div>
  );
}
