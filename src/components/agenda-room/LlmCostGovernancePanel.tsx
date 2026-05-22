import { Coins, ExternalLink, Gauge, KeyRound, ShieldCheck } from "lucide-react";
import type { LlmCostGovernanceView } from "@/features/agenda-room/types";

type LlmCostGovernancePanelProps = {
  governance: LlmCostGovernanceView;
};

export function LlmCostGovernancePanel({ governance }: LlmCostGovernancePanelProps) {
  const pricingSourceUrl = governance.officialPricingRows.find((row) => row.sourceUrl)?.sourceUrl;

  return (
    <section className="llm-governance-section" aria-labelledby="llm-governance-title">
      <div className={`llm-governance-card governance-${governance.tone}`}>
        <header>
          <span className="llm-governance-icon">
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          <div>
            <span className="eyebrow">AI 모델 비용 가드</span>
            <h2 id="llm-governance-title">실제 호출 전 예산 확인</h2>
          </div>
          <span className="llm-governance-status">{governance.statusLabel}</span>
        </header>

        <p>{governance.decisionSummary}</p>

        <div className="llm-governance-metrics" aria-label="AI 모델 비용 정책 요약">
          <span>
            <KeyRound size={15} aria-hidden="true" />
            {governance.providerLabel}
          </span>
          <span>{governance.modelLabel}</span>
          <span>{governance.credentialLabel}</span>
          <span>{governance.modeLabel}</span>
        </div>

        <div className="llm-governance-budget" aria-label="AI 모델 예산 요약">
          <span>
            <Coins size={15} aria-hidden="true" />
            {governance.estimatedRunCostLabel}
          </span>
          <span>{governance.runBudgetLabel}</span>
          <span>{governance.dailySpentLabel}</span>
          <span>{governance.dailyBudgetLabel}</span>
          <span>{governance.dailyRemainingLabel}</span>
        </div>

        <div className="llm-governance-token-row" aria-label="AI 모델 토큰 계획">
          <span>
            <Gauge size={15} aria-hidden="true" />
            {governance.rateBasisLabel}
          </span>
          {governance.plannedTokenLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="llm-pricing-reference" aria-label="공식 AI 모델 가격 기준">
          <header>
            <div>
              <strong>공식 가격 기준</strong>
              <p>{governance.officialPricingSourceLabel}</p>
            </div>
            {pricingSourceUrl ? (
              <a
                href={pricingSourceUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="공식 가격표 새 창 열기"
              >
                <ExternalLink size={15} aria-hidden="true" />
                가격표
              </a>
            ) : null}
          </header>
          <div className="llm-pricing-grid">
            {governance.officialPricingRows.map((row) => (
              <article className={`llm-pricing-row pricing-${row.tone}`} key={`${row.modelKey}-${row.roleLabel}`}>
                <header>
                  <div>
                    <strong>{row.modelLabel}</strong>
                    <span>{row.roleLabel}</span>
                  </div>
                  <span>{row.tierLabel}</span>
                </header>
                <div>
                  <span>{row.inputPriceLabel}</span>
                  <span>{row.outputPriceLabel}</span>
                  <span>{row.cachePriceLabel}</span>
                </div>
                <p>{row.note}</p>
              </article>
            ))}
          </div>
          <p>{governance.pricingFormulaLabel}</p>
        </div>

        <div className="llm-governance-check-grid" aria-label="AI 모델 호출 조건">
          {governance.gateChecks.map((check) => (
            <article className={`llm-governance-check check-${check.tone}`} key={check.id}>
              <header>
                <strong>{check.label}</strong>
                <span>{check.statusLabel}</span>
              </header>
              <p>{check.message}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
