import { MarketingShell } from "@/components/layout/MarketingShell";
import { KeywordInsightDashboard } from "@/components/search-ad/KeywordInsightDashboard";
import { loadSearchAdKeywordInsightView, parseSearchAdFilters } from "@/features/search-ad/loadSearchAdViews";

type KeywordInsightsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function KeywordInsightsPage({ searchParams }: KeywordInsightsPageProps) {
  const filters = parseSearchAdFilters(await searchParams);
  const view = await loadSearchAdKeywordInsightView(filters);

  return (
    <MarketingShell activePath="/keyword-insights" description="같은 키워드의 기기, 매체, 시간대별 효율 차이를 비교합니다." filters={filters} title="키워드 효율">
      <KeywordInsightDashboard view={view} />
    </MarketingShell>
  );
}
