import { Activity, Cpu, FileSearch, Link2 } from "lucide-react";
import type { ApprovalAgentRunTimelineView } from "@/features/approvals/buildApprovalDetailViewModel";

type ApprovalAgentRunTimelinePanelProps = {
  runs: ApprovalAgentRunTimelineView[];
};

export function ApprovalAgentRunTimelinePanel({ runs }: ApprovalAgentRunTimelinePanelProps) {
  return (
    <section className="approval-agent-run-section" aria-labelledby="approval-agent-run-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">모델/근거 감사</span>
          <h2 id="approval-agent-run-title">이 결재의 AI 실행 이력</h2>
          <p>안건 생성, 대표 결정, 실행 결과, 성과 보고에 연결된 실행 기록과 모델/토큰/근거 ID를 묶어 확인합니다.</p>
        </div>
      </div>
      {runs.length > 0 ? (
        <div className="approval-agent-run-list" aria-label="결재별 AI 실행 이력">
          {runs.map((run) => (
            <article className={`approval-agent-run-card run-${run.statusTone}`} key={run.id}>
              <header>
                <div>
                  <span className="agent-run-icon">
                    <Activity size={17} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{run.runnerLabel}</strong>
                    <p>{run.id}</p>
                  </div>
                </div>
                <span>{run.statusLabel}</span>
              </header>

              <div className="approval-agent-run-metrics" aria-label={`${run.id} 모델과 비용`}>
                <span>
                  <Cpu size={14} aria-hidden="true" />
                  {run.modelLabel}
                </span>
                <span>{run.modeLabel}</span>
                <span>{run.tokenLabel}</span>
                <span>{run.costLabel}</span>
                <span>{run.evidenceCountLabel}</span>
                <span>{run.finishedAt}</span>
              </div>

              <div className="approval-agent-run-summary">
                <div>
                  <strong>입력 요약</strong>
                  <p>{run.inputSummary}</p>
                </div>
                <div>
                  <strong>출력 요약</strong>
                  <p>{run.outputSummary}</p>
                </div>
              </div>

              <div className="approval-agent-run-links" aria-label={`${run.id} 연결 객체와 관계`}>
                {run.relationLabels.map((label) => (
                  <span key={`relation-${label}`}>{label}</span>
                ))}
                {run.linkedObjectLabels.map((label) => (
                  <span key={`object-${label}`}>
                    <Link2 size={13} aria-hidden="true" />
                    {label}
                  </span>
                ))}
              </div>

              <div className="approval-agent-run-evidence">
                <strong>근거 추적</strong>
                <p>{run.evidenceTraceLabel}</p>
              </div>
              {run.errorMessage ? <p className="agent-run-error">실패 사유: {run.errorMessage}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <FileSearch size={18} aria-hidden="true" />
          <p>이 결재에 직접 연결된 AI 실행 기록이 아직 없습니다. 오피 계획, 연동 수집, 대표 결정이 저장되면 여기에 표시됩니다.</p>
        </div>
      )}
    </section>
  );
}
