import type { CharacterStatus } from "@/features/agenda-room/types";

type CharacterRailProps = {
  characters: CharacterStatus[];
};

export function CharacterRail({ characters }: CharacterRailProps) {
  return (
    <aside className="character-rail" aria-label="캐릭터 업무 현황">
      <div className="rail-heading">
        <span>캐릭터 업무 현황</span>
        <strong>{characters.length}</strong>
      </div>
      <div className="character-list">
        {characters.map((character) => (
          <article className={`character-row tone-${character.tone}${character.availability === "PREPARING" ? " is-preparing" : ""}`} key={character.id}>
            <div className="avatar" aria-hidden="true">
              {character.name.slice(0, 1)}
            </div>
            <div className="character-copy">
              <div className="character-title">
                <strong>{character.name}</strong>
                <span>{character.role}</span>
                <em>{character.availabilityLabel}</em>
              </div>
              <p>{character.status}</p>
              <div className="workload" aria-label={`${character.name} 업무량 ${character.workload}%`}>
                <span style={{ width: `${character.workload}%` }} />
              </div>
            </div>
            <span className="queue-count" aria-label={`${character.name} 대기 ${character.queueCount}건`}>
              {character.workload}%
            </span>
          </article>
        ))}
      </div>
    </aside>
  );
}
