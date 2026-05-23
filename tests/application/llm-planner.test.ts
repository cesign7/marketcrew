import { describe, expect, it } from "vitest";
import { runSampleAgendaCycle } from "../../src/lib/application/agenda-cycle";
import { buildDeterministicPlannerResult, buildPlannerAuditRun, buildPlannerInputFromApprovals } from "../../src/lib/llm/planner";

describe("LLM planner interface", () => {
  it("결재 후보를 원천 행 없이 요약 입력으로 변환한다", () => {
    const cycle = runSampleAgendaCycle();
    const input = buildPlannerInputFromApprovals(cycle.approvalRequests, cycle.generatedAt);

    expect(input.source).toBe("signal_summary");
    expect(input.rawRowsIncluded).toBe(false);
    expect(input.constraints).toEqual({
      privacy: "aggregate_only",
      maxCandidates: 5,
      externalWriteAllowed: false,
    });
    expect(input.candidateSummaries[0]).toMatchObject({
      approvalRequestId: expect.stringContaining("approval-"),
      evidenceIds: expect.arrayContaining(["kw-demand-buddha-gift-card"]),
    });
    expect(JSON.stringify(input)).not.toContain("beforeState");
    expect(JSON.stringify(input)).not.toContain("afterState");
  });

  it("사용 중단된 교차 브랜드 결재안은 AI 입력 후보에서 제외한다", () => {
    const cycle = runSampleAgendaCycle();
    const deprecatedCrossBrandApproval = {
      ...cycle.approvalRequests[0],
      id: "approval-agenda-provider-channel-balance-stickersee-coffeeprint-2026-05-23",
      title: "스마트스토어/자체몰 매출 균형 점검 안건",
      evidenceSummary: "스마트스토어와 자체몰의 매출 균형을 통합 검토합니다.",
      evidenceIds: ["commerce-aggregate-STICKERSEE-2026-05-22", "shop-aggregate-youngcart-2026-05-22"],
      status: "PENDING" as const,
    };

    const input = buildPlannerInputFromApprovals(
      [deprecatedCrossBrandApproval, ...cycle.approvalRequests],
      cycle.generatedAt,
    );

    expect(input.candidateSummaries.map((candidate) => candidate.approvalRequestId)).not.toContain(
      "approval-agenda-provider-channel-balance-stickersee-coffeeprint-2026-05-23",
    );
    expect(JSON.stringify(input)).not.toContain("스마트스토어/자체몰 매출 균형");
  });

  it("deterministic fallback은 승인 가능 안건을 우선 추천하고 token estimate를 남긴다", () => {
    const cycle = runSampleAgendaCycle();
    const input = buildPlannerInputFromApprovals(cycle.approvalRequests, cycle.generatedAt);
    const result = buildDeterministicPlannerResult(input);

    expect(result.mode).toBe("deterministic_fallback");
    expect(result.rawRowsIncluded).toBe(false);
    expect(result.recommendedApprovalIds[0]).toBe("approval-agenda-season-plan-buddha-gift-card");
    expect(result.evidenceIds).toEqual(expect.arrayContaining(["signal-buddha-gift-card-yoy", "kw-demand-buddha-gift-card"]));
    expect(result.tokenEstimate).toBeGreaterThan(0);
    expect(result.summary).toContain("원천 행");
  });

  it("모아 플래너 감사 정보에 모델, 토큰, 근거 수, 과금 상태를 남긴다", () => {
    const cycle = runSampleAgendaCycle();
    const input = buildPlannerInputFromApprovals(cycle.approvalRequests, cycle.generatedAt);
    const result = buildDeterministicPlannerResult(input);
    const audit = buildPlannerAuditRun(input, result, { providerEvidenceNoteCount: 4 });

    expect(audit.runnerKey).toBe("moa_planner");
    expect(audit.provider).toBe("deterministic");
    expect(audit.model).toBe("deterministic-fallback");
    expect(audit.tokenUsage.rawRowsIncluded).toBe(false);
    expect(audit.tokenUsage.totalEstimate).toBeGreaterThan(result.tokenEstimate);
    expect(audit.billing).toMatchObject({
      state: "NOT_BILLED_FALLBACK",
      estimatedCostKrw: 0,
    });
    expect(audit.sourceCounts).toMatchObject({
      candidateSummaries: 2,
      selectedApprovals: 2,
      providerEvidenceNotes: 4,
    });
    expect(audit.evidenceIds).toEqual(expect.arrayContaining(["kw-demand-buddha-gift-card"]));
  });
});
