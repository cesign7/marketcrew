import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiPilotInsightPanel } from "../../src/components/agenda-room/AiPilotInsightPanel";
import type { AiPilotInsightView } from "../../src/features/agenda-room/types";

describe("AiPilotInsightPanel", () => {
  it("저장된 실제 AI 판단과 안전 조건을 한글로 보여준다", () => {
    const html = renderToString(createElement(AiPilotInsightPanel, { insight: buildInsight() }));

    expect(html).toContain("실제 AI 판단");
    expect(html).toContain("AI 파일럿 판단");
    expect(html).toContain("저장된 판단");
    expect(html).toContain("연동 Gemini · 모델 gemini-3.5-flash");
    expect(html).toContain("실제 수집 근거로 우선 검토합니다.");
    expect(html).toContain("부처님오신날 선물카드 키워드 테스트 승인안");
    expect(html).toContain("키워드 수요 1개");
    expect(html).toContain("집계 요약과 근거 ID만 사용");
    expect(html).not.toContain("AgentRun");
    expect(html).not.toContain("live call");
  });
});

function buildInsight(): AiPilotInsightView {
  return {
    title: "AI 파일럿 판단",
    statusLabel: "저장된 판단",
    tone: "ready",
    summary: "실제 수집 근거로 우선 검토합니다.",
    modelLabel: "연동 Gemini · 모델 gemini-3.5-flash",
    tokenCostLabel: "입력 800토큰 · 출력 100토큰 · 총 900토큰 · 약 18원",
    evidenceLabel: "근거 2개 · 추천 안건 1건",
    finishedAtLabel: "2026-05-23 12:30",
    inputPolicyLabels: ["원천 행 제외", "집계 요약과 근거 ID만 사용", "외부 반영 없음"],
    recommendedApprovalLabels: ["부처님오신날 선물카드 키워드 테스트 승인안"],
    evidenceCategoryLabels: ["키워드 수요 1개", "스마트스토어 집계 1개"],
  };
}
