import { ALL_SEARCH_AD_REPORT_TYPES } from "@/features/search-ad/domain/reportRetention";
import { getAdProductLabel, getBrandLabel, getReportTypeGuide, getReportTypeLabel } from "@/features/search-ad/domain/reportTypes";
import { getNormalizedRowDisplayTarget } from "@/features/search-ad/domain/targetDisplay";
import type { SearchAdReportDetailView, SearchAdReportType } from "@/features/search-ad/domain/types";
import { formatWon } from "@/components/search-ad/SearchAdCards";

export function ReportSummaryPanel({ view }: { view: SearchAdReportDetailView }) {
  return (
    <section className="content-panel">
      <div className="section-heading">
        <h2>보고서 요약</h2>
        <p>
          {getReportTypeLabel(view.report.reportType)} · 기준일 {view.report.statDate} · 네이버 보고서 ID {view.report.providerReportJobId}
        </p>
      </div>
      <div className="summary-grid compact">
        <Metric label="비용" value={formatWon(view.summary.cost)} />
        <Metric label="클릭" value={`${view.summary.clicks.toLocaleString("ko-KR")}회`} />
        <Metric label="전환" value={`${view.summary.conversions.toLocaleString("ko-KR")}건`} />
        <Metric label="매출" value={formatWon(view.summary.salesAmount)} />
        <Metric label="CPA" value={view.summary.cpa === null ? "계산 불가" : formatWon(view.summary.cpa)} />
        <Metric label="ROAS" value={view.summary.roas === null ? "계산 불가" : `${view.summary.roas.toFixed(1)}%`} />
      </div>
    </section>
  );
}

export function ReportTypeGuidePanel({ reportType }: { reportType: SearchAdReportType }) {
  const guide = getReportTypeGuide(reportType);

  return (
    <section className="content-panel">
      <div className="section-heading">
        <h2>이 보고서 읽는 법</h2>
        <p>{getReportTypeLabel(reportType)}를 운영 판단에 쓰는 기준입니다.</p>
      </div>
      <div className="report-guide-detail">
        <article>
          <span>주로 보는 것</span>
          <strong>{guide.focus}</strong>
        </article>
        <article>
          <span>들어있는 항목</span>
          <strong>{guide.includes}</strong>
        </article>
        <article>
          <span>활용 방법</span>
          <strong>{guide.useFor}</strong>
        </article>
        <article>
          <span>주의할 점</span>
          <strong>{guide.caution}</strong>
        </article>
      </div>
    </section>
  );
}

export function ReportTypeGuideGrid({ reportTypes = ALL_SEARCH_AD_REPORT_TYPES }: { reportTypes?: SearchAdReportType[] }) {
  return (
    <section className="content-panel">
      <div className="section-heading">
        <h2>보고서 읽는 법</h2>
        <p>보고서마다 답하는 질문이 다릅니다. 파워링크와 쇼핑검색광고를 섞어 판단하지 않습니다.</p>
      </div>
      <div className="report-guide-grid">
        {reportTypes.map((reportType) => {
          const guide = getReportTypeGuide(reportType);

          return (
            <article className="report-guide-card" key={reportType}>
              <div>
                <span>{getReportTypeLabel(reportType)}</span>
                <strong>{guide.focus}</strong>
              </div>
              <dl>
                <div>
                  <dt>항목</dt>
                  <dd>{guide.includes}</dd>
                </div>
                <div>
                  <dt>활용</dt>
                  <dd>{guide.useFor}</dd>
                </div>
                <div>
                  <dt>주의</dt>
                  <dd>{guide.caution}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ReportEasyTable({ view }: { view: SearchAdReportDetailView }) {
  return (
    <section className="content-panel">
      <div className="section-heading">
        <h2>쉽게 보기</h2>
        <p>운영 판단에 필요한 필드만 한국어로 정리했습니다.</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>브랜드</th>
              <th>광고유형</th>
              <th>연결 대상</th>
              <th>캠페인</th>
              <th>광고그룹</th>
              <th>비용</th>
              <th>클릭</th>
              <th>전환</th>
              <th>매출</th>
            </tr>
          </thead>
          <tbody>
            {view.easyRows.map((row) => (
              <tr key={row.id}>
                <td>{getBrandLabel(row.brandKey)}</td>
                <td>{getAdProductLabel(row.adProductType)}</td>
                <td>{getNormalizedRowDisplayTarget(row)}</td>
                <td>{row.campaignName ?? "-"}</td>
                <td>{row.adgroupName ?? "-"}</td>
                <td>{formatWon(row.cost)}</td>
                <td>{row.clicks.toLocaleString("ko-KR")}회</td>
                <td>{row.conversions.toLocaleString("ko-KR")}건</td>
                <td>{formatWon(row.salesAmount)}</td>
              </tr>
            ))}
            {view.easyRows.length === 0 ? (
              <tr>
                <td colSpan={9}>정규화된 행이 없습니다.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RawReportPreview({ view }: { view: SearchAdReportDetailView }) {
  return (
    <section className="content-panel">
      <div className="section-heading">
        <h2>원본 보기</h2>
        <p>네이버 보고서 원문을 행 단위 JSON으로 보관합니다. 화면에서는 첫 100행만 미리 보여줍니다.</p>
      </div>
      <div className="raw-list">
        {view.rawPreviewRows.map((row) => (
          <pre key={row.id}>
            <code>{JSON.stringify(row.rawRow, null, 2)}</code>
          </pre>
        ))}
        {view.rawPreviewRows.length === 0 ? <p className="empty-text">표시할 원본 행이 없습니다.</p> : null}
      </div>
    </section>
  );
}

export function ColumnDescriptionTable({ view }: { view: SearchAdReportDetailView }) {
  return (
    <section className="content-panel">
      <div className="section-heading">
        <h2>컬럼 설명</h2>
        <p>원문 필드를 대표가 이해하기 쉬운 이름으로 풀어 표시합니다.</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>원문 필드</th>
              <th>화면 이름</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            {view.columnDescriptions.map((column) => (
              <tr key={column.field}>
                <td>{column.field}</td>
                <td>{column.label}</td>
                <td>{column.description}</td>
              </tr>
            ))}
            {view.columnDescriptions.length === 0 ? (
              <tr>
                <td colSpan={3}>컬럼 설명이 아직 준비되지 않았습니다.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
