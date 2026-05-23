import type { ReactNode } from "react";
import { AlertTriangle, Clock3, MonitorSmartphone, Search, ShoppingBag, TrendingDown, TrendingUp } from "lucide-react";
import type {
  KeywordPerformanceDashboardView,
  KeywordPerformanceRowView,
  KeywordPerformanceSegmentView,
  ShoppingSearchTermView,
} from "@/features/agenda-room/types";

type KeywordPerformanceDashboardProps = {
  dashboard: KeywordPerformanceDashboardView;
};

export function KeywordPerformanceDashboard({ dashboard }: KeywordPerformanceDashboardProps) {
  return (
    <section className="keyword-performance-dashboard" aria-labelledby="keyword-performance-dashboard-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">그로 데스크</span>
          <h2 id="keyword-performance-dashboard-title">{dashboard.title}</h2>
          <p>{dashboard.summaryLabel}</p>
        </div>
        <div className="keyword-dashboard-meta" aria-label="성과 기준">
          <span>{dashboard.sourceLabel}</span>
          <span>{dashboard.updatedAtLabel}</span>
        </div>
      </div>

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
          rows={dashboard.topConversionKeywords}
          title="상위 전환 키워드 10개"
        />
        <KeywordRankPanel
          emptyMessage="충분한 클릭 기준을 통과한 하위 전환 키워드가 아직 없습니다."
          icon={<TrendingDown size={17} aria-hidden="true" />}
          rows={dashboard.lowConversionKeywords}
          title="하위 전환 키워드 10개"
        />
        <KeywordRankPanel
          emptyMessage="낭비 후보로 볼 키워드가 아직 없습니다."
          icon={<AlertTriangle size={17} aria-hidden="true" />}
          rows={dashboard.wasteKeywords}
          title="낭비 키워드"
        />
      </div>

      <div className="keyword-dashboard-grid compact">
        <KeywordSegmentPanel
          emptyMessage="기기별 성과 스냅샷이 아직 없습니다."
          icon={<MonitorSmartphone size={17} aria-hidden="true" />}
          rows={dashboard.deviceSegments}
          title="PC/모바일 성과"
        />
        <KeywordSegmentPanel
          emptyMessage="시간대별 성과 스냅샷이 아직 없습니다."
          icon={<Clock3 size={17} aria-hidden="true" />}
          rows={dashboard.timeSegments}
          title="시간대별 성과"
        />
      </div>

      <div className="keyword-dashboard-grid compact">
        <ShoppingSearchTermPanel rows={dashboard.shoppingSearchTerms} />
        <RecommendationEvidencePanel evidence={dashboard.recommendationEvidence} />
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
    <section className="keyword-dashboard-panel" aria-label="쇼핑검색광고 검색어">
      <header>
        <span>
          <ShoppingBag size={17} aria-hidden="true" />
          쇼핑검색광고 검색어
        </span>
        <small>{rows.length.toLocaleString("ko-KR")}건</small>
      </header>
      {rows.length > 0 ? (
        <div className="shopping-term-list">
          {rows.map((row) => (
            <article className={`shopping-term-row tone-${row.tone}`} key={row.id}>
              <img src={row.productImageUrl} alt={row.productImageAlt} loading="lazy" />
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

function RecommendationEvidencePanel({ evidence }: { evidence: KeywordPerformanceDashboardView["recommendationEvidence"] }) {
  return (
    <section className="keyword-dashboard-panel" aria-label="추천 키워드 근거">
      <header>
        <span>
          <Search size={17} aria-hidden="true" />
          추천 키워드 근거
        </span>
        <small>{evidence.length.toLocaleString("ko-KR")}건</small>
      </header>
      {evidence.length > 0 ? (
        <div className="keyword-evidence-list">
          {evidence.map((item) => (
            <article key={item.id}>
              <span>{item.sourceLabel}</span>
              <strong title={item.title}>{item.title}</strong>
              <p>{item.summary}</p>
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
