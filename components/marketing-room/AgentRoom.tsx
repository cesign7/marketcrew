import { AgentDesk } from "@/components/marketing-room/AgentDesk";
import { TodayQuestList } from "@/components/marketing-room/TodayQuestList";
import type { ActionProposal } from "@/lib/domain/approvals";
import type { AgentReport } from "@/lib/domain/agents";
import { getApprovalSummary } from "@/lib/domain/operations";

export function AgentRoom({
  reports,
  proposals,
}: {
  reports: AgentReport[];
  proposals: ActionProposal[];
}) {
  const summary = getApprovalSummary(proposals);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
      <section className="rounded-[34px] border border-[#eadfc8] bg-[#f7edda] p-5 shadow-[0_25px_80px_rgba(78,62,38,0.10)]">
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <Metric label="자동 처리" value={`${summary.autoExecuted}건`} />
          <Metric label="승인 필요" value={`${summary.needsApproval}건`} />
          <Metric label="보류" value={`${summary.held}건`} />
          <Metric label="고위험" value={`${summary.highRisk}건`} />
        </div>
        <div className="grid gap-4 2xl:grid-cols-2">
          {reports.map((report) => (
            <AgentDesk key={report.id} report={report} />
          ))}
        </div>
      </section>
      <TodayQuestList proposals={proposals} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#eadfc8] bg-white px-4 py-3">
      <p className="text-xs font-black text-[#69727c]">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-[#12302d]">
        {value}
      </p>
    </div>
  );
}
