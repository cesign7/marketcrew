import { describe, expect, it } from "vitest";
import { buildSampleHypothesisEvidenceQueue } from "../../src/lib/application/evidence-request-guard";
import { reviewEvidenceRequest } from "../../src/lib/application/evidence-request-review";
import { createMemoryMarketingWorkflowRepository } from "../../src/lib/application/memory-workflow-repository";

describe("EvidenceRequestReview", () => {
  it("데이가 근거 충분으로 확인한 요청만 가설 승격과 감사 이력으로 저장한다", () => {
    const generatedAt = "2026-05-23T01:00:00.000Z";
    const reviewedAt = "2026-05-23T02:00:00.000Z";
    const queue = buildSampleHypothesisEvidenceQueue({ generatedAt });
    const repository = createMemoryMarketingWorkflowRepository({
      hypothesisCandidates: queue.hypotheses,
      evidenceRequests: queue.evidenceRequests,
    });

    const result = reviewEvidenceRequest({
      repository,
      evidenceRequestId: "evidence-request-gro-mobile-evening-gift-card",
      status: "VERIFIED",
      verificationNote: "모바일 저녁 시간대 성과와 모바일 입찰 가중치가 함께 확인됐습니다.",
      verifiedEvidenceIds: ["search-ad-device-hourly-buddha-gift-card-2026"],
      reviewedAt,
    });

    expect(result.evidenceRequest.status).toBe("VERIFIED");
    expect(result.hypothesis?.status).toBe("PROMOTED");
    expect(result.promotedAgendaCandidate?.id).toBe("agenda-hypothesis-gro-mobile-evening-gift-card");

    expect(repository.listEvidenceRequests().find((request) => request.id === result.evidenceRequest.id)).toMatchObject({
      status: "VERIFIED",
      verificationNote: "모바일 저녁 시간대 성과와 모바일 입찰 가중치가 함께 확인됐습니다.",
      verifiedEvidenceIds: ["search-ad-device-hourly-buddha-gift-card-2026"],
      updatedAt: reviewedAt,
    });
    expect(repository.listAgendaCandidates().map((candidate) => candidate.id)).toContain(
      "agenda-hypothesis-gro-mobile-evening-gift-card",
    );

    const run = repository.listAgentRunsForWorkflowObject({
      objectType: "evidence_request",
      objectId: "evidence-request-gro-mobile-evening-gift-card",
    })[0];
    expect(run).toMatchObject({
      runType: "evidence_request_review",
      runnerKey: "day_evidence_request_review",
      provider: "local",
      status: "SUCCEEDED",
      rawRowsIncluded: false,
      evidenceIds: ["search-ad-device-hourly-buddha-gift-card-2026"],
    });
    expect(run?.outputSummary).toContain("승격");
  });

  it("수집 중 상태는 저장하지만 결재 안건 후보로 승격하지 않는다", () => {
    const generatedAt = "2026-05-23T01:00:00.000Z";
    const reviewedAt = "2026-05-23T02:00:00.000Z";
    const queue = buildSampleHypothesisEvidenceQueue({ generatedAt });
    const repository = createMemoryMarketingWorkflowRepository({
      hypothesisCandidates: queue.hypotheses,
      evidenceRequests: queue.evidenceRequests,
    });

    const result = reviewEvidenceRequest({
      repository,
      evidenceRequestId: "evidence-request-gro-mobile-evening-gift-card",
      status: "COLLECTING",
      verificationNote: "시간대별 원천 필드를 수집하는 중입니다.",
      reviewedAt,
    });

    expect(result.evidenceRequest.status).toBe("COLLECTING");
    expect(result.hypothesis?.status).toBe("WAITING_EVIDENCE");
    expect(result.promotedAgendaCandidate).toBeUndefined();
    expect(repository.listAgendaCandidates().map((candidate) => candidate.id)).not.toContain(
      "agenda-hypothesis-gro-mobile-evening-gift-card",
    );
  });
});
