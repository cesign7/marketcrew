import { MarketingShell } from "@/components/layout/MarketingShell";
import { BrandSummaryTable, PendingActionList, ReportListTable, RuleResultList, SummaryCards, SyncStatusStrip } from "@/components/search-ad/SearchAdCards";
import { loadSearchAdOperationsView, parseSearchAdFilters } from "@/features/search-ad/loadSearchAdViews";

type OperationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function OperationsPage({ searchParams }: OperationsPageProps) {
  const filters = parseSearchAdFilters(await searchParams);
  const view = await loadSearchAdOperationsView(filters);

  return (
    <MarketingShell
      activePath="/operations"
      description="전일 보고서와 현재 광고 상태를 기준으로 커피프린트와 스티커씨를 분리 운영합니다."
      filters={filters}
      title="검색광고 운영 홈"
    >
      <div className="page-stack">
        <SyncStatusStrip view={view} />
        <SummaryCards cards={view.summaryCards} />
        <BrandSummaryTable view={view} />

        <section className="content-panel">
          <div className="section-heading">
            <h2>최근 보고서</h2>
            <p>네이버 보고서 원본을 보관하고 쉽게 볼 수 있게 정리합니다.</p>
          </div>
          <ReportListTable reports={view.recentReports} />
        </section>

        <section className="content-panel">
          <div className="section-heading">
            <h2>최근 규칙 결과</h2>
            <p>LLM 없이 숫자 기준으로 먼저 잡아낸 점검 후보입니다.</p>
          </div>
          <RuleResultList results={view.recentRuleResults} />
        </section>

        <section className="content-panel">
          <div className="section-heading">
            <h2>실행 미리보기</h2>
            <p>실제 광고 변경 전에 영향과 차단 상태를 먼저 확인합니다.</p>
          </div>
          <PendingActionList actions={view.pendingActions} />
        </section>
      </div>
    </MarketingShell>
  );
}
