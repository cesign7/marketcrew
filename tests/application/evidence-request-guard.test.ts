import { describe, expect, it } from "vitest";
import {
  buildSampleHypothesisEvidenceQueue,
  promoteVerifiedHypothesesToAgendaCandidates,
} from "../../src/lib/application/evidence-request-guard";

describe("evidence request guard", () => {
  it("검증되지 않은 자유 탐색 가설은 결재 안건으로 승격하지 않는다", () => {
    const queue = buildSampleHypothesisEvidenceQueue({ generatedAt: "2026-05-23T00:00:00.000Z" });
    const promoted = promoteVerifiedHypothesesToAgendaCandidates(queue, {
      generatedAt: "2026-05-23T00:00:00.000Z",
    });

    expect(queue.hypotheses.map((hypothesis) => [hypothesis.id, hypothesis.status])).toEqual([
      ["hypothesis-gro-mobile-evening-gift-card", "WAITING_EVIDENCE"],
      ["hypothesis-pro-stickersee-season-bundle", "VERIFIED"],
    ]);
    expect(promoted.map((candidate) => candidate.id)).toEqual(["agenda-hypothesis-pro-stickersee-season-bundle"]);
    expect(promoted[0]).toMatchObject({
      character: "pro",
      dataConfidence: "READY_TO_APPROVE",
      sourceSignalIds: ["commerce-aggregate-STICKERSEE-2026-05-22"],
    });
  });
});
