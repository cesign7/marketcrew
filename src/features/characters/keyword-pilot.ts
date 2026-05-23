import type { CharacterKey } from "@/lib/domain";

export type CharacterAvailability = "ACTIVE" | "PREPARING";

export const keywordPilotScopeLabel = "키워드 성과/추천";

const activeKeywordPilotCharacters = new Set<CharacterKey>(["moa", "gro", "day"]);

const preparingSummary = "키워드 기능 안정화 후 활성화";

export function isKeywordPilotActiveCharacter(character: CharacterKey): boolean {
  return activeKeywordPilotCharacters.has(character);
}

export function keywordPilotAvailability(character: CharacterKey): {
  availability: CharacterAvailability;
  availabilityLabel: string;
  menuDescription: string;
  profileDescription: string;
} {
  if (isKeywordPilotActiveCharacter(character)) {
    return {
      availability: "ACTIVE",
      availabilityLabel: "활성",
      menuDescription: activeMenuDescription(character),
      profileDescription: `${keywordPilotScopeLabel} 우선 운영 중`,
    };
  }

  return {
    availability: "PREPARING",
    availabilityLabel: "준비중",
    menuDescription: "준비중",
    profileDescription: preparingSummary,
  };
}

function activeMenuDescription(character: CharacterKey): string {
  const labels: Partial<Record<CharacterKey, string>> = {
    moa: "결재 종합",
    gro: "키워드 성과",
    day: "근거 확인",
  };

  return labels[character] ?? keywordPilotScopeLabel;
}
