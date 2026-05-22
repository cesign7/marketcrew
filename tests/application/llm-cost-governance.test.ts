import { describe, expect, it } from "vitest";
import { buildLlmCostGovernanceView } from "../../src/features/agenda-room/buildLlmCostGovernanceView";
import type { AgentRun, LlmPlannerAuditRun } from "../../src/lib/domain";
import { buildProviderReadinessReports } from "../../src/lib/integrations/providers/readiness";

const NOW = "2026-05-22T02:00:00.000Z";

describe("LLM cost governance", () => {
  it("연동, 단가, 예산, 토큰 상한이 모두 맞으면 실제 호출 후보로 연다", () => {
    const env = {
      AI_LLM_PROVIDER: "gemini",
      AI_LLM_MODEL_DEFAULT: "gemini-3.1-flash-lite",
      GEMINI_API_KEY: "test-key",
      AI_LLM_COST_PER_1K_INPUT_KRW: "2",
      AI_LLM_COST_PER_1K_OUTPUT_KRW: "8",
      AI_LLM_DAILY_BUDGET_KRW: "1000",
      AI_LLM_RUN_BUDGET_KRW: "100",
      AI_LLM_MAX_INPUT_TOKENS: "5000",
      AI_LLM_MAX_OUTPUT_TOKENS: "2000",
      AI_LLM_MAX_TOTAL_TOKENS: "7000",
    };

    const view = buildLlmCostGovernanceView({
      env,
      generatedAt: NOW,
      plannerAudit: buildPlannerAudit(),
      agentRuns: [buildAgentRun({ estimatedCostKrw: 12 })],
      providerReadiness: buildProviderReadinessReports(env, NOW),
    });

    expect(view.liveCallAllowed).toBe(true);
    expect(view.statusLabel).toBe("실제 호출 차단 해제");
    expect(view.providerLabel).toBe("연동 Gemini");
    expect(view.modelLabel).toBe("모델 gemini-3.1-flash-lite");
    expect(view.estimatedRunCostLabel).toBe("이번 예상 7원");
    expect(view.dailySpentLabel).toBe("오늘 누적 12원");
    expect(view.dailyRemainingLabel).toBe("호출 후 잔여 981원");
    expect(view.officialPricingSourceLabel).toContain("Google AI 공식 가격표");
    expect(view.officialPricingRows).toEqual([
      expect.objectContaining({
        modelKey: "gemini-3.1-flash-lite",
        inputPriceLabel: "입력 $0.25 / 100만 토큰",
        outputPriceLabel: "출력 $1.50 / 100만 토큰",
        tone: "active",
      }),
    ]);
    expect(view.gateChecks.every((check) => check.tone === "ready")).toBe(true);
  });

  it("단가와 예산 환경 설정이 없으면 키가 있어도 규칙 기반 대체만 허용한다", () => {
    const env = {
      AI_LLM_PROVIDER: "gemini",
      GEMINI_API_KEY: "test-key",
    };

    const view = buildLlmCostGovernanceView({
      env,
      generatedAt: NOW,
      plannerAudit: buildPlannerAudit(),
      agentRuns: [],
      providerReadiness: buildProviderReadinessReports(env, NOW),
    });

    expect(view.liveCallAllowed).toBe(false);
    expect(view.statusLabel).toBe("실제 호출 차단");
    expect(view.decisionSummary).toContain("규칙 기반 대체");
    expect(view.rateBasisLabel).toContain("공식 USD 가격표");
    expect(view.gateChecks.find((check) => check.id === "rate-policy")?.tone).toBe("blocked");
    expect(view.gateChecks.find((check) => check.id === "run-budget")?.tone).toBe("blocked");
    expect(view.gateChecks.find((check) => check.id === "daily-budget")?.tone).toBe("blocked");
  });

  it("역할별 설정 모델 가격을 공식 기준으로 함께 보여준다", () => {
    const env = {
      AI_LLM_PROVIDER: "gemini",
      AI_LLM_MODEL_DEFAULT: "gemini-3.1-flash-lite",
      AI_LLM_MODEL_STRATEGIC: "gemini-3.5-flash",
      AI_LLM_MODEL_REVIEWER: "gemini-3.5-flash",
      GEMINI_API_KEY: "test-key",
    };

    const view = buildLlmCostGovernanceView({
      env,
      generatedAt: NOW,
      plannerAudit: buildPlannerAudit(),
      agentRuns: [],
      providerReadiness: buildProviderReadinessReports(env, NOW),
    });

    expect(view.modelLabel).toBe("모델 gemini-3.5-flash");
    expect(view.officialPricingRows).toEqual([
      expect.objectContaining({
        modelKey: "gemini-3.5-flash",
        roleLabel: "전략 / 검토 · 현재 호출 후보",
        inputPriceLabel: "입력 $1.50 / 100만 토큰",
        outputPriceLabel: "출력 $9.00 / 100만 토큰",
        tone: "active",
      }),
      expect.objectContaining({
        modelKey: "gemini-3.1-flash-lite",
        roleLabel: "기본",
        inputPriceLabel: "입력 $0.25 / 100만 토큰",
        outputPriceLabel: "출력 $1.50 / 100만 토큰",
        tone: "reference",
      }),
    ]);
  });

  it("1회 예산, 일 예산, 토큰 상한을 넘으면 호출을 차단한다", () => {
    const env = {
      AI_LLM_PROVIDER: "gemini",
      GEMINI_API_KEY: "test-key",
      AI_LLM_COST_PER_1K_INPUT_KRW: "100",
      AI_LLM_COST_PER_1K_OUTPUT_KRW: "100",
      AI_LLM_DAILY_BUDGET_KRW: "50",
      AI_LLM_RUN_BUDGET_KRW: "10",
      AI_LLM_MAX_INPUT_TOKENS: "100",
      AI_LLM_MAX_OUTPUT_TOKENS: "10",
      AI_LLM_MAX_TOTAL_TOKENS: "120",
    };

    const view = buildLlmCostGovernanceView({
      env,
      generatedAt: NOW,
      plannerAudit: buildPlannerAudit({
        tokenUsage: {
          inputEstimate: 800,
          outputEstimate: 200,
          totalEstimate: 1000,
          rawRowsIncluded: false,
        },
      }),
      agentRuns: [buildAgentRun({ estimatedCostKrw: 25 })],
      providerReadiness: buildProviderReadinessReports(env, NOW),
    });

    expect(view.liveCallAllowed).toBe(false);
    expect(view.gateChecks.find((check) => check.id === "run-budget")?.tone).toBe("blocked");
    expect(view.gateChecks.find((check) => check.id === "daily-budget")?.tone).toBe("blocked");
    expect(view.gateChecks.find((check) => check.id === "input-token-cap")?.tone).toBe("blocked");
    expect(view.gateChecks.find((check) => check.id === "output-token-cap")?.tone).toBe("blocked");
    expect(view.gateChecks.find((check) => check.id === "total-token-cap")?.tone).toBe("blocked");
  });
});

function buildPlannerAudit(overrides: Partial<LlmPlannerAuditRun> = {}): LlmPlannerAuditRun {
  return {
    id: "agentrun-moa-planner-test",
    runnerKey: "moa_planner",
    plannerInputId: "llm-input-test",
    plannerResultId: "llm-result-test",
    mode: "deterministic_fallback",
    provider: "deterministic",
    model: "deterministic-fallback",
    tokenUsage: {
      inputEstimate: 1200,
      outputEstimate: 520,
      totalEstimate: 1720,
      rawRowsIncluded: false,
    },
    billing: {
      state: "NOT_BILLED_FALLBACK",
      estimatedCostKrw: 0,
      basis: "deterministic fallback",
    },
    sourceCounts: {
      candidateSummaries: 2,
      selectedApprovals: 1,
      evidenceIds: 3,
      providerEvidenceNotes: 4,
    },
    evidenceIds: ["evidence-test"],
    createdAt: NOW,
    ...overrides,
  };
}

function buildAgentRun(input: { estimatedCostKrw: number }): AgentRun {
  return {
    id: `agentrun-cost-${input.estimatedCostKrw}`,
    runnerKey: "moa",
    runType: "moa_planner",
    mode: "llm",
    provider: "gemini",
    model: "gemini-test",
    status: "SUCCEEDED",
    inputSummary: "테스트 입력",
    outputSummary: "테스트 출력",
    rawRowsIncluded: false,
    tokenUsage: {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      estimated: true,
      estimatedCostKrw: input.estimatedCostKrw,
      basis: "test",
    },
    evidenceIds: ["evidence-test"],
    startedAt: NOW,
    finishedAt: NOW,
  };
}
