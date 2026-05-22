import { describe, expect, it } from "vitest";
import { triageAgendaCandidates } from "../../src/lib/domain";
import type { AgendaCandidate } from "../../src/lib/domain";

function agenda(overrides: Partial<AgendaCandidate>): AgendaCandidate {
  return {
    id: "agenda-base",
    character: "gro",
    title: "부처님오신날 선물카드 키워드 안건",
    summary: "시즌 키워드 수요가 상승했습니다.",
    severity: "MEDIUM",
    sourceSignalIds: ["signal-001"],
    opportunityIds: ["opportunity-001"],
    dataConfidence: "READY_TO_APPROVE",
    duplicateKey: "keyword:gfit-card:buddha-birthday",
    createdAt: "2026-05-22T09:00:00+09:00",
    ...overrides,
  };
}

describe("AgendaTriageService", () => {
  it("중복 안건은 duplicateKey 기준으로 묶고 더 강한 후보 하나만 올린다", () => {
    const promoted = triageAgendaCandidates([
      agenda({
        id: "agenda-weak",
        severity: "LOW",
        dataConfidence: "EVIDENCE_WEAK",
        sourceSignalIds: ["signal-001"],
      }),
      agenda({
        id: "agenda-strong",
        severity: "HIGH",
        dataConfidence: "READY_TO_APPROVE",
        sourceSignalIds: ["signal-001", "signal-002", "signal-003"],
      }),
      agenda({
        id: "agenda-other",
        duplicateKey: "product:teacher-day-bundle",
        character: "pro",
        severity: "MEDIUM",
      }),
    ]);

    expect(promoted.map((item) => item.id)).toEqual(["agenda-strong", "agenda-other"]);
  });
});
