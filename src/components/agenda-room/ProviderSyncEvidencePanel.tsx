import { AlertTriangle, CheckCircle2, FileSearch, Lock } from "lucide-react";
import type { ProviderSyncEvidenceView } from "@/features/agenda-room/types";

type ProviderSyncEvidencePanelProps = {
  reports: ProviderSyncEvidenceView[];
  headingId?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
  showHistoryPolicy?: boolean;
};

export function ProviderSyncEvidencePanel({
  reports,
  headingId = "provider-sync-title",
  eyebrow = "실제 수집 근거",
  title = "연동 수집 결과",
  description = "각 안건이 어떤 읽기 전용 수집과 요약 자료에서 올라왔는지 대표가 바로 확인하는 영역입니다.",
  emptyMessage = "아직 저장된 연동 수집 기록이 없습니다. 읽기 전용 수집을 실행하면 이 영역에 근거가 쌓입니다.",
  showHistoryPolicy = false,
}: ProviderSyncEvidencePanelProps) {
  const channelGroups = buildProviderSyncChannelGroups(reports);

  return (
    <section className="provider-sync-section" aria-labelledby={headingId}>
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 id={headingId}>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {reports.length > 0 ? (
        <>
          <div className="provider-sync-view-switch" aria-label="연동 근거 보기 범위">
            <a href={`#${headingId}-all`}>
              전체
              <span>{reports.length.toLocaleString("ko-KR")}건</span>
            </a>
            {channelGroups.map((group) => (
              <a href={`#${headingId}-${group.id}`} key={group.id}>
                {group.label}
                <span>{group.reports.length.toLocaleString("ko-KR")}건</span>
              </a>
            ))}
          </div>

          <div className="provider-sync-scope" id={`${headingId}-all`}>
            <div className="provider-sync-scope-heading">
              <span>전체 근거</span>
              <strong>브랜드별 근거 확인</strong>
              <p>광고, 트렌드, 스티커씨 스마트스토어, 커피프린트 쇼핑몰 근거를 한 화면에서 보되 판단은 브랜드별로 분리합니다.</p>
            </div>
            <ProviderSyncCardGrid reports={reports} showHistoryPolicy={showHistoryPolicy} />
          </div>

          {channelGroups.length > 0 ? (
            <div className="provider-sync-channel-groups" aria-label="브랜드별 연동 근거">
              <div className="provider-sync-scope-heading">
                <span>구분 보기</span>
                <strong>브랜드별 상세</strong>
                <p>스티커씨와 커피프린트는 서로 비교하지 않고 각 브랜드의 판매채널과 근거만 따로 확인합니다.</p>
              </div>
              {channelGroups.map((group) => (
                <section className="provider-sync-channel-block" id={`${headingId}-${group.id}`} key={group.id}>
                  <header>
                    <div>
                      <span>{group.brandLabel ?? "채널"}</span>
                      <h3>{group.label}</h3>
                    </div>
                    <strong>{group.reports.length.toLocaleString("ko-KR")}건</strong>
                  </header>
                  <ProviderSyncCardGrid reports={group.reports} showHistoryPolicy={showHistoryPolicy} />
                </section>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty-panel">
          <FileSearch size={18} aria-hidden="true" />
          <p>{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}

function ProviderSyncCardGrid({
  reports,
  showHistoryPolicy = false,
}: {
  reports: ProviderSyncEvidenceView[];
  showHistoryPolicy?: boolean;
}) {
  return (
    <div className="provider-sync-grid">
      {reports.map((report) => (
        <article className={`provider-sync-card sync-${report.tone}`} key={report.id}>
          <header>
            <span className="provider-icon">
              <ProviderSyncIcon tone={report.tone} />
            </span>
            <div>
              <strong>{report.providerLabel}</strong>
              <span>{report.statusLabel}</span>
            </div>
          </header>
          <p>{report.label}</p>
          <div className="sync-status-row" aria-label={`${report.providerLabel} 동기화 상태`}>
            <span>{report.checkedAt}</span>
            <span>{report.httpStatusLabel}</span>
            <span>{report.readOnlyLabel}</span>
            <span>{report.networkLabel}</span>
            <span>{report.writeLabel}</span>
            <span>{report.evidenceCountLabel}</span>
          </div>
          <div className="sync-snapshot-list" aria-label={`${report.providerLabel} 요약 자료`}>
            {report.snapshotLabels.map((label, index) => (
              <span key={`${report.id}-snapshot-${index}-${label}`}>{label}</span>
            ))}
          </div>
          {showHistoryPolicy ? (
            <div className="sync-history-policy" aria-label={`${report.providerLabel} 조회 한계와 저장 기준`}>
              <span>{report.historyPolicy.apiLimitLabel}</span>
              <span>{report.historyPolicy.requestWindowLabel}</span>
              <span>{report.historyPolicy.dailySnapshotLabel}</span>
              <span>{report.historyPolicy.costGuardLabel}</span>
            </div>
          ) : null}
          {report.missingEnvKeys.length > 0 ? (
            <div className="missing-env-list" aria-label={`${report.providerLabel} 누락 환경변수`}>
              {report.missingEnvKeys.map((key) => (
                <code key={key}>{key}</code>
              ))}
            </div>
          ) : null}
          {report.failureReason ? <p className="sync-failure">{report.failureReason}</p> : null}
          <ul className="sync-note-list">
            {report.notes.map((note, index) => (
              <li key={`${report.id}-note-${index}-${note}`}>{note}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function buildProviderSyncChannelGroups(reports: ProviderSyncEvidenceView[]) {
  const groupedReports = new Map<string, ProviderSyncEvidenceView[]>();
  for (const report of reports) {
    groupedReports.set(report.channelKey, [...(groupedReports.get(report.channelKey) ?? []), report]);
  }

  return [...groupedReports.entries()].map(([id, groupReports]) => {
    const firstReport = groupReports[0]!;

    return {
      id,
      label: firstReport.channelLabel,
      brandLabel: firstReport.brandLabel,
      reports: groupReports,
    };
  });
}

function ProviderSyncIcon({ tone }: { tone: ProviderSyncEvidenceView["tone"] }) {
  if (tone === "ready") {
    return <CheckCircle2 size={18} aria-hidden="true" />;
  }

  if (tone === "warning") {
    return <Lock size={18} aria-hidden="true" />;
  }

  return <AlertTriangle size={18} aria-hidden="true" />;
}
