import { CalendarDays, CircleDollarSign } from "lucide-react";
import type { SeasonalKeywordPlanView } from "@/features/agenda-room/types";

type SeasonalKeywordPanelProps = {
  plans: SeasonalKeywordPlanView[];
};

export function SeasonalKeywordPanel({ plans }: SeasonalKeywordPanelProps) {
  return (
    <section className="keyword-section" aria-labelledby="seasonal-keywords-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">시즌 키워드</span>
          <h2 id="seasonal-keywords-title">명절과 행사 기준 제안</h2>
        </div>
        <button className="icon-button" type="button" aria-label="시즌 키워드 새로고침">
          <CalendarDays size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="keyword-list">
        {plans.map((plan) => (
          <article className="keyword-card" key={plan.id}>
            <header>
              <div>
                <strong>{plan.eventName}</strong>
                <span>{plan.calendarBasis} 기준</span>
              </div>
              <span className="next-action">{plan.nextAction}</span>
            </header>
            <p className="comparison-window">{plan.comparisonWindow}</p>
            <div className="keyword-chips">
              {plan.keywords.map((keyword) => (
                <span key={keyword}>{keyword}</span>
              ))}
            </div>
            <p>{plan.proposal}</p>
            <div className="guardrail">
              <CircleDollarSign size={16} aria-hidden="true" />
              {plan.budgetGuardrail}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
