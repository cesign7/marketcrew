import Link from "next/link";
import { buildSearchAdFilterHref } from "@/features/search-ad/domain/filterLinks";
import { RULE_ACTION_INTENTS, getRuleActionIntentLabel } from "@/features/search-ad/domain/ruleActionIntents";
import { getSearchAdReportScheduleStatus } from "@/features/search-ad/domain/reportSchedule";
import { getAdProductLabel, getBrandLabel, getReportTypeLabel, RULE_CATEGORY_LABELS } from "@/features/search-ad/domain/reportTypes";
import { groupRuleResultsForDisplay } from "@/features/search-ad/domain/ruleResultGrouping";
import {
  getRuleResultCreativeLabel,
  getNormalizedRowDisplayTarget,
  getRuleResultConnectedTarget,
  getRuleResultDisplayTargetLabel,
  getRuleResultDisplayTargetTypeLabel,
  getRuleResultDetailHref,
  getRuleResultLandingLabel,
  getRuleResultPeriodLabel,
  getRuleResultProductConnection,
  getRuleResultRawTargetId,
  getRuleResultSourceReportLabel,
  getRuleResultTargetDetailLabel,
  getSearchAdDeviceLabel,
} from "@/features/search-ad/domain/targetDisplay";
import {
  getRuleResultActionCandidate,
  getRuleResultContextBadges,
  getRuleResultDiagnosis,
  getRuleResultMetricBadges,
} from "@/features/search-ad/domain/ruleResultPresentation";
import { truncateDisplayText } from "@/features/search-ad/domain/displayText";
import type {
  RuleActionIntentFilter,
  SearchAdActionLogsView,
  SearchAdNormalizedRow,
  SearchAdOperationsView,
  SearchAdReportJobRecord,
  SearchAdFilters,
  SearchAdRuleResult,
  SearchAdRuleResultFilters,
  SearchAdStateRecord,
} from "@/features/search-ad/domain/types";

export function SyncStatusStrip({ view }: { view: { syncStatus: SearchAdOperationsView["syncStatus"] } }) {
  const reportSchedule = view.syncStatus.reportSchedule ?? getSearchAdReportScheduleStatus();

  return (
    <section className="status-strip" aria-label="수집 상태">
      <div>
        <span>보고서 수집</span>
        <strong>{formatDateTime(view.syncStatus.lastReportSyncAt) ?? "대기"}</strong>
      </div>
      <div>
        <span>상태 수집</span>
        <strong>{formatDateTime(view.syncStatus.lastStateSyncAt) ?? "대기"}</strong>
      </div>
      <div>
        <span>다음 보고서</span>
        <strong title={reportSchedule.nextRunAt}>{reportSchedule.nextRunLabel}</strong>
      </div>
      <div>
        <span>API 설정</span>
        <strong>{view.syncStatus.hasSearchAdCredentials ? "연결 가능" : "설정 필요"}</strong>
      </div>
      <div>
        <span>실제 변경</span>
        <strong>{view.syncStatus.searchAdWriteEnabled ? "허용됨" : "차단됨"}</strong>
      </div>
    </section>
  );
}

export function SummaryCards({ cards }: { cards: SearchAdOperationsView["summaryCards"] }) {
  return (
    <section className="summary-grid" aria-label="운영 요약">
      {cards.map((card) => (
        <article className="summary-card" key={card.key}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <p>{card.helper}</p>
        </article>
      ))}
    </section>
  );
}

export function BrandSummaryTable({ view }: { view: SearchAdOperationsView }) {
  return (
    <section className="content-panel">
      <div className="section-heading">
        <h2>브랜드별 운영 현황</h2>
        <p>전체는 비교 랭킹이 아니라 각 브랜드의 운영 상태를 나란히 확인하는 용도입니다.</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>브랜드</th>
              <th>보고서</th>
              <th>저효율</th>
              <th>우수</th>
              <th>최근 비용</th>
            </tr>
          </thead>
          <tbody>
            {view.brandSummaries.map((brand) => (
              <tr key={brand.brandKey}>
                <td>{brand.brandLabel}</td>
                <td>{brand.reportCount}건</td>
                <td>{brand.lowEfficiencyCount}건</td>
                <td>{brand.goodPerformanceCount}건</td>
                <td>{formatWon(brand.recentCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ReportListTable({ filters, reports }: { filters?: SearchAdFilters; reports: SearchAdReportJobRecord[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>기준일</th>
            <th>보고서</th>
            <th>네이버 ID</th>
            <th>상태</th>
            <th>행 수</th>
            <th>브랜드</th>
            <th>요약</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td>{report.statDate}</td>
              <td>
                <a className="table-link" href={buildSearchAdFilterHref(`/reports/${report.id}`, filters)}>
                  {getReportTypeLabel(report.reportType)}
                </a>
              </td>
              <td>{report.providerReportJobId}</td>
              <td>{report.parseStatus}</td>
              <td>{report.rowCount.toLocaleString("ko-KR")}</td>
              <td>{report.mappedBrands.length ? report.mappedBrands.map(getBrandLabel).join(", ") : "매핑 필요"}</td>
              <td>
                비용 {formatWon(report.summary.cost)} · 클릭 {report.summary.clicks.toLocaleString("ko-KR")}회 · 전환{" "}
                {report.summary.conversions.toLocaleString("ko-KR")}건
              </td>
            </tr>
          ))}
          {reports.length === 0 ? (
            <tr>
              <td colSpan={7}>아직 수집된 보고서가 없습니다.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function RuleResultActionTabs({ filters }: { filters: SearchAdRuleResultFilters }) {
  const tabs: Array<{ key: RuleActionIntentFilter; label: string }> = [
    { key: "all", label: "전체" },
    ...RULE_ACTION_INTENTS.map((intent) => ({ key: intent.key, label: getRuleActionIntentLabel(intent.key) })),
  ];

  return (
    <nav className="filter-group rule-action-filter" aria-label="조치 후보별 보기">
      <span>조치 후보</span>
      {tabs.map((tab) => (
        <Link
          aria-current={filters.actionIntent === tab.key ? "page" : undefined}
          className={filters.actionIntent === tab.key ? "is-active" : ""}
          href={withRuleResultFilters(filters, tab.key)}
          key={tab.key}
          prefetch={false}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function RuleResultList({ results }: { results: SearchAdRuleResult[] }) {
  const groups = groupRuleResultsForDisplay(results);

  return (
    <div className="card-list">
      {groups.map((group) => {
        const result = group.result;
        const rawTargetId = getRuleResultRawTargetId(result);
        const targetLabel = getRuleResultDisplayTargetLabel(result);
        const targetTypeLabel = getRuleResultDisplayTargetTypeLabel(result);
        const targetDetailLabel = getRuleResultTargetDetailLabel(result);
        const creativeLabel = getRuleResultCreativeLabel(result);
        const landingLabel = getRuleResultLandingLabel(result);
        const productConnection = getRuleResultProductConnection(result);
        const showProductConnection = result.adProductType === "shopping_search" && productConnection.hasConnection;
        const coverageLabel = getCoverageDecisionLabel(result);
        const metricBadges = getRuleResultMetricBadges(result);
        const actionCandidate = getRuleResultActionCandidate(result);
        const contextBadges = getRuleResultContextBadges(result);
        const shortTargetLabel = truncateDisplayText(targetLabel, result.adProductType === "shopping_search" ? 32 : 38);
        return (
          <article className="rule-card" key={group.id}>
            <div className="rule-card-header">
              <div className="rule-card-title-group">
                <div className="rule-card-kicker">
                  <span className={`severity severity-${result.severity}`}>{RULE_CATEGORY_LABELS[result.category]}</span>
                  <span className="target-chip">{targetTypeLabel}</span>
                  <span className="target-chip">{getBrandLabel(result.brandKey)}</span>
                  <span className="target-chip">{getAdProductLabel(result.adProductType)}</span>
                  <span className="target-chip action-chip">{actionCandidate.label}</span>
                  {group.results.length > 1 ? <span className="target-chip split-chip">합산 {group.results.length.toLocaleString("ko-KR")}건</span> : null}
                </div>
                <Link className="rule-card-title" href={getRuleResultDetailHref(result)} title={targetLabel}>
                  {shortTargetLabel}
                </Link>
              </div>
            </div>
            <p className="rule-card-diagnosis">{getRuleResultDiagnosis(result)}</p>
            {group.breakdowns.length > 1 ? <RuleResultBreakdownPanel group={group} /> : null}
            {showProductConnection ? (
              <div className="product-connection is-compact">
                {productConnection.imageUrl ? (
                  <img alt="" loading="lazy" src={productConnection.imageUrl} />
                ) : (
                  <span className="product-image-fallback">상품</span>
                )}
                <div>
                  <span>연결 상품</span>
                  <strong title={productConnection.productName ?? "상품명 확인 필요"}>
                    {truncateDisplayText(productConnection.productName ?? "상품명 확인 필요", 30)}
                  </strong>
                  {productConnection.landingLabel ? (
                    <small title={productConnection.landingLabel}>{truncateDisplayText(productConnection.landingLabel, 46)}</small>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div className="metric-pill-row" aria-label="핵심 성과">
              {metricBadges.map((badge) => (
                <span className="metric-pill" key={`${result.id}-${badge.label}`}>
                  <span>{badge.label}</span>
                  <strong>{badge.value}</strong>
                </span>
              ))}
            </div>
            <p className="rule-card-action">조치 후보: {actionCandidate.description}</p>
            <dl>
              <div>
                <dt>연결 위치</dt>
                <dd title={getRuleResultConnectedTarget(result)}>{truncateDisplayText(getRuleResultConnectedTarget(result), 30)}</dd>
              </div>
              <div>
                <dt>근거 보고서</dt>
                <dd>{getRuleResultSourceReportLabel(result)}</dd>
              </div>
              <div>
                <dt>판단 기준</dt>
                <dd>{getRuleResultPeriodLabel(result)}</dd>
              </div>
              {coverageLabel ? (
                <div>
                  <dt>판단 상태</dt>
                  <dd>{coverageLabel}</dd>
                </div>
              ) : null}
              {targetDetailLabel ? (
                <div>
                  <dt>세부 대상</dt>
                  <dd>{targetDetailLabel}</dd>
                </div>
              ) : null}
              {contextBadges.map((badge) => (
                <div key={`${result.id}-${badge.label}`}>
                  <dt>{badge.label}</dt>
                  <dd>{badge.value}</dd>
                </div>
              ))}
              {creativeLabel ? (
                <div>
                  <dt>소재</dt>
                  <dd title={creativeLabel}>{truncateDisplayText(creativeLabel, 30)}</dd>
                </div>
              ) : null}
              {landingLabel ? (
                <div>
                  <dt>랜딩</dt>
                  <dd className="text-clip" title={landingLabel}>
                    {landingLabel}
                  </dd>
                </div>
              ) : null}
            </dl>
            {rawTargetId ? (
              <details className="technical-details">
                <summary>원문 ID 보기</summary>
                <code>{rawTargetId}</code>
              </details>
            ) : null}
          </article>
        );
      })}
      {results.length === 0 ? <p className="empty-text">해당 조건에 걸린 규칙 결과가 없습니다.</p> : null}
    </div>
  );
}

function RuleResultBreakdownPanel({ group }: { group: ReturnType<typeof groupRuleResultsForDisplay>[number] }) {
  const visibleBreakdowns = group.breakdowns.slice(0, 6);
  const hiddenCount = Math.max(0, group.breakdowns.length - visibleBreakdowns.length);

  return (
    <section className="rule-breakdown-panel" aria-label="세부 분해">
      <div className="rule-breakdown-heading">
        <div>
          <strong>세부 분해</strong>
          <span>
            기기 {Math.max(group.deviceCount, 1).toLocaleString("ko-KR")}개 · 매체 {Math.max(group.mediaCount, 1).toLocaleString("ko-KR")}개 · 근거{" "}
            {group.sourceRowCount.toLocaleString("ko-KR")}행
          </span>
        </div>
        <span className="rule-breakdown-badge">합산 카드</span>
      </div>
      <div className="rule-breakdown-list">
        {visibleBreakdowns.map((item) => (
          <Link className="rule-breakdown-row" href={getRuleResultDetailHref(item.result)} key={item.id} prefetch={false}>
            <span className="rule-breakdown-name">
              <strong>{item.label}</strong>
              <small>상세 근거 보기</small>
            </span>
            <span>
              <small>클릭</small>
              <strong>{formatCount(item.clicks, "회")}</strong>
            </span>
            <span>
              <small>전환</small>
              <strong>{formatCount(item.conversions, "건")}</strong>
            </span>
            <span>
              <small>전환율</small>
              <strong>{formatPercent(item.conversionRate)}</strong>
            </span>
            <span>
              <small>비용</small>
              <strong>{formatWon(item.cost)}</strong>
            </span>
            <span>
              <small>ROAS</small>
              <strong>{formatPercent(item.roas)}</strong>
            </span>
          </Link>
        ))}
      </div>
      {hiddenCount > 0 ? <p className="rule-breakdown-more">나머지 {hiddenCount.toLocaleString("ko-KR")}개 세부 근거는 상세 화면에서 확인합니다.</p> : null}
    </section>
  );
}

function withRuleResultFilters(filters: SearchAdRuleResultFilters, actionIntent: RuleActionIntentFilter) {
  const params = new URLSearchParams();
  params.set("brand", filters.brand);
  params.set("adProduct", filters.adProduct);
  if (actionIntent !== "all") {
    params.set("actionIntent", actionIntent);
  }
  return `/rule-results?${params.toString()}`;
}

export function StateRecordTable({ records, title, description }: { records: SearchAdStateRecord[]; title: string; description: string }) {
  return (
    <section className="content-panel">
      <div className="section-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>브랜드</th>
              <th>광고유형</th>
              <th>현재 상태</th>
              <th>입찰</th>
              <th>일예산</th>
              <th>수집 시간</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>
                  <span className="text-clip" title={record.name}>
                    {truncateDisplayText(record.name, 34)}
                  </span>
                </td>
                <td>{record.brandKey ? getBrandLabel(record.brandKey) : "매핑 필요"}</td>
                <td>{record.adProductType ? getAdProductLabel(record.adProductType) : "매핑 필요"}</td>
                <td>{formatLockState(record.userLock)} · {record.statusReason ?? record.status ?? "상태 없음"}</td>
                <td>{record.bidAmount == null ? "-" : formatWon(record.bidAmount)}</td>
                <td>{record.dailyBudget == null ? "-" : formatWon(record.dailyBudget)}</td>
                <td>{formatDateTime(record.collectedAt) ?? "-"}</td>
              </tr>
            ))}
            {records.length === 0 ? (
              <tr>
                <td colSpan={7}>아직 수집된 상태 스냅샷이 없습니다.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SearchTermTable({ rows }: { rows: SearchAdNormalizedRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>검색어/대상</th>
            <th>브랜드</th>
            <th>광고유형</th>
            <th>기기</th>
            <th>캠페인</th>
            <th>광고그룹</th>
            <th>비용</th>
            <th>클릭</th>
            <th>전환</th>
            <th>CPA</th>
            <th>ROAS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const cpa = row.conversions > 0 ? row.cost / row.conversions : null;
            const roas = row.cost > 0 ? (row.salesAmount / row.cost) * 100 : null;
            const displayTarget = getNormalizedRowDisplayTarget(row);
            return (
              <tr key={row.id}>
                <td>
                  <span className="text-clip" title={displayTarget}>
                    {truncateDisplayText(displayTarget, 34)}
                  </span>
                </td>
                <td>{getBrandLabel(row.brandKey)}</td>
                <td>{getAdProductLabel(row.adProductType)}</td>
                <td>{getSearchAdDeviceLabel(row.device) ?? "-"}</td>
                <td>{row.campaignName ?? "-"}</td>
                <td>{row.adgroupName ?? "-"}</td>
                <td>{formatWon(row.cost)}</td>
                <td>{row.clicks.toLocaleString("ko-KR")}회</td>
                <td>{row.conversions.toLocaleString("ko-KR")}건</td>
                <td>{cpa === null ? "-" : formatWon(cpa)}</td>
                <td>{roas === null ? "-" : `${Math.round(roas * 10) / 10}%`}</td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={11}>검색어 성과 데이터가 없습니다.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function PendingActionList({ actions }: { actions: SearchAdOperationsView["pendingActions"] }) {
  return (
    <div className="card-list">
      {actions.map((action) => (
        <article className="rule-card" key={action.id}>
          <div>
            <span className="severity severity-medium">{action.statusLabel}</span>
            <strong>{action.targetLabel}</strong>
          </div>
          <p>{action.actionLabel}</p>
        </article>
      ))}
      {actions.length === 0 ? <p className="empty-text">대기 중인 실행 미리보기가 없습니다.</p> : null}
    </div>
  );
}

export function ActionLogsPanel({ view }: { view: SearchAdActionLogsView }) {
  return (
    <div className="card-list">
      {view.previews.map((preview) => (
        <article className="rule-card" key={preview.id}>
          <div className="rule-card-header">
            <span className={`severity ${preview.writeGateOpen ? "severity-low" : "severity-medium"}`}>{preview.writeGateOpen ? "실행 가능" : "실제 변경 차단"}</span>
            <strong>{preview.targetLabel}</strong>
          </div>
          <p>{preview.impactSummary.expectedEffect}</p>
          <dl>
            <div>
              <dt>대상</dt>
              <dd>{getActionTargetTypeLabel(preview.targetType)}</dd>
            </div>
            <div>
              <dt>요청</dt>
              <dd>{preview.requestedAction === "turn_on" ? "켜기" : "끄기"}</dd>
            </div>
            <div>
              <dt>최근 비용</dt>
              <dd>{formatWon(preview.impactSummary.recentCost)}</dd>
            </div>
            <div>
              <dt>최근 클릭</dt>
              <dd>{preview.impactSummary.recentClicks.toLocaleString("ko-KR")}회</dd>
            </div>
            <div>
              <dt>최근 전환</dt>
              <dd>{preview.impactSummary.recentConversions.toLocaleString("ko-KR")}건</dd>
            </div>
            <div>
              <dt>생성 시간</dt>
              <dd>{formatDateTime(preview.createdAt)}</dd>
            </div>
          </dl>
        </article>
      ))}
      {view.logs.map((log) => (
        <article className="rule-card" key={log.id}>
          <div className="rule-card-header">
            <span className={`severity severity-${log.status === "blocked" ? "medium" : log.status === "applied" ? "low" : "high"}`}>{log.status === "blocked" ? "차단" : log.status === "applied" ? "반영" : "실패"}</span>
            <strong>{log.targetLabel}</strong>
          </div>
          <p>{log.reason}</p>
          <dl>
            <div>
              <dt>대상</dt>
              <dd>{getActionTargetTypeLabel(log.targetType)}</dd>
            </div>
            <div>
              <dt>요청</dt>
              <dd>{log.requestedAction === "turn_on" ? "켜기" : "끄기"}</dd>
            </div>
            <div>
              <dt>이력 시간</dt>
              <dd>{formatDateTime(log.createdAt)}</dd>
            </div>
          </dl>
        </article>
      ))}
      {view.previews.length + view.logs.length === 0 ? <p className="empty-text">실행 미리보기와 실행 이력이 없습니다.</p> : null}
    </div>
  );
}

function getActionTargetTypeLabel(targetType: SearchAdActionLogsView["previews"][number]["targetType"]) {
  if (targetType === "campaign") {
    return "캠페인";
  }
  if (targetType === "adgroup") {
    return "광고그룹";
  }
  return "키워드";
}

export function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatCount(value: number, suffix: string) {
  return `${Math.round(value).toLocaleString("ko-KR")}${suffix}`;
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }
  return `${Math.round(value * 10) / 10}%`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function formatLockState(value: boolean | null) {
  if (value === true) {
    return "꺼짐";
  }

  if (value === false) {
    return "켜짐";
  }

  return "확인 필요";
}

function getCoverageDecisionLabel(result: SearchAdRuleResult) {
  const warningLabel = stringFromEvidence(result.evidencePacket.coverageWarningLabel);
  const actualDays = numberFromEvidence(result.evidencePacket.actualDataDays);
  const criteriaDays = numberFromEvidence(result.evidencePacket.criteriaPeriodDays) ?? result.periodDays;
  if (!warningLabel) {
    return undefined;
  }

  if (actualDays === undefined) {
    return warningLabel;
  }

  return `${warningLabel} · 기준 ${actualDays.toLocaleString("ko-KR")}/${criteriaDays.toLocaleString("ko-KR")}일`;
}

function stringFromEvidence(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberFromEvidence(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
