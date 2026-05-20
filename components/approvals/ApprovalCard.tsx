import { RiskBadge } from "@/components/approvals/RiskBadge";
import { decideProposalAction } from "@/app/approvals/actions";
import type { ActionProposal } from "@/lib/domain/approvals";

const statusLabels: Record<ActionProposal["status"], string> = {
  AUTO_EXECUTED: "자동 처리됨",
  NEEDS_APPROVAL: "승인 필요",
  APPROVED: "승인됨",
  REJECTED: "반려됨",
  HELD: "보류",
  FAILED: "실패",
};

export function ApprovalCard({ proposal }: { proposal: ActionProposal }) {
  const canDecide =
    proposal.status === "NEEDS_APPROVAL" || proposal.status === "HELD";

  return (
    <article className="rounded-[28px] border border-[#eadfc8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RiskBadge riskLevel={proposal.riskLevel} />
        <span className="rounded-full bg-[#f7edda] px-3 py-1 text-xs font-black text-[#6b5b42]">
          {statusLabels[proposal.status]}
        </span>
      </div>
      <h2 className="mt-4 text-lg font-black tracking-tight">
        {proposal.title}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#69727c]">
        {proposal.reason}
      </p>
      <div className="mt-4 grid gap-3 rounded-2xl bg-[#fff8ec] p-4 text-sm font-bold md:grid-cols-2">
        <div>
          <p className="text-xs text-[#7b8791]">현재</p>
          <p>{proposal.beforeLabel}</p>
        </div>
        <div>
          <p className="text-xs text-[#7b8791]">제안</p>
          <p>{proposal.afterLabel}</p>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-[#0e8f81]">
        예상 효과: {proposal.expectedImpact}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <form action={decideProposalAction}>
          <input type="hidden" name="proposalId" value={proposal.id} />
          <input type="hidden" name="decision" value="approve" />
          <button
            className="rounded-full bg-[#0e8f81] px-4 py-2 text-sm font-black text-white hover:-translate-y-0.5 disabled:opacity-50"
            disabled={!canDecide}
          >
            승인
          </button>
        </form>
        <form action={decideProposalAction}>
          <input type="hidden" name="proposalId" value={proposal.id} />
          <input type="hidden" name="decision" value="hold" />
          <button
            className="rounded-full border border-[#eadfc8] px-4 py-2 text-sm font-black text-[#44505b] hover:-translate-y-0.5 hover:bg-[#fff4dc] disabled:opacity-50"
            disabled={!canDecide}
          >
            보류
          </button>
        </form>
        <form action={decideProposalAction}>
          <input type="hidden" name="proposalId" value={proposal.id} />
          <input type="hidden" name="decision" value="reject" />
          <button
            className="rounded-full border border-[#eadfc8] px-4 py-2 text-sm font-black text-[#b34526] hover:-translate-y-0.5 hover:bg-[#ffe9e0] disabled:opacity-50"
            disabled={!canDecide}
          >
            반려
          </button>
        </form>
      </div>
    </article>
  );
}
