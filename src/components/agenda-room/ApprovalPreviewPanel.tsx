import { Activity, Ban, CheckCircle2, Database, FileSearch, RotateCcw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { ApprovalPreviewView } from "@/features/agenda-room/types";

type ApprovalPreviewPanelProps = {
  previews: ApprovalPreviewView[];
};

export function ApprovalPreviewPanel({ previews }: ApprovalPreviewPanelProps) {
  return (
    <section className="approval-preview-section" aria-labelledby="approval-preview-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">대표 결재 미리보기</span>
          <h2 id="approval-preview-title">승인 전 확인해야 할 변경안</h2>
        </div>
      </div>
      <div className="approval-preview-list">
        {previews.map((preview) => (
          <article className="approval-preview-card" key={preview.id}>
            <header className="approval-preview-header">
              <div>
                <span className="status-pill">
                  <ShieldCheck size={14} aria-hidden="true" />
                  {preview.statusLabel}
                </span>
                <h3>{preview.title}</h3>
              </div>
              <div className="approval-labels">
                <span>{preview.confidenceLabel}</span>
                <span>{preview.riskLabel}</span>
              </div>
            </header>

            <p className="approval-summary">{preview.evidenceSummary}</p>
            <p className="approval-diff">{preview.diffSummary}</p>

            {preview.executionScopeProposal ? (
              <section className="execution-scope-preview" aria-label={`${preview.title} 실행 범위`}>
                <header>
                  <div>
                    <SlidersHorizontal size={16} aria-hidden="true" />
                    <strong>AI 제안 실행 범위</strong>
                  </div>
                  <span>대표 수정 가능</span>
                </header>
                <p>{preview.executionScopeProposal.summary}</p>
                <div className="execution-scope-grid">
                  {preview.executionScopeProposal.fields.map((field) => (
                    <div key={`${preview.id}-scope-${field.id}`}>
                      <span>{field.label}</span>
                      <strong>{field.recommendedValue}</strong>
                      <p>{field.reason}</p>
                    </div>
                  ))}
                </div>
                <div className="execution-scope-guardrails">
                  {preview.executionScopeProposal.guardrailLabels.map((guardrail, index) => (
                    <span key={`${preview.id}-scope-guard-${index}-${guardrail}`}>{guardrail}</span>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="approval-provenance" aria-label={`${preview.title} 근거 추적`}>
              <header>
                <div>
                  <FileSearch size={16} aria-hidden="true" />
                  <strong>카드별 근거 추적</strong>
                </div>
                <span>{preview.provenance.summaryLabel}</span>
              </header>
              <div className="approval-provenance-grid">
                <div>
                  <strong>데이터 근거</strong>
                  <ChipList items={preview.provenance.evidenceLabels} keyPrefix={`${preview.id}-evidence`} />
                </div>
                <div>
                  <strong>
                    <Activity size={14} aria-hidden="true" />
                    AI 실행 이력
                  </strong>
                  <ChipList items={preview.provenance.agentRunLabels} keyPrefix={`${preview.id}-agent-run`} />
                </div>
                <div>
                  <strong>
                    <Database size={14} aria-hidden="true" />
                    연동 수집
                  </strong>
                  <ChipList items={preview.provenance.providerEvidenceLabels} keyPrefix={`${preview.id}-provider-evidence`} />
                </div>
                <div>
                  <strong>안전 조건</strong>
                  <ChipList items={preview.provenance.safetyLabels} keyPrefix={`${preview.id}-safety`} />
                </div>
              </div>
            </section>

            <div className="diff-grid" aria-label={`${preview.title} 변경 전후`}>
              <div>
                <strong>변경 전</strong>
                <ul>
                  {preview.beforeItems.map((item, index) => (
                    <li key={`${preview.id}-before-${index}-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>승인 후</strong>
                <ul>
                  {preview.afterItems.map((item, index) => (
                    <li key={`${preview.id}-after-${index}-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="approval-guard-grid">
              <div>
                <span>
                  <RotateCcw size={15} aria-hidden="true" />
                  되돌리기
                </span>
                <p>{preview.rollbackPlan}</p>
              </div>
              <div>
                <span>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  성과 확인
                </span>
                <p>{preview.measurementLabels.join(" / ")}</p>
              </div>
              <div>
                <span>
                  <Ban size={15} aria-hidden="true" />
                  실행 경계
                </span>
                <p>
                  {preview.executorLabel} · {preview.writeGateLabel}
                </p>
              </div>
            </div>

            <footer className="decision-bar" aria-label={`${preview.title} 대표 결정`}>
              <button className="primary-button" type="button" disabled={Boolean(preview.disabledReason)}>
                <ShieldCheck size={16} aria-hidden="true" />
                {preview.primaryActionLabel}
              </button>
              {preview.secondaryActions.map((action, index) => (
                <button className="secondary-button" type="button" key={`${preview.id}-action-${index}-${action}`}>
                  {action}
                </button>
              ))}
              {preview.disabledReason ? <span>{preview.disabledReason}</span> : null}
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function ChipList({ items, keyPrefix }: { items: string[]; keyPrefix: string }) {
  return (
    <div className="approval-provenance-chips">
      {items.map((item, index) => (
        <span key={`${keyPrefix}-${index}-${item}`}>{item}</span>
      ))}
    </div>
  );
}
