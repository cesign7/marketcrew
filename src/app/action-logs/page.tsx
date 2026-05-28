import { MarketingShell } from "@/components/layout/MarketingShell";
import { ActionLogsPanel } from "@/components/search-ad/SearchAdCards";
import { loadSearchAdActionLogsView } from "@/features/search-ad/loadSearchAdViews";

export const dynamic = "force-dynamic";

export default async function ActionLogsPage() {
  const view = await loadSearchAdActionLogsView();

  return (
    <MarketingShell activePath="/action-logs" description="실제 변경, 차단, 실패 이력을 확인합니다." title="실행 이력">
      <section className="page-stack">
        <div className="content-panel">
          <div className="section-heading">
            <h2>실행 이력</h2>
            <p>켜짐/꺼짐 미리보기와 차단/실패/반영 이력을 분리해서 남깁니다.</p>
          </div>
          <ActionLogsPanel view={view} />
        </div>
      </section>
    </MarketingShell>
  );
}
