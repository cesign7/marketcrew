import { getAdProductLabel, getBrandLabel } from "@/features/search-ad/domain/reportTypes";
import type { SearchAdKeywordInsightSegment, SearchAdKeywordInsightView } from "@/features/search-ad/domain/types";

type KeywordInsightDashboardProps = {
  view: SearchAdKeywordInsightView;
};

export function KeywordInsightDashboard({ view }: KeywordInsightDashboardProps) {
  return (
    <section className="page-stack">
      <div className="summary-grid">
        {view.summaryCards.map((card) => (
          <article className="summary-card" key={card.key}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.helper}</p>
          </article>
        ))}
      </div>

      <div className="content-panel">
        <div className="section-heading">
          <h2>판단 방식</h2>
          <p>네이버 공식 보고서 기준을 기준으로, 자동 실행 없이 분석 후보만 보여줍니다.</p>
        </div>
        <div className="rule-guide-grid">
          {view.methodology.map((item) => (
            <article key={item.title}>
              <span>{item.title}</span>
              <strong>{item.description}</strong>
            </article>
          ))}
        </div>
      </div>

      <KeywordInsightSection
        description="전환과 매출이 확인되고 표본 조건을 통과한 조합입니다. 비용 비중이 너무 작으면 바로 확장하지 말고 추가 관찰합니다."
        emptyText="아직 확장 후보로 볼 만큼 충분한 조합이 없습니다."
        segments={view.bestSegments}
        title="가장 효율 좋은 조합"
      />
      <KeywordInsightSection
        description="비용이나 클릭이 쌓였지만 전환 효율이 낮은 조합입니다. 입찰, 매체, 시간대 축소 후보로 봅니다."
        emptyText="현재 조건에서는 뚜렷한 축소 후보가 없습니다."
        segments={view.wasteSegments}
        title="낭비 가능성이 큰 조합"
      />
      <KeywordInsightSection
        description="표본이 작거나 판단이 갈리는 조합입니다. 바로 조정하지 않고 다음 수집 후 다시 봅니다."
        emptyText="관찰 후보가 없습니다."
        segments={view.watchSegments}
        title="관찰할 조합"
      />
    </section>
  );
}

function KeywordInsightSection({ description, emptyText, segments, title }: { description: string; emptyText: string; segments: SearchAdKeywordInsightSegment[]; title: string }) {
  return (
    <div className="content-panel">
      <div className="section-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="keyword-insight-list">
        {segments.map((segment) => (
          <KeywordInsightCard key={segment.id} segment={segment} />
        ))}
        {segments.length === 0 ? <p className="empty-state">{emptyText}</p> : null}
      </div>
    </div>
  );
}

function KeywordInsightCard({ segment }: { segment: SearchAdKeywordInsightSegment }) {
  return (
    <article className="keyword-insight-card">
      <div className="rule-card-kicker">
        <span className={`target-chip insight-recommendation-${segment.recommendation}`}>{segment.recommendationLabel}</span>
        <span className="target-chip">{getTargetKindLabel(segment)}</span>
        <span className="target-chip">{getBrandLabel(segment.brandKey)}</span>
        <span className="target-chip">{getAdProductLabel(segment.adProductType)}</span>
        <span className="target-chip">신뢰도 {getReliabilityLabel(segment.reliability)}</span>
      </div>
      <div className="keyword-insight-title-row">
        <strong title={segment.targetLabel}>{truncate(segment.targetLabel, 42)}</strong>
        <span>{segment.adgroupName ?? segment.campaignName ?? "연결 위치 확인 필요"}</span>
      </div>
      <div className="keyword-insight-axis">
        <span>{segment.deviceLabel}</span>
        <span>{segment.mediaLabel}</span>
        <span>{segment.hourLabel}</span>
        <span>{segment.regionLabel}</span>
      </div>
      <p>{segment.reason}</p>
      <div className="metric-pill-row" aria-label="핵심 성과">
        <Metric label="비용" value={formatWon(segment.cost)} />
        <Metric label="비용 비중" value={formatPercent(segment.costShare)} />
        <Metric label="클릭" value={`${segment.clicks.toLocaleString("ko-KR")}회`} />
        <Metric label="전환" value={`${segment.conversions.toLocaleString("ko-KR")}건`} />
        <Metric label="CPA" value={segment.cpa === null ? "-" : formatWon(segment.cpa)} />
        <Metric label="ROAS" value={segment.roas === null ? "-" : formatPercent(segment.roas)} />
      </div>
      <details className="rule-card-more">
        <summary>근거 보기</summary>
        <dl>
          <div>
            <dt>보고서</dt>
            <dd>{segment.reportsUsed.map(getReportLabel).join(", ")}</dd>
          </div>
          <div>
            <dt>수집 기간</dt>
            <dd>
              {segment.reportStartDate ?? "-"}~{segment.reportEndDate ?? "-"} · {segment.dataDays.toLocaleString("ko-KR")}일
            </dd>
          </div>
          <div>
            <dt>캠페인</dt>
            <dd>{segment.campaignName ?? "-"}</dd>
          </div>
          <div>
            <dt>광고그룹</dt>
            <dd>{segment.adgroupName ?? "-"}</dd>
          </div>
          <div>
            <dt>매체 성격</dt>
            <dd>{segment.mediaNetworkLabel ?? "-"}</dd>
          </div>
        </dl>
      </details>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="metric-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

function getReliabilityLabel(reliability: SearchAdKeywordInsightSegment["reliability"]) {
  const labels = {
    high: "높음",
    low: "낮음",
    medium: "중간",
  } satisfies Record<SearchAdKeywordInsightSegment["reliability"], string>;
  return labels[reliability];
}

function getReportLabel(reportType: string) {
  const labels: Record<string, string> = {
    AD_CONVERSION_DETAIL: "전환 상세 보고서",
    AD_DETAIL: "광고성과 상세 보고서",
    EXPKEYWORD: "파워링크 검색어 보고서",
    SHOPPINGKEYWORD_CONVERSION_DETAIL: "쇼핑검색 검색어 전환 상세 보고서",
    SHOPPINGKEYWORD_DETAIL: "쇼핑검색 검색어 상세 보고서",
  };
  return labels[reportType] ?? reportType;
}

function getTargetKindLabel(segment: SearchAdKeywordInsightSegment) {
  if (segment.targetKind === "search_term") {
    return "검색어";
  }
  if (segment.targetKind === "ad") {
    return segment.adProductType === "shopping_search" ? "상품 광고" : "광고 소재";
  }
  return "등록 키워드";
}

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}
