import { ChevronDown, Megaphone, Package, Search, ShieldCheck } from "lucide-react";
import type { ProductGrowthOpportunityView } from "@/features/agenda-room/types";

type ProductGrowthOpportunityPanelProps = {
  opportunities: ProductGrowthOpportunityView[];
};

export function ProductGrowthOpportunityPanel({ opportunities }: ProductGrowthOpportunityPanelProps) {
  return (
    <section className="product-opportunity-section" aria-labelledby="product-opportunities-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">상품별 제안</span>
          <h2 id="product-opportunities-title">키워드, 마케팅, 상품 발굴 후보</h2>
          <p>네이버 키워드광고 수요와 쇼핑몰 집계만 합쳐 만든 내부 초안 후보입니다. 외부 반영은 계속 차단됩니다.</p>
        </div>
      </div>
      {opportunities.length > 0 ? (
        <div className="product-opportunity-list">
          {opportunities.map((opportunity) => {
            const displayTitle = truncateProductText(opportunity.title, 28);
            const displayTargetLabel = truncateProductText(opportunity.targetLabel, 16);
            const sourceReportLabels = opportunity.sourceReportIds.length > 0 ? opportunity.sourceReportIds : ["연동 수집 기록 없음"];

            return (
              <article className="product-opportunity-card" key={opportunity.id}>
                <header>
                  <span className="product-opportunity-thumb">
                    <img src={opportunity.productImageUrl} alt={opportunity.productImageAlt} loading="lazy" />
                    <span className="product-opportunity-icon" aria-hidden="true">
                      <OpportunityIcon kindLabel={opportunity.kindLabel} />
                    </span>
                  </span>
                  <div className="product-opportunity-title-block">
                    <span className="eyebrow">{opportunity.owner} · {opportunity.kindLabel}</span>
                    <div className="product-opportunity-title-wrap">
                      <h3 tabIndex={0} title={opportunity.title}>{displayTitle}</h3>
                      <span className="product-opportunity-title-popover" aria-hidden="true">{opportunity.title}</span>
                    </div>
                  </div>
                  <span className="confidence-pill">{opportunity.confidenceLabel}</span>
                </header>
                <p>{opportunity.summary}</p>
                <div className="target-label" title={opportunity.targetLabel}>
                  <ShieldCheck size={15} aria-hidden="true" />
                  <span>{displayTargetLabel}</span>
                </div>
                <div className="keyword-chips" aria-label={`${opportunity.title} 키워드 후보`}>
                  {opportunity.keywords.length > 0 ? (
                    opportunity.keywords.map((keyword) => <span key={keyword} title={keyword}>{truncateProductText(keyword, 18)}</span>)
                  ) : (
                    <span>키워드 추가 수집 필요</span>
                  )}
                </div>
                <div className="opportunity-evidence-grid">
                  {opportunity.evidenceLabels.map((label) => (
                    <span key={label} title={label}>{truncateProductText(label, 24)}</span>
                  ))}
                </div>
                <details className="product-opportunity-detail" data-testid="product-opportunity-detail">
                  <summary>
                    <span>근거 자세히 보기</span>
                    <ChevronDown size={16} aria-hidden="true" />
                  </summary>
                  <div className="product-opportunity-detail-body">
                    <div className="product-opportunity-detail-product">
                      <img src={opportunity.productImageUrl} alt={opportunity.productImageAlt} loading="lazy" />
                      <dl>
                        <div>
                          <dt>대상 상품</dt>
                          <dd>{opportunity.targetLabel}</dd>
                        </div>
                        <div>
                          <dt>제안 제목</dt>
                          <dd>{opportunity.title}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="product-opportunity-detail-grid">
                      <div>
                        <span>키워드 후보</span>
                        <ul>
                          {opportunity.keywords.length > 0 ? (
                            opportunity.keywords.map((keyword) => <li key={keyword}>{keyword}</li>)
                          ) : (
                            <li>키워드 추가 수집 필요</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <span>판단 근거</span>
                        <ul>
                          {opportunity.evidenceLabels.map((label) => <li key={label}>{label}</li>)}
                        </ul>
                      </div>
                      <div>
                        <span>수집 기록</span>
                        <ul>
                          {sourceReportLabels.map((label) => <li key={label}>{label}</li>)}
                        </ul>
                      </div>
                      <div>
                        <span>다음 액션</span>
                        <p>{opportunity.nextAction}</p>
                        <em>{opportunity.guardrail}</em>
                      </div>
                    </div>
                  </div>
                </details>
                <footer>
                  <strong>{opportunity.nextAction}</strong>
                  <span>{opportunity.guardrail}</span>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-panel">
          <Search size={18} aria-hidden="true" />
          <p>상품 집계와 키워드 수요가 함께 모이면 상품별 후보가 이곳에 올라옵니다.</p>
        </div>
      )}
    </section>
  );
}

function OpportunityIcon({ kindLabel }: { kindLabel: string }) {
  if (kindLabel === "마케팅 제안") {
    return <Megaphone size={18} aria-hidden="true" />;
  }

  if (kindLabel === "상품 발굴") {
    return <Package size={18} aria-hidden="true" />;
  }

  return <Search size={18} aria-hidden="true" />;
}

function truncateProductText(value: string, maxLength: number): string {
  const normalized = value.trim();
  const characters = [...normalized];

  if (characters.length <= maxLength) {
    return normalized;
  }

  return `${characters.slice(0, maxLength).join("").trimEnd()}...`;
}
