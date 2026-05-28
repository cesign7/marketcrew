import { MarketingShell } from "@/components/layout/MarketingShell";
import { ReportBackfillPanel } from "@/components/search-ad/ReportBackfillPanel";
import { getSearchAdReportScheduleStatus } from "@/features/search-ad/domain/reportSchedule";
import { DEFAULT_SEARCH_AD_FILTERS } from "@/features/search-ad/domain/sampleData";
import { loadSearchAdOperationsView } from "@/features/search-ad/loadSearchAdViews";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const view = await loadSearchAdOperationsView(DEFAULT_SEARCH_AD_FILTERS);
  const reportSchedule = view.syncStatus.reportSchedule ?? getSearchAdReportScheduleStatus();

  return (
    <MarketingShell activePath="/settings" description="검색광고 연결, 실행 권한, 보고서 보관 상태를 관리합니다." title="설정">
      <section className="page-stack">
        <div className="content-panel">
          <div className="section-heading">
            <h2>검색광고 연결</h2>
            <p>API 키와 실제 변경 권한은 서버 환경변수로만 관리합니다.</p>
          </div>
          <div className="settings-grid">
            <article>
              <span>API 설정</span>
              <strong>{view.syncStatus.hasSearchAdCredentials ? "연결 가능" : "설정 필요"}</strong>
              <p>브라우저에는 API 키와 비밀값을 표시하지 않습니다.</p>
            </article>
            <article>
              <span>실제 변경 권한</span>
              <strong>{view.syncStatus.searchAdWriteEnabled ? "허용됨" : "차단됨"}</strong>
              <p>기본값은 차단입니다. 켜기/끄기 요청도 먼저 미리보기와 로그를 남깁니다.</p>
            </article>
            <article>
              <span>저장소</span>
              <strong>{view.syncStatus.repositoryMode === "db" ? "DB" : "샘플"}</strong>
              <p>로컬 개발에서는 DB 오류 시 샘플 화면으로 확인하고, 운영 백엔드는 실패를 닫습니다.</p>
            </article>
            <article>
              <span>자동 저장</span>
              <strong>{reportSchedule.nextRunLabel}</strong>
              <p>
                {reportSchedule.primaryRunLabel} 1차 저장, {reportSchedule.retryRunLabel} 재확인. 기준일은 {reportSchedule.targetStatDate}입니다.
              </p>
            </article>
          </div>
        </div>
        <ReportBackfillPanel />
      </section>
    </MarketingShell>
  );
}
