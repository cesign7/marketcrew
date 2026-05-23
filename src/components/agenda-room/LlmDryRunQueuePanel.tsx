import { Bot, Gauge, ShieldCheck } from "lucide-react";
import type { LlmDryRunQueueView } from "@/features/agenda-room/types";

type LlmDryRunQueuePanelProps = {
  queue: LlmDryRunQueueView;
};

export function LlmDryRunQueuePanel({ queue }: LlmDryRunQueuePanelProps) {
  return (
    <section className="ai-exec-section" aria-labelledby="ai-exec-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">AI 사전 점검</span>
          <h2 id="ai-exec-title">{queue.title}</h2>
          <p>{queue.guardrailLabel}</p>
        </div>
        <strong className="queue-summary-label">{queue.summaryLabel}</strong>
      </div>

      <div className="ai-exec-grid">
        {queue.items.map((item) => (
          <article className={`ai-exec-card ai-exec-${item.tone === "ready" ? "ready" : "stop"}`} key={item.id}>
            <header>
              <span className="ai-exec-icon">
                <Bot size={18} aria-hidden="true" />
              </span>
              <div>
                <span>{item.runnerName} · {item.runnerRole}</span>
                <h3>{item.executionModeLabel}</h3>
              </div>
              <strong>{item.statusLabel}</strong>
            </header>

            <p>{item.decisionSummary}</p>

            <div className="ai-exec-metrics" aria-label="AI 실행 점검 요약">
              <span>
                <ShieldCheck size={15} aria-hidden="true" />
                {item.actualCallLabel}
              </span>
              <span>{item.modelLabel}</span>
              <span>{item.budgetLabel}</span>
              <span>{item.inputPolicyLabel}</span>
            </div>

            <div className="ai-exec-metrics" aria-label="AI 입력 근거와 토큰">
              <span>
                <Gauge size={15} aria-hidden="true" />
                {item.tokenLabel}
              </span>
              <span>{item.evidenceLabel}</span>
            </div>

            <div className="ai-exec-fields">
              <strong>점검 항목</strong>
              <div>
                {(item.blockedGateLabels.length > 0 ? item.blockedGateLabels : item.readyGateLabels).map((label) => (
                  <span key={`${item.id}-${label}`}>{label}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
