import { AgentDesk } from "@/components/marketing-room/AgentDesk";
import { TodayQuestList } from "@/components/marketing-room/TodayQuestList";
import type { KeywordDiagnosticsOverview } from "@/lib/db/keyword-diagnostics";
import type { ActionProposal } from "@/lib/domain/approvals";
import type { AgentReport } from "@/lib/domain/agents";
import { getApprovalSummary } from "@/lib/domain/operations";

export function AgentRoom({
  reports,
  proposals,
  diagnostics,
  runDiagnosticsAction,
}: {
  reports: AgentReport[];
  proposals: ActionProposal[];
  diagnostics: KeywordDiagnosticsOverview;
  runDiagnosticsAction: () => Promise<void>;
}) {
  const summary = getApprovalSummary(proposals);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
      <section className="rounded-[34px] border border-[#eadfc8] bg-[#f7edda] p-5 shadow-[0_25px_80px_rgba(78,62,38,0.10)]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-[26px] border border-[#eadfc8] bg-white p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0e8f81]">
              AI 운영실
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-[#12302d]">
              캐릭터 AI 키워드 진단
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#69727c]">
              {diagnostics.quality.title}. {diagnostics.quality.detail}
            </p>
            <p className="mt-1 text-xs font-black text-[#8a5b00]">
              다음 작업: {diagnostics.quality.nextAction}
            </p>
          </div>
          <form action={runDiagnosticsAction}>
            <button className="rounded-full bg-[#0e8f81] px-5 py-3 text-sm font-black text-white hover:-translate-y-0.5">
              AI 진단 실행
            </button>
          </form>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <Metric label="자동 처리" value={`${summary.autoExecuted}건`} />
          <Metric label="승인 필요" value={`${summary.needsApproval}건`} />
          <Metric label="보류" value={`${summary.held}건`} />
          <Metric label="고위험" value={`${summary.highRisk}건`} />
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <Metric
            label="키워드 스냅샷"
            value={`${diagnostics.keywordSnapshotCount.toLocaleString()}건`}
          />
          <Metric
            label="성과 데이터"
            value={`${diagnostics.performanceRowCount.toLocaleString()}건`}
          />
          <Metric label="진단 상태" value={qualityLabel(diagnostics.quality.status)} />
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

function qualityLabel(status: KeywordDiagnosticsOverview["quality"]["status"]) {
  if (status === "READY") return "준비 완료";
  if (status === "STALE_PERFORMANCE") return "데이터 오래됨";
  if (status === "NO_KEYWORDS") return "목록 필요";
  if (status === "NO_PERFORMANCE_ROWS") return "성과 없음";
  return "점검 필요";
}
