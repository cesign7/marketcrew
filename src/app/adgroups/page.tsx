import { MarketingShell } from "@/components/layout/MarketingShell";
import { AdgroupStateTable } from "@/components/search-ad/AdgroupStateTable";
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
        <AdgroupStateTable
          description="기본 정렬은 브랜드, 광고유형, 이름 오름차순입니다. 상태 토글은 실행 미리보기와 write gate를 통과한 뒤 네이버 광고그룹에 반영합니다."
          records={view.adgroups}
          title="광고그룹 상태"
          writeEnabled={view.syncStatus.searchAdWriteEnabled}
        />
      </section>
    </MarketingShell>
  );
}
