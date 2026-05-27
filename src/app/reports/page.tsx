import { MarketingShell } from "@/components/layout/MarketingShell";
import { ReportTypeGuideGrid } from "@/components/reports/ReportDetailSections";
import { ReportListTable, SyncStatusStrip } from "@/components/search-ad/SearchAdCards";
import { loadSearchAdOperationsView, loadSearchAdReportArchiveView, parseSearchAdFilters } from "@/features/search-ad/loadSearchAdViews";

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const filters = parseSearchAdFilters(await searchParams);
  const [archive, operations] = await Promise.all([loadSearchAdReportArchiveView(filters), loadSearchAdOperationsView(filters)]);

  return (
    <MarketingShell
      activePath="/reports"
      description="네이버에서 생성된 보고서를 가져와 원본, 파싱 상태, 핵심 요약을 확인합니다."
      filters={filters}
      title="보고서 보관함"
    >
      <div className="page-stack">
        <SyncStatusStrip view={operations} />
        <ReportTypeGuideGrid />
        <section className="content-panel">
          <div className="section-heading">
            <h2>수집된 보고서</h2>
            <p>전일 확정 성과를 기준으로 저장된 보고서입니다.</p>
          </div>
          <ReportListTable reports={archive.reports} />
        </section>
      </div>
    </MarketingShell>
  );
}
