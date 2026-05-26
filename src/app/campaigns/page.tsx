import { MarketingShell } from "@/components/layout/MarketingShell";
import { SearchAdStateTable } from "@/components/search-ad/SearchAdStateTable";
import { loadSearchAdStateView, parseSearchAdFilters } from "@/features/search-ad/loadSearchAdViews";

type CampaignsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const filters = parseSearchAdFilters(await searchParams);
  const view = await loadSearchAdStateView(filters);

  return (
    <MarketingShell activePath="/campaigns" description="캠페인 단위 켜짐/꺼짐 상태와 최근 성과를 확인합니다." filters={filters} title="캠페인">
      <section className="page-stack">
        <SearchAdStateTable
          description="기본 정렬은 브랜드, 광고유형, 이름 오름차순입니다. 상태 토글은 실행 미리보기와 변경 권한 확인을 통과한 뒤 네이버 캠페인에 반영합니다."
          records={view.campaigns}
          targetType="campaign"
          title="캠페인 상태"
          writeEnabled={view.syncStatus.searchAdWriteEnabled}
        />
      </section>
    </MarketingShell>
  );
}
