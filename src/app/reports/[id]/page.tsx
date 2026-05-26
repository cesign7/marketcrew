import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { RuleResultList } from "@/components/search-ad/SearchAdCards";
import { ColumnDescriptionTable, RawReportPreview, ReportEasyTable, ReportSummaryPanel } from "@/components/reports/ReportDetailSections";
import { DEFAULT_SEARCH_AD_FILTERS } from "@/features/search-ad/domain/sampleData";
import { loadSearchAdReportDetailView } from "@/features/search-ad/loadSearchAdViews";

type ReportDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { id } = await params;
  const view = await loadSearchAdReportDetailView(id);
  if (!view) {
    notFound();
  }

  return (
    <MarketingShell
      activePath="/reports"
      description="보고서 원본과 대표가 바로 읽을 수 있는 요약을 함께 확인합니다."
      filters={DEFAULT_SEARCH_AD_FILTERS}
      title={view.report.displayName}
    >
      <div className="page-stack">
        <ReportSummaryPanel view={view} />
        <ReportEasyTable view={view} />
        <section className="content-panel">
          <div className="section-heading">
            <h2>문제 후보</h2>
            <p>보고서 안에서 저효율 또는 점검 필요로 분류된 항목입니다.</p>
          </div>
          <RuleResultList results={view.problemCandidates} />
        </section>
        <section className="content-panel">
          <div className="section-heading">
            <h2>좋은 후보</h2>
            <p>확장하거나 유지할 만한 성과 후보입니다.</p>
          </div>
          <RuleResultList results={view.goodCandidates} />
        </section>
        <RawReportPreview view={view} />
        <ColumnDescriptionTable view={view} />
      </div>
    </MarketingShell>
  );
}
