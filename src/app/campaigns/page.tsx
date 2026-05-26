import { MarketingShell } from "@/components/layout/MarketingShell";
import { StateRecordTable } from "@/components/search-ad/SearchAdCards";
import { loadSearchAdStateView, parseSearchAdFilters } from "@/features/search-ad/loadSearchAdViews";

type CampaignsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const filters = parseSearchAdFilters(await searchParams);
  const view = await loadSearchAdStateView(filters);

  return (
    <MarketingShell activePath="/campaigns" description="캠페인 단위 ON/OFF 상태와 최근 성과를 확인합니다." filters={filters} title="캠페인">
      <section className="page-stack">
        <StateRecordTable description="네이버 Search Ad 캠페인 스냅샷 기준입니다. 켜짐은 userLock=false, 꺼짐은 userLock=true입니다." records={view.campaigns} title="캠페인 상태" />
      </section>
    </MarketingShell>
  );
}
