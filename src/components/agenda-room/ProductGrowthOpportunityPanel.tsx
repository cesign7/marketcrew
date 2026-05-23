import { Megaphone, Package, Search, ShieldCheck } from "lucide-react";
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
          {opportunities.map((opportunity) => (
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
                    <h3 tabIndex={0} title={opportunity.title}>{opportunity.title}</h3>
                    <span className="product-opportunity-title-popover" aria-hidden="true">{opportunity.title}</span>
                  </div>
                </div>
                <span className="confidence-pill">{opportunity.confidenceLabel}</span>
              </header>
              <p>{opportunity.summary}</p>
              <div className="target-label">
                <ShieldCheck size={15} aria-hidden="true" />
                <span>{opportunity.targetLabel}</span>
              </div>
              <div className="keyword-chips" aria-label={`${opportunity.title} 키워드 후보`}>
                {opportunity.keywords.length > 0 ? (
                  opportunity.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)
                ) : (
                  <span>키워드 추가 수집 필요</span>
                )}
              </div>
              <div className="opportunity-evidence-grid">
                {opportunity.evidenceLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <footer>
                <strong>{opportunity.nextAction}</strong>
                <span>{opportunity.guardrail}</span>
              </footer>
            </article>
          ))}
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
