import { Activity, Coins, Cpu, FileSearch } from "lucide-react";
import type { AgentRunSummaryView } from "@/features/agenda-room/types";

type AgentRunSummaryPanelProps = {
  summary: AgentRunSummaryView;
};

export function AgentRunSummaryPanel({ summary }: AgentRunSummaryPanelProps) {
  return (
    <section className="agent-run-section" aria-labelledby="agent-run-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">실행 근거</span>
          <h2 id="agent-run-title">AI 실행 감사 로그</h2>
          <p>모아 계획, 연동 수집, 대표 결정이 남긴 모델/토큰/비용/근거 이력입니다.</p>
        </div>
      </div>
      <div className="agent-run-card">
        <div className="agent-run-metrics" aria-label="AI 실행 요약">
          <span>
            <Activity size={15} aria-hidden="true" />
            {summary.totalRuns.toLocaleString("ko-KR")}회 실행
          </span>
          <span>
            <Cpu size={15} aria-hidden="true" />
            {summary.totalTokensLabel}
          </span>
          <span>
            <Coins size={15} aria-hidden="true" />
            {summary.estimatedCostLabel}
          </span>
        </div>
        <div className="agent-run-status-row">
          {summary.statusCountLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        {summary.recentRuns.length > 0 ? (
          <div className="agent-run-list" aria-label="최근 AI 실행 이력">
            {summary.recentRuns.map((run) => (
              <article className="agent-run-item" key={run.id}>
                <header>
                  <strong>{run.runnerLabel}</strong>
                  <span>{run.statusLabel}</span>
                </header>
                <p>{run.id}</p>
                <div>
                  <span>{run.modelLabel}</span>
                  <span>{run.tokenLabel}</span>
                  <span>{run.costLabel}</span>
                  <span>{run.evidenceLabel}</span>
                  <span>{run.finishedAt}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <FileSearch size={18} aria-hidden="true" />
            <p>아직 저장된 AI 실행 기록이 없습니다. 모아 계획이나 연동 수집이 실행되면 이곳에 표시됩니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}
