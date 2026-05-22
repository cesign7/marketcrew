import { AiPeopleOffice } from "@/components/people/AiPeopleOffice";
import { AppShell } from "@/components/layout/AppShell";
import { loadAgendaRoomViewModel, loadWorkflowReadRepository } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { buildAiPeopleOfficeView, resolveAiOperationsSettings } from "@/features/people/ai-operations-settings";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const [viewModel, repository] = await Promise.all([loadAgendaRoomViewModel(), loadWorkflowReadRepository()]);
  const settings = resolveAiOperationsSettings({
    stored: repository.listAiOperationsSettings()[0],
  });
  const peopleOfficeView = buildAiPeopleOfficeView({
    settings,
    agentRuns: repository.listAgentRuns(),
  });

  return (
    <AppShell
      active="people"
      description="캐릭터별 기본 롤모델, 담당 기준, 모델 배정, 월별 토큰 사용량과 예상금액을 관리합니다."
      eyebrow="AI 인사과"
      generatedAt={viewModel.generatedAt}
      title="인사과"
    >
      <AiPeopleOffice view={peopleOfficeView} />
    </AppShell>
  );
}
