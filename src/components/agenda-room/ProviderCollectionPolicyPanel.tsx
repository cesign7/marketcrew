import { CalendarClock, Database, History, ShieldCheck } from "lucide-react";
import type { ProviderSyncEvidenceView } from "@/features/agenda-room/types";

type ProviderCollectionPolicyPanelProps = {
  periodLabel: string;
  periodPolicyLabel: string;
  reports: ProviderSyncEvidenceView[];
};

export function ProviderCollectionPolicyPanel({
  periodLabel,
  periodPolicyLabel,
  reports,
}: ProviderCollectionPolicyPanelProps) {
  const policies = buildUniquePolicies(reports);

  if (policies.length === 0) {
    return null;
  }

  return (
    <section className="collection-policy-section" aria-labelledby="collection-policy-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">수집 설계</span>
          <h2 id="collection-policy-title">조회 한계와 저장 기준</h2>
          <p>{periodLabel} 화면은 API에서 다시 가져올 수 있는 기간과 이미 저장한 일별 스냅샷을 구분해서 판단합니다.</p>
        </div>
      </div>

      <div className="policy-principle-row" aria-label="데이터 운영 기준">
        <span>
          <Database size={16} aria-hidden="true" />
          원천 행 제외
        </span>
        <span>
          <CalendarClock size={16} aria-hidden="true" />
          일별 집계 저장
        </span>
        <span>
          <History size={16} aria-hidden="true" />
          백필은 분할 실행
        </span>
        <span>
          <ShieldCheck size={16} aria-hidden="true" />
          AI 입력은 요약만
        </span>
      </div>

      <p className="policy-period-note">{periodPolicyLabel}</p>

      <div className="collection-policy-grid">
        {policies.map((policy) => (
          <article className="collection-policy-card" key={policy.providerKey}>
            <header>
              <span>{policy.providerLabel}</span>
              <strong>{policy.historyPolicy.apiLimitLabel}</strong>
            </header>
            <ul>
              <li>{policy.historyPolicy.requestWindowLabel}</li>
              <li>{policy.historyPolicy.backfillLabel}</li>
              <li>{policy.historyPolicy.seasonalityLabel}</li>
              <li>{policy.historyPolicy.storageLabel}</li>
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildUniquePolicies(reports: ProviderSyncEvidenceView[]) {
  const policiesByProvider = new Map<
    ProviderSyncEvidenceView["providerKey"],
    Pick<ProviderSyncEvidenceView, "providerKey" | "providerLabel" | "historyPolicy">
  >();

  for (const report of reports) {
    if (!policiesByProvider.has(report.providerKey)) {
      policiesByProvider.set(report.providerKey, {
        providerKey: report.providerKey,
        providerLabel: report.providerLabel,
        historyPolicy: report.historyPolicy,
      });
    }
  }

  const providerOrder: ProviderSyncEvidenceView["providerKey"][] = ["search_ad", "datalab", "smartstore", "shop"];

  return providerOrder
    .map((provider) => policiesByProvider.get(provider))
    .filter((policy): policy is Pick<ProviderSyncEvidenceView, "providerKey" | "providerLabel" | "historyPolicy"> =>
      Boolean(policy),
    );
}
