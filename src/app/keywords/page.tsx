import { MarketingShell } from "@/components/layout/MarketingShell";
import { KeywordCleanupDashboard } from "@/components/search-ad/KeywordCleanupPanel";
import { loadSearchAdKeywordCleanupView, parseSearchAdFilters } from "@/features/search-ad/loadSearchAdViews";

type KeywordsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function KeywordsPage({ searchParams }: KeywordsPageProps) {
  const filters = parseSearchAdFilters(await searchParams);
  const view = await loadSearchAdKeywordCleanupView(filters);

  return (
    <MarketingShell activePath="/keywords" description="중복 키워드와 장기간 클릭 없는 키워드를 찾아 정리 후보로 확인합니다." filters={filters} title="키워드 정리">
      <KeywordCleanupDashboard view={view} />
    </MarketingShell>
  );
}
