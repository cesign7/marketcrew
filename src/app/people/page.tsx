import { AiPeopleOffice } from "@/components/people/AiPeopleOffice";
import { AppShell } from "@/components/layout/AppShell";
import { loadAgendaRoomViewModel } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { loadAiPeopleOfficeView } from "@/features/people/loadAiOperationsView";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const [viewModel, peopleOfficeView] = await Promise.all([loadAgendaRoomViewModel(), loadAiPeopleOfficeView()]);

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
