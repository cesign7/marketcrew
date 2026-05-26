import { MarketingShell } from "@/components/layout/MarketingShell";
import { RuleResultList, SearchTermTable } from "@/components/search-ad/SearchAdCards";
import { loadSearchAdSearchTermsView, parseSearchAdFilters } from "@/features/search-ad/loadSearchAdViews";

type SearchTermsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function SearchTermsPage({ searchParams }: SearchTermsPageProps) {
  const filters = parseSearchAdFilters(await searchParams);
  const view = await loadSearchAdSearchTermsView(filters);

  return (
    <MarketingShell activePath="/search-terms" description="파워링크와 쇼핑검색광고의 검색어 성과를 보고서 기준으로 확인합니다." filters={filters} title="검색어 성과">
      <section className="page-stack">
        <div className="content-panel">
          <div className="section-heading">
            <h2>검색어별 성과</h2>
            <p>보고서 원문을 정규화한 행 기준으로 비용, 클릭, 전환, CPA, ROAS를 봅니다.</p>
          </div>
          <SearchTermTable rows={view.rows} />
        </div>
        <div className="content-panel">
          <div className="section-heading">
            <h2>연결된 규칙 결과</h2>
            <p>같은 검색어 데이터에서 숫자 기준으로 분류된 후보입니다.</p>
          </div>
          <RuleResultList results={view.ruleResults} />
        </div>
      </section>
    </MarketingShell>
  );
}
