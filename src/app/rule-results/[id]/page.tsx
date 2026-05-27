import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { RuleResultActionPanel } from "@/components/search-ad/RuleResultActionPanel";
import { RuleResultActionPlanSection, RuleResultDetailSummary, RuleResultEvidenceRows } from "@/components/search-ad/RuleResultDetailSections";
import { DEFAULT_SEARCH_AD_FILTERS } from "@/features/search-ad/domain/sampleData";
import { loadSearchAdRuleResultDetailView } from "@/features/search-ad/loadSearchAdViews";

type RuleResultDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function RuleResultDetailPage({ params }: RuleResultDetailPageProps) {
  const { id } = await params;
  const view = await loadSearchAdRuleResultDetailView(id);
  if (!view) {
    notFound();
  }

  return (
    <MarketingShell
      activePath="/rule-results"
      description="규칙 결과가 왜 올라왔는지, 어느 광고그룹과 연결되는지, 실행 전 어떤 영향을 미리 봐야 하는지 확인합니다."
      filters={DEFAULT_SEARCH_AD_FILTERS}
      title="규칙 결과 상세"
    >
      <div className="page-stack">
        <RuleResultDetailSummary view={view} />
        <RuleResultActionPlanSection view={view} />
        <RuleResultActionPanel actionTarget={view.actionTarget} />
        <RuleResultEvidenceRows view={view} />
      </div>
    </MarketingShell>
  );
}
