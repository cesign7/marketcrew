import { DataIntegrationPanels } from "@/components/agenda-room/DataIntegrationPanels";
import { AppShell } from "@/components/layout/AppShell";
import { normalizeDataChannel, normalizeDataPeriod } from "@/features/agenda-room/data-filters";
import { loadAgendaRoomViewModel } from "@/features/agenda-room/loadAgendaRoomViewModel";

export const dynamic = "force-dynamic";

type DataPageProps = {
  searchParams?: Promise<{
    channel?: string;
    period?: string;
  }>;
};

export default async function DataPage({ searchParams }: DataPageProps) {
  const params = await searchParams;
  const selectedChannel = normalizeDataChannel(params?.channel);
  const selectedPeriod = normalizeDataPeriod(params?.period);
  const viewModel = loadAgendaRoomViewModel();

  return (
    <AppShell
      active="data"
      description="스마트스토어(스티커씨), 쇼핑몰(커피프린트), 네이버 키워드광고의 읽기 전용 수집 상태와 근거를 확인합니다."
      eyebrow="연동 근거"
      generatedAt={viewModel.generatedAt}
      title="데이터 연동"
    >
      <DataIntegrationPanels
        agentRunSummary={viewModel.agentRunSummary}
        initialChannel={selectedChannel}
        initialPeriod={selectedPeriod}
        plannerPreview={viewModel.plannerPreview}
        providerReadiness={viewModel.providerReadiness}
        providerSyncEvidence={viewModel.providerSyncEvidence}
      />
    </AppShell>
  );
}
