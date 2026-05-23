import Link from "next/link";
import { ArrowRight, ClipboardList, Clock3, Gauge, ShieldCheck } from "lucide-react";
import type { AgendaCardView, CharacterStatus, OwnerDecisionFlowView, WorkDeskCardView } from "@/features/agenda-room/types";
import { WorkDeskCardList } from "./WorkDeskCardList";

type CharacterDeskProps = {
  characters: CharacterStatus[];
  agendaCards: AgendaCardView[];
  workDeskCards: WorkDeskCardView[];
  ownerDecisionFlows: OwnerDecisionFlowView[];
  selectedCharacterId?: string;
};

const characterFocus: Record<string, { focus: string; nextReport: string }> = {
  moa: {
    focus: "담당 캐릭터들이 올린 안건을 대표 결재 흐름으로 묶습니다.",
    nextReport: "매일 업무실 첫 화면에서 오늘 결재 우선순위를 보고합니다.",
  },
  gro: {
    focus: "시즌 키워드, 광고 테스트, 신규 수요를 찾습니다.",
    nextReport: "명절/행사 기준 키워드 수요가 바뀌면 즉시 상신합니다.",
  },
  pro: {
    focus: "스마트스토어와 쇼핑몰 상품 흐름을 보고 상품별 기회를 찾습니다.",
    nextReport: "상품 묶음, 재고, 브랜드 안의 판매채널 노출 후보를 보강합니다.",
  },
  copy: {
    focus: "승인된 상품/이벤트에 맞춰 광고 문구와 상세 메시지를 준비합니다.",
    nextReport: "대표 승인 후 문구 초안을 만들어 재상신합니다.",
  },
  ripi: {
    focus: "구매 고객군, 재구매 타이밍, CRM 후속 제안을 봅니다.",
    nextReport: "구매자 반응과 반복 구매 신호를 후속 업무로 올립니다.",
  },
  maru: {
    focus: "브랜드별 주문, 매출, 상품 흐름, 판매채널 준비 상태를 확인합니다.",
    nextReport: "스티커씨와 커피프린트를 섞지 않고 각 브랜드 안의 운영 상태를 보고합니다.",
  },
  day: {
    focus: "수집 근거, 누락 데이터, 전년동기/명절 기준 비교를 확인합니다.",
    nextReport: "근거 부족 안건을 보강하고 데이터 품질을 보고합니다.",
  },
};

export function CharacterDesk({
  characters,
  agendaCards,
  workDeskCards,
  ownerDecisionFlows,
  selectedCharacterId,
}: CharacterDeskProps) {
  const visibleCharacters = selectedCharacterId
    ? characters.filter((character) => character.id === selectedCharacterId)
    : characters;
  const selectedCharacter = characters.find((character) => character.id === selectedCharacterId);
  const selectedWorkDeskCards = selectedCharacterId
    ? workDeskCardsForCharacter(workDeskCards, selectedCharacterId)
    : workDeskCards.slice(0, 6);

  return (
    <section className="character-desk-section" aria-label="캐릭터별 업무 현황">
      <div className="character-switcher" aria-label="캐릭터 선택">
        {characters.map((character) => (
          <Link
            className={selectedCharacterId === character.id ? "is-active" : ""}
            href={`/characters/${character.id}`}
            key={character.id}
          >
            {character.name}
          </Link>
        ))}
      </div>

      <div className="character-desk-grid">
        {visibleCharacters.map((character) => (
          <CharacterDeskCard
            agendaCards={agendaCards}
            character={character}
            key={character.id}
            ownerDecisionFlows={ownerDecisionFlows}
          />
        ))}
      </div>

      <WorkDeskCardList
        cards={selectedWorkDeskCards}
        description={
          selectedCharacter
            ? `${selectedCharacter.name}가 확인하거나 모아에게 보고할 업무카드입니다.`
            : "키워드, 근거 확인, 위임 후보 업무를 카드 단위로 압축해서 봅니다."
        }
        emptyMessage={
          selectedCharacter
            ? `${selectedCharacter.name}가 담당하는 업무카드는 아직 없습니다.`
            : "현재 캐릭터별 업무카드가 없습니다."
        }
        eyebrow={selectedCharacter ? `${selectedCharacter.name} 데스크` : "전체 데스크"}
        title={selectedCharacter ? `${selectedCharacter.name} 업무카드` : "최근 업무카드"}
      />
    </section>
  );
}

function workDeskCardsForCharacter(cards: WorkDeskCardView[], characterId: string): WorkDeskCardView[] {
  if (characterId === "moa") {
    return cards.filter((card) => card.delegation.state === "OWNER_FIRST_APPROVAL_REQUIRED").slice(0, 12);
  }

  return cards.filter((card) => card.ownerId === characterId);
}

function CharacterDeskCard({
  character,
  agendaCards,
  ownerDecisionFlows,
}: {
  character: CharacterStatus;
  agendaCards: AgendaCardView[];
  ownerDecisionFlows: OwnerDecisionFlowView[];
}) {
  const focus = characterFocus[character.id] ?? characterFocus.moa;
  const relatedAgendas = agendaCards.filter((agenda) => agenda.owner === character.name).slice(0, 3);
  const relatedFlows = ownerDecisionFlows.filter((flow) => flow.title.includes(character.name)).slice(0, 2);

  return (
    <article className={`character-desk-card tone-${character.tone}`}>
      <header>
        <div className="avatar" aria-hidden="true">
          {character.name.slice(0, 1)}
        </div>
        <div>
          <span className="eyebrow">{character.role}</span>
          <h2>{character.name}</h2>
        </div>
        <Link
          aria-label={`${character.name} 업무 보기`}
          className="icon-button"
          href={`/characters/${character.id}`}
        >
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </header>

      <p>{focus.focus}</p>

      <div className="character-status-grid">
        <span>
          <Gauge size={15} aria-hidden="true" />
          업무량 {character.workload}%
        </span>
        <span>
          <ClipboardList size={15} aria-hidden="true" />
          대기 {character.queueCount}건
        </span>
        <span>
          <Clock3 size={15} aria-hidden="true" />
          다음 보고 예정
        </span>
      </div>

      <div className="workload" aria-label={`${character.name} 업무량 ${character.workload}%`}>
        <span style={{ width: `${character.workload}%` }} />
      </div>

      <section className="character-desk-block" aria-label={`${character.name} 현재 업무`}>
        <strong>현재 업무</strong>
        <p>{character.status}</p>
      </section>
      <section className="character-desk-block" aria-label={`${character.name} 다음 보고`}>
        <strong>다음 보고</strong>
        <p>{focus.nextReport}</p>
      </section>

      <div className="character-work-list" aria-label={`${character.name} 연결 안건`}>
        {relatedAgendas.length > 0 ? (
          relatedAgendas.map((agenda) => (
            <Link href={`/approvals/${agenda.id}`} key={agenda.id} prefetch={false}>
              <ShieldCheck size={15} aria-hidden="true" />
              <span>{agenda.title}</span>
            </Link>
          ))
        ) : (
          <span>대표 결재로 올라온 연결 안건은 아직 없습니다.</span>
        )}
        {relatedFlows.map((flow) => (
          <span key={flow.id}>{flow.decisionLabel} · {flow.executionStateLabel}</span>
        ))}
      </div>
    </article>
  );
}
