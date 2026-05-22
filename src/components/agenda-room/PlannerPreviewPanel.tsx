import { BrainCircuit, FileCheck2 } from "lucide-react";
import type { PlannerPreviewView } from "@/features/agenda-room/types";

type PlannerPreviewPanelProps = {
  preview: PlannerPreviewView;
};

export function PlannerPreviewPanel({ preview }: PlannerPreviewPanelProps) {
  return (
    <section className="planner-preview-section" aria-labelledby="planner-preview-title">
      <div className="planner-preview-card">
        <header>
          <span className="planner-icon">
            <BrainCircuit size={18} aria-hidden="true" />
          </span>
          <div>
            <span className="eyebrow">오피 플래너</span>
            <h2 id="planner-preview-title">{preview.title}</h2>
          </div>
          <span className="planner-mode">{preview.modeLabel}</span>
        </header>
        <p>{preview.summary}</p>
        <div className="planner-metrics">
          <span>{preview.tokenEstimateLabel}</span>
          <span>{preview.rawRowsLabel}</span>
          <span>{preview.selectedAgendaIds.length.toLocaleString("ko-KR")}개 안건 선택</span>
        </div>
        <div className="planner-evidence-row">
          <FileCheck2 size={16} aria-hidden="true" />
          <span>{preview.evidenceIds.length.toLocaleString("ko-KR")}개 근거 ID 유지</span>
        </div>
        <div className="planner-constraints" aria-label="AI 모델 입력 제약">
          {preview.constraints.map((constraint) => (
            <span key={constraint}>{constraint}</span>
          ))}
        </div>
        <div className="planner-audit-grid" aria-label="오피 플래너 감사 정보">
          <span>{preview.audit.providerLabel}</span>
          <span>{preview.audit.modelLabel}</span>
          <span>{preview.audit.tokenUsageLabel}</span>
          <span>{preview.audit.billingLabel}</span>
        </div>
        <div className="planner-trace">
          <strong>{preview.audit.runId}</strong>
          <p>
            {preview.audit.inputId} -&gt; {preview.audit.resultId}
          </p>
          <p>{preview.audit.sourceCountLabels.join(" · ")}</p>
          <p>{preview.audit.evidenceTraceLabel}</p>
        </div>
      </div>
    </section>
  );
}
