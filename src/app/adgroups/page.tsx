import { MarketingShell } from "@/components/layout/MarketingShell";
import { StateRecordTable } from "@/components/search-ad/SearchAdCards";
import { loadSearchAdStateView, parseSearchAdFilters } from "@/features/search-ad/loadSearchAdViews";

type AdgroupsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function AdgroupsPage({ searchParams }: AdgroupsPageProps) {
  const filters = parseSearchAdFilters(await searchParams);
  const view = await loadSearchAdStateView(filters);

  return (
    <MarketingShell activePath="/adgroups" description="광고그룹별 ON/OFF 상태와 입찰·예산 요약을 확인합니다." filters={filters} title="광고그룹">
      <section className="page-stack">
        <StateRecordTable description="입찰가와 일예산을 함께 봅니다. 실제 변경은 실행 미리보기와 write gate를 통과해야 합니다." records={view.adgroups} title="광고그룹 상태" />
      </section>
    </MarketingShell>
  );
}
