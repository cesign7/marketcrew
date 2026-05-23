import { BrainCircuit, FileText, ShieldCheck, WalletCards } from "lucide-react";
import type { AiPilotInsightView } from "@/features/agenda-room/types";

type AiPilotInsightPanelProps = {
  insight: AiPilotInsightView;
};

export function AiPilotInsightPanel({ insight }: AiPilotInsightPanelProps) {
  return (
    <section className="ai-pilot-section" aria-labelledby="ai-pilot-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">실제 AI 판단</span>
          <h2 id="ai-pilot-title">{insight.title}</h2>
          <p>저장된 실제 AI 모델 파일럿 결과만 보여줍니다. 이 패널은 외부 광고나 상품을 직접 바꾸지 않습니다.</p>
        </div>
        <strong className={`ai-pilot-status pilot-${insight.tone}`}>{insight.statusLabel}</strong>
      </div>

      <article className={`ai-pilot-card pilot-${insight.tone}`}>
        <header>
          <span className="ai-pilot-icon">
            <BrainCircuit size={18} aria-hidden="true" />
          </span>
          <div>
            <span>모아 실제 파일럿</span>
            <strong>{insight.modelLabel}</strong>
          </div>
        </header>

        <p>{insight.summary}</p>

        <div className="ai-pilot-metrics" aria-label="AI 파일럿 실행 요약">
          <span>
            <WalletCards size={15} aria-hidden="true" />
            {insight.tokenCostLabel}
          </span>
          <span>
            <FileText size={15} aria-hidden="true" />
            {insight.evidenceLabel}
          </span>
          <span>{insight.finishedAtLabel}</span>
        </div>

        <div className="ai-pilot-detail-grid">
          <div>
            <strong>추천 안건</strong>
            <ul>
              {insight.recommendedApprovalLabels.map((label, index) => (
                <li key={`${label}-${index}`}>{label}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>판단 근거</strong>
            <ul>
              {insight.evidenceCategoryLabels.map((label, index) => (
                <li key={`${label}-${index}`}>{label}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>안전 조건</strong>
            <div className="ai-pilot-policy-row">
              {insight.inputPolicyLabels.map((label, index) => (
                <span key={`${label}-${index}`}>
                  <ShieldCheck size={14} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
