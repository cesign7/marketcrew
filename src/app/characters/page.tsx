import { CharacterDesk } from "@/components/agenda-room/CharacterDesk";
import { AppShell } from "@/components/layout/AppShell";
import { loadAgendaRoomViewModel } from "@/features/agenda-room/loadAgendaRoomViewModel";

export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  const viewModel = await loadAgendaRoomViewModel();

  return (
    <AppShell
      active="characters"
      description="모아, 그로, 프로, 카피, 리피, 마루, 데이가 각각 올린 안건과 막힌 업무를 한눈에 봅니다."
      eyebrow="직원별 업무 현황"
      generatedAt={viewModel.generatedAt}
      title="캐릭터 업무데스크"
    >
      <CharacterDesk
        agendaCards={viewModel.agendaCards}
        characters={viewModel.characters}
        workDeskCards={viewModel.workDeskCards}
        ownerDecisionFlows={viewModel.ownerDecisionFlows}
      />
    </AppShell>
  );
}
