import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiPeopleOffice } from "../../src/components/people/AiPeopleOffice";
import {
  buildAiPeopleOfficeView,
  buildDefaultAiOperationsSettings,
} from "../../src/features/people/ai-operations-settings";
import type { AgentRun } from "../../src/lib/domain";

describe("AiPeopleOffice", () => {
  it("자유 탐색과 근거 요청 원칙을 캐릭터 롤모델 위에 보여준다", () => {
    const view = buildAiPeopleOfficeView({
      settings: buildDefaultAiOperationsSettings({ now: "2026-05-23T00:00:00.000Z" }),
      agentRuns: [],
      generatedAt: "2026-05-23T00:00:00.000Z",
    });
    const html = renderToString(createElement(AiPeopleOffice, { view }));

    expect(html).toContain("자유 탐색과 근거 요청 원칙");
    expect(html).toContain("정해진 이상신호만 확인하지 않고");
    expect(html).toContain("검증 후 안건화");
    expect(html).toContain("없는 데이터를 근거처럼 말하지 않음");
  });

  it("모의 실행 큐 내부 모델명을 화면에 그대로 노출하지 않는다", () => {
    const dryRunAgentRun: AgentRun = {
      id: "agent-run-llm-dry-run-test",
      runnerKey: "moa_llm_dry_run_queue",
      runType: "llm_dry_run",
      mode: "deterministic_fallback",
      provider: "local",
      model: "llm-dry-run-queue",
      status: "SUCCEEDED",
      inputSummary: "원천 행 없이 모의 실행 입력을 점검했습니다.",
      outputSummary: "모의 실행만 기록했습니다.",
      rawRowsIncluded: false,
      tokenUsage: {
        inputTokens: 1200,
        outputTokens: 300,
        totalTokens: 1500,
        estimated: true,
        estimatedCostKrw: 0,
        basis: "실제 호출 전 모의 실행이라 실제 AI 모델 과금 없음",
      },
      evidenceIds: ["evidence-1"],
      startedAt: "2026-05-23T00:00:00.000Z",
      finishedAt: "2026-05-23T00:01:00.000Z",
    };
    const view = buildAiPeopleOfficeView({
      settings: buildDefaultAiOperationsSettings({ now: "2026-05-23T00:00:00.000Z" }),
      agentRuns: [dryRunAgentRun],
      generatedAt: "2026-05-23T00:02:00.000Z",
    });
    const html = renderToString(createElement(AiPeopleOffice, { view }));

    expect(html).toContain("AI 실행 큐(모의 실행)");
    expect(html).not.toContain("llm-dry-run-queue");
  });
});
