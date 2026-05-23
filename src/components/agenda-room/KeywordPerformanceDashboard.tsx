import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Clock3, FileText, Lightbulb, MonitorSmartphone, Search, ShoppingBag, TrendingDown, TrendingUp } from "lucide-react";
import type {
  KeywordDashboardBrandKey,
  KeywordPerformanceDashboardView,
  KeywordPerformanceRowView,
  KeywordPerformanceSegmentView,
  ShoppingSearchTermView,
} from "@/features/agenda-room/types";

type KeywordPerformanceDashboardProps = {
  dashboard: KeywordPerformanceDashboardView;
  selectedBrand?: KeywordDashboardBrandKey;
};

export function KeywordPerformanceDashboard({ dashboard, selectedBrand = "all" }: KeywordPerformanceDashboardProps) {
  const activeBrand = dashboard.brandViews?.[selectedBrand] ? selectedBrand : "all";
  const activeView = dashboard.brandViews?.[activeBrand] ?? dashboard;
  const inventoryCards = activeView.inventorySummaryCards ?? [];

  return (
    <section className="keyword-performance-dashboard" aria-labelledby="keyword-performance-dashboard-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">키워드 성과</span>
          <h2 id="keyword-performance-dashboard-title">{dashboard.title}</h2>
          <p>{activeView.summaryLabel}</p>
        </div>
        <div className="keyword-dashboard-meta" aria-label="성과 기준">
          <span>{dashboard.sourceLabel}</span>
          <span>{dashboard.updatedAtLabel}</span>
        </div>
      </div>

      {dashboard.brandTabs?.length ? (
        <nav className="keyword-dashboard-tabs" aria-label="브랜드 선택">
          {dashboard.brandTabs.map((tab) => (
            <Link
              aria-current={tab.id === activeBrand ? "page" : undefined}
              className={tab.id === activeBrand ? "is-active" : ""}
              href={tab.href}
              key={tab.id}
              prefetch={false}
              title={tab.summaryLabel}
            >
              <span>{tab.label}</span>
              <small>{tab.summaryLabel}</small>
            </Link>
          ))}
        </nav>
      ) : null}

      {inventoryCards.length > 0 ? (
        <div className="keyword-inventory-summary-grid" aria-label="검색광고 키워드 목록 요약">
          {inventoryCards.map((card) => (
            <article className={`keyword-inventory-summary-card tone-${card.tone}`} key={card.id}>
              <span>{card.label}</span>
              <strong>{card.valueLabel}</strong>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      ) : null}

      <section className="keyword-dashboard-guard" aria-label="충분한 클릭 기준">
        <strong>{dashboard.qualityGuardLabel}</strong>
        <div>
          {dashboard.minimumCriteriaLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </section>

      <div className="keyword-dashboard-grid">
        <KeywordRankPanel
          emptyMessage="충분한 클릭 기준을 통과한 전환 키워드가 아직 없습니다."
          icon={<TrendingUp size={17} aria-hidden="true" />}
          rows={activeView.topConversionKeywords}
          title="상위 전환 키워드 10개"
        />
        <KeywordRankPanel
          emptyMessage="충분한 클릭 기준을 통과한 하위 전환 키워드가 아직 없습니다."
          icon={<TrendingDown size={17} aria-hidden="true" />}
          rows={activeView.lowConversionKeywords}
          title="하위 전환 키워드 10개"
        />
        <KeywordRankPanel
          emptyMessage="낭비 후보로 볼 키워드가 아직 없습니다."
          icon={<AlertTriangle size={17} aria-hidden="true" />}
          rows={activeView.wasteKeywords}
          title="낭비 키워드"
        />
      </div>

      <div className="keyword-dashboard-grid compact">
        <KeywordSegmentPanel
          emptyMessage="기기별 성과 스냅샷이 아직 없습니다."
          icon={<MonitorSmartphone size={17} aria-hidden="true" />}
          rows={activeView.deviceSegments}
          title="PC/모바일 성과"
        />
        <KeywordSegmentPanel
          emptyMessage="시간대별 성과 스냅샷이 아직 없습니다."
          icon={<Clock3 size={17} aria-hidden="true" />}
          rows={activeView.timeSegments}
          title="시간대별 성과"
        />
      </div>

      <div className="keyword-dashboard-grid compact">
        <ShoppingSearchTermPanel rows={activeView.shoppingSearchTerms} />
        <RecommendationKeywordPanel candidates={activeView.recommendationKeywords} />
      </div>

      <div className="keyword-dashboard-grid single">
        <RecommendationEvidencePanel evidence={activeView.recommendationEvidence} />
      </div>
    </section>
  );
}

function KeywordRankPanel({
  title,
  rows,
  icon,
  emptyMessage,
}: {
  title: string;
  rows: KeywordPerformanceRowView[];
  icon: ReactNode;
  emptyMessage: string;
}) {
  return (
    <section className="keyword-dashboard-panel" aria-label={title}>
      <header>
        <span>
          {icon}
          {title}
        </span>
        <small>{rows.length.toLocaleString("ko-KR")}건</small>
      </header>
      {rows.length > 0 ? (
        <ol className="keyword-rank-list">
          {rows.map((row, index) => (
            <KeywordRankItem index={index} key={row.id} row={row} />
          ))}
        </ol>
      ) : (
        <p className="keyword-dashboard-empty">{emptyMessage}</p>
      )}
    </section>
  );
}

function KeywordRankItem({ row, index }: { row: KeywordPerformanceRowView; index: number }) {
  return (
    <li className={`keyword-rank-item tone-${row.tone}`}>
      <span className="keyword-rank-number">{index + 1}</span>
      <div className="keyword-rank-main">
        <strong title={row.keyword}>{row.keyword}</strong>
        <div className="keyword-rank-tags">
          <span>{row.brandLabel}</span>
          <span>{row.scopeLabel}</span>
        </div>
        <p>{row.noteLabel}</p>
      </div>
      <div className="keyword-rank-metrics" aria-label={`${row.keyword} 성과`}>
        <span>{row.conversionRateLabel}</span>
        <span>{row.clicksLabel}</span>
        <span>{row.ordersLabel}</span>
        <span>{row.costLabel}</span>
        <span>{row.cpaLabel}</span>
        <span>{row.roasLabel}</span>
      </div>
    </li>
  );
}

function KeywordSegmentPanel({
  title,
  rows,
  icon,
  emptyMessage,
}: {
  title: string;
  rows: KeywordPerformanceSegmentView[];
  icon: ReactNode;
  emptyMessage: string;
}) {
  return (
    <section className="keyword-dashboard-panel" aria-label={title}>
      <header>
        <span>
          {icon}
          {title}
        </span>
        <small>{rows.length.toLocaleString("ko-KR")}건</small>
      </header>
      {rows.length > 0 ? (
        <div className="keyword-segment-list">
          {rows.map((row) => (
            <article className={`keyword-segment-row tone-${row.tone}`} key={row.id}>
              <div>
                <strong title={row.keyword}>{row.keyword}</strong>
                <span>{row.brandLabel} · {row.segmentLabel}</span>
              </div>
              <div>
                <span>{row.conversionRateLabel}</span>
                <span>{row.clicksLabel}</span>
                <span>{row.ordersLabel}</span>
                <span>{row.costLabel}</span>
                <span>{row.cpaLabel}</span>
              </div>
              <p>{row.noteLabel}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="keyword-dashboard-empty">{emptyMessage}</p>
      )}
    </section>
  );
}

function ShoppingSearchTermPanel({ rows }: { rows: ShoppingSearchTermView[] }) {
  return (
    <section className="keyword-dashboard-panel" aria-label="쇼핑검색광고 점검 검색어">
      <header>
        <span>
          <ShoppingBag size={17} aria-hidden="true" />
          쇼핑검색광고 점검 검색어
        </span>
        <small>{rows.length.toLocaleString("ko-KR")}건</small>
      </header>
      <p className="keyword-dashboard-note">직접 전환율이 낮고 비용/클릭이 쌓인 검색어부터 보여줍니다.</p>
      {rows.length > 0 ? (
        <div className="shopping-term-list">
          {rows.map((row) => (
            <article className={`shopping-term-row tone-${row.tone}`} key={row.id}>
              <div className="shopping-term-thumb">
                <img src={row.productImageUrl} alt={row.productImageAlt} loading="lazy" />
                <span>{row.productImageSourceLabel}</span>
              </div>
              <div>
                <strong title={row.searchKeyword}>{row.searchKeyword}</strong>
                <span title={row.productName}>{row.productName}</span>
                <small>{row.campaignLabel}</small>
              </div>
              <div className="shopping-term-metrics">
                <span>{row.directConversionRateLabel}</span>
                <span>{row.clicksLabel}</span>
                <span>{row.costLabel}</span>
                <span>{row.landingFitLabel}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="keyword-dashboard-empty">쇼핑검색광고 검색어 성과가 아직 없습니다.</p>
      )}
    </section>
  );
}

function RecommendationKeywordPanel({ candidates }: { candidates: KeywordPerformanceDashboardView["recommendationKeywords"] }) {
  return (
    <section className="keyword-dashboard-panel" aria-label="추천 키워드 후보">
      <header>
        <span>
          <Lightbulb size={17} aria-hidden="true" />
          추천 키워드 후보
        </span>
        <small>{candidates.length.toLocaleString("ko-KR")}건</small>
      </header>
      {candidates.length > 0 ? (
        <div className="keyword-candidate-list">
          {candidates.map((candidate) => (
            <article className="keyword-candidate-card" key={candidate.id}>
              <span>{candidate.sourceLabel}</span>
              <strong title={candidate.keyword}>{candidate.keyword}</strong>
              <p>{candidate.reasonLabel}</p>
              <div>
                <small>{candidate.brandLabel}</small>
                {candidate.evidenceLabels.map((label) => (
                  <small key={`${candidate.id}-${label}`}>{label}</small>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="keyword-dashboard-empty">추천 후보로 정리된 키워드가 아직 없습니다.</p>
      )}
    </section>
  );
}

function RecommendationEvidencePanel({ evidence }: { evidence: KeywordPerformanceDashboardView["recommendationEvidence"] }) {
  return (
    <section className="keyword-dashboard-panel" aria-label="추천 판단 근거">
      <header>
        <span>
          <FileText size={17} aria-hidden="true" />
          추천 판단 근거
        </span>
        <small>{evidence.length.toLocaleString("ko-KR")}건</small>
      </header>
      <p className="keyword-dashboard-note">위 후보를 만든 검색 수요, 시즌 윈도우, 주문 원천을 분리해서 보여줍니다.</p>
      {evidence.length > 0 ? (
        <div className="keyword-evidence-list">
          {evidence.map((item) => (
            <article key={item.id}>
              <span>{item.sourceLabel}</span>
              <strong title={item.title}>{item.title}</strong>
              <p>{item.summary}</p>
              {item.sourceDetailLabel ? (
                <details className="keyword-source-detail">
                  <summary>
                    <Search size={14} aria-hidden="true" />
                    원천 보기
                  </summary>
                  <p>{item.sourceDetailLabel}</p>
                </details>
              ) : null}
              <div>
                {item.evidenceLabels.map((label) => (
                  <small key={`${item.id}-${label}`}>{label}</small>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="keyword-dashboard-empty">키워드 추천 근거가 아직 연결되지 않았습니다.</p>
      )}
    </section>
  );
}
