import { CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { decideProposalAction } from "@/app/approvals/actions";
import type { ActionProposal } from "@/lib/domain/approvals";

export function TodayQuestList({
  proposals,
}: {
  proposals: ActionProposal[];
}) {
  const needsApproval = proposals.filter(
    (proposal) => proposal.status === "NEEDS_APPROVAL",
  );

  return (
    <section className="rounded-[28px] border border-[#eadfc8] bg-[#fffdf7] p-5 shadow-[0_18px_50px_rgba(78,62,38,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">오늘의 승인 퀘스트</h2>
          <p className="text-sm font-semibold text-[#7b8791]">
            AI가 실행 전 확인을 요청한 일입니다.
          </p>
        </div>
        <Sparkles className="text-[#de6a4b]" size={22} />
      </div>
      <div className="mt-4 grid gap-3">
        {needsApproval.map((proposal) => (
          <div
            key={proposal.id}
            className="rounded-2xl border border-[#eadfc8] bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-1 text-[#de6a4b]" size={18} />
              <div>
                <p className="text-sm font-black">{proposal.title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[#69727c]">
                  {proposal.reason}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <form action={decideProposalAction}>
                <input type="hidden" name="proposalId" value={proposal.id} />
                <input type="hidden" name="decision" value="approve" />
                <button className="rounded-full bg-[#0e8f81] px-4 py-2 text-xs font-black text-white hover:-translate-y-0.5">
                  승인
                </button>
              </form>
              <form action={decideProposalAction}>
                <input type="hidden" name="proposalId" value={proposal.id} />
                <input type="hidden" name="decision" value="hold" />
                <button className="rounded-full border border-[#eadfc8] px-4 py-2 text-xs font-black text-[#44505b] hover:-translate-y-0.5 hover:bg-[#fff4dc]">
                  보류
                </button>
              </form>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-2xl bg-[#e6f7ef] px-4 py-3 text-sm font-black text-[#14764d]">
          <CheckCircle2 size={17} />
          저위험 자동 처리 내역은 실행 이력에 저장됩니다.
        </div>
      </div>
    </section>
  );
}
