import { ClipboardCheck, FileSearch } from "lucide-react";
import type { OutcomeReportHistoryView } from "@/features/approvals/buildApprovalDetailViewModel";

type OutcomeReportHistoryPanelProps = {
  reports: OutcomeReportHistoryView[];
};

export function OutcomeReportHistoryPanel({ reports }: OutcomeReportHistoryPanelProps) {
  return (
    <section className="outcome-history-section" aria-labelledby="outcome-history-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">성과 보고 이력</span>
          <h2 id="outcome-history-title">저장된 성과 보고</h2>
          <p>대표 결정 이후 저장된 성과 보고를 다시 읽어 기준선, 체크포인트, 연동 근거를 확인합니다.</p>
        </div>
      </div>

      {reports.length > 0 ? (
        <div className="outcome-history-list">
          {reports.map((report) => (
            <article className={`outcome-history-card outcome-${report.stateTone}`} key={report.id}>
              <header className="outcome-history-header">
                <div>
                  <span className="status-pill">
                    <ClipboardCheck size={14} aria-hidden="true" />
                    {report.stateLabel}
                  </span>
                  <h3>{report.summary}</h3>
                </div>
                <span>{report.createdAt}</span>
              </header>

              <div className="outcome-history-grid">
                <div>
                  <strong>기준선</strong>
                  <p>{report.baselineSummary}</p>
                </div>
                <div>
                  <strong>체크포인트</strong>
                  <p>{report.checkpointSummary}</p>
                </div>
              </div>

              {report.evidenceLabels.length > 0 ? (
                <div className="outcome-evidence-list" aria-label={`${report.id} 성과 근거`}>
                  {report.evidenceLabels.map((label) => (
                    <span key={`${report.id}-${label}`}>{label}</span>
                  ))}
                </div>
              ) : null}

              {report.sourceReportIds.length > 0 ? (
                <div className="outcome-source-row" aria-label={`${report.id} 연동 수집 기록 ID`}>
                  {report.sourceReportIds.map((id) => (
                    <code key={id}>{id}</code>
                  ))}
                </div>
              ) : null}

              {report.followUpAgendaTitle ? <p className="outcome-followup">{report.followUpAgendaTitle}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <FileSearch size={18} aria-hidden="true" />
          <p>아직 저장된 성과 보고가 없습니다. 대표 결정을 처리하면 이곳에 쌓입니다.</p>
        </div>
      )}
    </section>
  );
}
