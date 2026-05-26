import { getAdProductLabel, getBrandLabel, RULE_CATEGORY_LABELS } from "@/features/search-ad/domain/reportTypes";
import {
  getRuleResultConnectedTarget,
  getRuleResultCreativeLabel,
  getRuleResultDisplayTargetLabel,
  getRuleResultDisplayTargetTypeLabel,
  getRuleResultLandingLabel,
  getRuleResultPeriodLabel,
  getRuleResultRawTargetId,
  getRuleResultSourceReportLabel,
  getRuleResultTargetDetailLabel,
} from "@/features/search-ad/domain/targetDisplay";
import type { SearchAdRuleResult, SearchAdRuleResultDetailView } from "@/features/search-ad/domain/types";
import { formatDateTime, formatWon, SearchTermTable } from "./SearchAdCards";

export function RuleResultDetailSummary({ view }: { view: SearchAdRuleResultDetailView }) {
  const { result } = view;
  const targetLabel = getRuleResultDisplayTargetLabel(result);
  const targetTypeLabel = getRuleResultDisplayTargetTypeLabel(result);
  const detailLabel = getRuleResultTargetDetailLabel(result);
  const creativeLabel = getRuleResultCreativeLabel(result);
  const landingLabel = getRuleResultLandingLabel(result);
  const rawTargetId = getRuleResultRawTargetId(result);

  return (
    <section className="content-panel">
      <div className="section-heading">
        <div>
          <h2>{targetLabel}</h2>
          <p>{result.reason}</p>
        </div>
        <span className={`severity severity-${result.severity}`}>{RULE_CATEGORY_LABELS[result.category]}</span>
      </div>

      <div className="summary-grid compact">
        <MetricCard label="비용" value={formatMaybeWon(metricNumber(result, "cost"))} />
        <MetricCard label="클릭" value={formatCount(metricNumber(result, "clicks"), "회")} />
        <MetricCard label="전환" value={formatCount(metricNumber(result, "conversions"), "건")} />
        <MetricCard label="매출" value={formatMaybeWon(metricNumber(result, "salesAmount"))} />
        <MetricCard label="CPA" value={formatMaybeWon(metricNumber(result, "cpa"))} />
        <MetricCard label="ROAS" value={formatPercent(metricNumber(result, "roas"))} />
      </div>

      <dl className="detail-grid">
        <div>
          <dt>대상</dt>
          <dd>{targetTypeLabel}</dd>
        </div>
        <div>
          <dt>연결 위치</dt>
          <dd>{getRuleResultConnectedTarget(result)}</dd>
        </div>
        <div>
          <dt>브랜드</dt>
          <dd>{getBrandLabel(result.brandKey)}</dd>
        </div>
        <div>
          <dt>광고유형</dt>
          <dd>{getAdProductLabel(result.adProductType)}</dd>
        </div>
        <div>
          <dt>판단 기준</dt>
          <dd>{getRuleResultPeriodLabel(result)}</dd>
        </div>
        <div>
          <dt>근거 보고서</dt>
          <dd>{getRuleResultSourceReportLabel(result)}</dd>
        </div>
        <div>
          <dt>생성 시간</dt>
          <dd>{formatDateTime(result.createdAt) ?? result.createdAt}</dd>
        </div>
        {detailLabel ? (
          <div>
            <dt>세부 대상</dt>
            <dd>{detailLabel}</dd>
          </div>
        ) : null}
        {creativeLabel ? (
          <div>
            <dt>소재</dt>
            <dd>{creativeLabel}</dd>
          </div>
        ) : null}
        {landingLabel ? (
          <div>
            <dt>랜딩</dt>
            <dd className="text-break">{landingLabel}</dd>
          </div>
        ) : null}
      </dl>

      {rawTargetId ? (
        <details className="technical-details">
          <summary>원문 ID 보기</summary>
          <code>{rawTargetId}</code>
        </details>
      ) : null}
    </section>
  );
}

export function RuleResultEvidenceRows({ view }: { view: SearchAdRuleResultDetailView }) {
  return (
    <section className="content-panel">
      <div className="section-heading">
        <div>
          <h2>근거 성과 행</h2>
          <p>이 규칙 결과를 만든 보고서 행입니다. 같은 검색어라도 광고그룹과 소재가 다르면 별도로 봅니다.</p>
        </div>
      </div>
      <SearchTermTable rows={view.relatedRows} />
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function metricNumber(result: SearchAdRuleResult, key: string) {
  const value = result.metrics[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function formatMaybeWon(value: number | undefined) {
  return value === undefined || value === null ? "-" : formatWon(value);
}

function formatCount(value: number | undefined, suffix: string) {
  return value === undefined ? "-" : `${Math.round(value).toLocaleString("ko-KR")}${suffix}`;
}

function formatPercent(value: number | undefined) {
  return value === undefined ? "-" : `${Math.round(value * 10) / 10}%`;
}
