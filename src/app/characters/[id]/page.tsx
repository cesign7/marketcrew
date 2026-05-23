import { notFound } from "next/navigation";
import { CharacterDesk } from "@/components/agenda-room/CharacterDesk";
import { AppShell } from "@/components/layout/AppShell";
import { loadAgendaRoomViewModel } from "@/features/agenda-room/loadAgendaRoomViewModel";

type CharacterDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function CharacterDetailPage({ params }: CharacterDetailPageProps) {
  const { id } = await params;
  const viewModel = await loadAgendaRoomViewModel();
  const character = viewModel.characters.find((item) => item.id === id);

  if (!character) {
    notFound();
  }

  return (
    <AppShell
      active="characters"
      description={`${character.role} ${character.name}가 맡은 업무, 보고 상태, 연결 안건을 따로 확인합니다.`}
      eyebrow="캐릭터별 업무"
      generatedAt={viewModel.generatedAt}
      title={`${character.name} 업무데스크`}
    >
      <CharacterDesk
        agendaCards={viewModel.agendaCards}
        characters={viewModel.characters}
        workDeskCards={viewModel.workDeskCards}
        ownerDecisionFlows={viewModel.ownerDecisionFlows}
        selectedCharacterId={character.id}
      />
    </AppShell>
  );
}
