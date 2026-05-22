import { ClipboardCheck, GitBranch, ShieldCheck } from "lucide-react";
import type { OwnerDecisionFlowView } from "@/features/agenda-room/types";

type OwnerDecisionFlowPanelProps = {
  flows: OwnerDecisionFlowView[];
};

export function OwnerDecisionFlowPanel({ flows }: OwnerDecisionFlowPanelProps) {
  return (
    <section className="decision-flow-section" aria-labelledby="decision-flow-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">대표 결정 후 흐름</span>
          <h2 id="decision-flow-title">실행 전 점검과 모의 실행 결과</h2>
        </div>
      </div>
      <div className="decision-flow-list">
        {flows.map((flow) => (
          <article className="decision-flow-card" key={flow.id}>
            <header className="decision-flow-header">
              <div>
                <span className="status-pill">
                  <ShieldCheck size={14} aria-hidden="true" />
                  {flow.decisionLabel}
                </span>
                <h3>{flow.title}</h3>
              </div>
              <span>{flow.preflightStatusLabel}</span>
            </header>
            <p className="decision-memo">{flow.memo}</p>

            <div className="preflight-grid">
              {flow.preflightChecks.map((check) => (
                <div className={`preflight-item preflight-${check.status}`} key={`${flow.id}-${check.label}`}>
                  <strong>{check.label}</strong>
                  <span>{check.status}</span>
                  <p>{check.message}</p>
                </div>
              ))}
            </div>

            <div className="decision-result-grid">
              <div>
                <span>
                  <GitBranch size={15} aria-hidden="true" />
                  실행 결과
                </span>
                <strong>{flow.executionStateLabel}</strong>
                <p>{flow.executionNote}</p>
              </div>
              <div>
                <span>
                  <ClipboardCheck size={15} aria-hidden="true" />
                  성과 판단
                </span>
                <strong>{flow.outcomeStateLabel}</strong>
                <p>{flow.outcomeSummary}</p>
                {flow.outcomeEvidenceLabels.length > 0 ? (
                  <div className="outcome-evidence-list" aria-label={`${flow.title} 성과 근거`}>
                    {flow.outcomeEvidenceLabels.map((label) => (
                      <span key={`${flow.id}-${label}`}>{label}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <footer className="followup-list">
              {flow.followUpTasks.map((task) => (
                <span key={task}>{task}</span>
              ))}
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
