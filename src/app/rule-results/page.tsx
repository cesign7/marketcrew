import { MarketingShell } from "@/components/layout/MarketingShell";
import { RuleResultList } from "@/components/search-ad/SearchAdCards";
import { loadSearchAdOperationsView, parseSearchAdFilters } from "@/features/search-ad/loadSearchAdViews";

type RuleResultsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function RuleResultsPage({ searchParams }: RuleResultsPageProps) {
  const filters = parseSearchAdFilters(await searchParams);
  const view = await loadSearchAdOperationsView(filters);

  return (
    <MarketingShell activePath="/rule-results" description="저효율, 우수, 점검 필요 후보를 숫자 기준으로 확인합니다." filters={filters} title="규칙 결과">
      <section className="page-stack">
        <div className="content-panel">
          <div className="section-heading">
            <h2>규칙 결과</h2>
            <p>LLM 판단 전 단계에서 재현 가능한 숫자 규칙만 표시합니다.</p>
          </div>
          <RuleResultList results={view.recentRuleResults} />
        </div>
      </section>
    </MarketingShell>
  );
}
