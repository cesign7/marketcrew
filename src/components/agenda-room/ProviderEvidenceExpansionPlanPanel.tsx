import type { ProviderEvidenceExpansionPlanView } from "@/features/agenda-room/types";

type ProviderEvidenceExpansionPlanPanelProps = {
  plans: ProviderEvidenceExpansionPlanView[];
};

export function ProviderEvidenceExpansionPlanPanel({ plans }: ProviderEvidenceExpansionPlanPanelProps) {
  if (plans.length === 0) {
    return null;
  }

  return (
    <section className="evidence-expansion-section" aria-labelledby="evidence-expansion-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">근거 보강 계획</span>
          <h2 id="evidence-expansion-title">판단 근거 확장 순서</h2>
        </div>
        <p>API에서 추가로 읽을 수 있는 근거를 실제 결재 판단에 가까운 순서대로 정리했습니다.</p>
      </div>

      <ol className="evidence-expansion-list">
        {plans.map((plan) => (
          <li className="evidence-expansion-card" key={plan.id}>
            <header>
              <div>
                <span className="evidence-expansion-phase">{plan.phaseLabel}</span>
                <h3>{plan.title}</h3>
              </div>
              <span className="evidence-expansion-priority">{plan.priorityLabel}</span>
            </header>
            <p>{plan.summary}</p>
            <EvidenceChipList title="추가할 근거" items={plan.evidenceToAdd} />
            <EvidenceChipList title="판단 예시" items={plan.judgmentExamples} />
            <EvidenceChipList title="완료 기준" items={plan.acceptanceChecks} />
            <a className="evidence-expansion-source" href={plan.sourceUrl} target="_blank" rel="noreferrer">
              {plan.sourceLabel}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EvidenceChipList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="evidence-expansion-group">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
