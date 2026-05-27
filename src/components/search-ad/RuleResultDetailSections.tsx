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
import {
  getRuleResultActionCandidate,
  getRuleResultActionPlan,
  getRuleResultContextBadges,
  getRuleResultDiagnosis,
  getRuleResultMetricBadges,
  getRuleResultPreApplyChecks,
  metricNumber,
} from "@/features/search-ad/domain/ruleResultPresentation";
import { truncateDisplayText } from "@/features/search-ad/domain/displayText";
import type { SearchAdRuleResultDetailView } from "@/features/search-ad/domain/types";
import { formatDateTime, formatWon, SearchTermTable } from "./SearchAdCards";

export function RuleResultDetailSummary({ view }: { view: SearchAdRuleResultDetailView }) {
  const { result } = view;
  const targetLabel = getRuleResultDisplayTargetLabel(result);
  const targetTypeLabel = getRuleResultDisplayTargetTypeLabel(result);
  const detailLabel = getRuleResultTargetDetailLabel(result);
  const creativeLabel = getRuleResultCreativeLabel(result);
  const landingLabel = getRuleResultLandingLabel(result);
  const rawTargetId = getRuleResultRawTargetId(result);
  const metricBadges = getRuleResultMetricBadges(result);
  const actionCandidate = getRuleResultActionCandidate(result);
  const contextBadges = getRuleResultContextBadges(result);
  const checks = getRuleResultPreApplyChecks(result);

  return (
    <section className="content-panel">
      <div className="section-heading">
        <div>
          <h2 title={targetLabel}>{truncateDisplayText(targetLabel, 46)}</h2>
          <p>{getRuleResultDiagnosis(result)}</p>
        </div>
        <span className={`severity severity-${result.severity}`}>{RULE_CATEGORY_LABELS[result.category]}</span>
      </div>

      <div className="metric-pill-row is-large" aria-label="핵심 성과">
        {metricBadges.map((badge) => (
          <span className="metric-pill" key={badge.label}>
            <span>{badge.label}</span>
            <strong>{badge.value}</strong>
          </span>
        ))}
      </div>

      <div className="recommendation-panel">
        <div>
          <span>조치 후보</span>
          <strong>{actionCandidate.label}</strong>
          <p>{actionCandidate.description}</p>
        </div>
        <div>
          <span>실행 전 확인</span>
          <ul>
            {checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
        </div>
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
        {contextBadges.map((badge) => (
          <div key={badge.label}>
            <dt>{badge.label}</dt>
            <dd>{badge.value}</dd>
          </div>
        ))}
        {creativeLabel ? (
          <div>
            <dt>소재</dt>
            <dd title={creativeLabel}>{truncateDisplayText(creativeLabel, 34)}</dd>
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

export function RuleResultActionPlanSection({ view }: { view: SearchAdRuleResultDetailView }) {
  const plan = getRuleResultActionPlan(view.result);

  return (
    <section className="content-panel">
      <div className="section-heading">
        <div>
          <h2>후보 처리 흐름</h2>
          <p>{plan.summary}</p>
        </div>
      </div>
      <div className="action-plan-grid">
        <article>
          <span>후보</span>
          <strong>{plan.title}</strong>
          <p>{plan.previewLabel}</p>
        </article>
        <article>
          <span>승인</span>
          <strong>{plan.approvalLabel}</strong>
          <p>{plan.delegationLabel}</p>
        </article>
        <article>
          <span>안전장치</span>
          <strong>외부 반영 전 확인</strong>
          <p>{plan.guardrail}</p>
        </article>
      </div>
      <ol className="action-plan-steps">
        {plan.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
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

function formatMaybeWon(value: number | undefined) {
  return value === undefined || value === null ? "-" : formatWon(value);
}

function formatCount(value: number | undefined, suffix: string) {
  return value === undefined ? "-" : `${Math.round(value).toLocaleString("ko-KR")}${suffix}`;
}

function formatPercent(value: number | undefined) {
  return value === undefined ? "-" : `${Math.round(value * 10) / 10}%`;
}
