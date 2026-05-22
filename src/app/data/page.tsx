import { AgentRunSummaryPanel } from "@/components/agenda-room/AgentRunSummaryPanel";
import { PlannerPreviewPanel } from "@/components/agenda-room/PlannerPreviewPanel";
import { ProviderReadinessPanel } from "@/components/agenda-room/ProviderReadinessPanel";
import { ProviderSyncEvidencePanel } from "@/components/agenda-room/ProviderSyncEvidencePanel";
import { AppShell } from "@/components/layout/AppShell";
import { loadAgendaRoomViewModel } from "@/features/agenda-room/loadAgendaRoomViewModel";

export const dynamic = "force-dynamic";

export default function DataPage() {
  const viewModel = loadAgendaRoomViewModel();

  return (
    <AppShell
      active="data"
      description="스마트스토어(스티커씨), 쇼핑몰(커피프린트), 네이버 키워드광고의 읽기 전용 수집 상태와 근거를 확인합니다."
      eyebrow="연동 근거"
      generatedAt={viewModel.generatedAt}
      title="데이터 연동"
    >
      <ProviderReadinessPanel providers={viewModel.providerReadiness} />
      <ProviderSyncEvidencePanel reports={viewModel.providerSyncEvidence} />
      <PlannerPreviewPanel preview={viewModel.plannerPreview} />
      <AgentRunSummaryPanel summary={viewModel.agentRunSummary} />
    </AppShell>
  );
}
