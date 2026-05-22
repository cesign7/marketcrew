import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiEvidenceBriefPanel } from "../../src/components/agenda-room/AiEvidenceBriefPanel";
import type { AiEvidenceBriefView } from "../../src/features/agenda-room/types";

describe("AiEvidenceBriefPanel", () => {
  it("AI가 읽는 요약 근거와 막아야 할 판단을 한글로 보여준다", () => {
    const html = renderToString(createElement(AiEvidenceBriefPanel, { briefs: buildBriefs() }));

    expect(html).toContain("AI 판독용 요약 근거");
    expect(html).toContain("판단 가능");
    expect(html).toContain("원천 확인 필요");
    expect(html).toContain("광고비/입찰가 즉시 변경");
    expect(html).toContain("원천 행 제외, 요약 근거와 근거 ID만 사용");
    expect(html).not.toContain("JUDGMENT_READY");
    expect(html).not.toContain("SOURCE_REVIEW_REQUIRED");
  });
});

function buildBriefs(): AiEvidenceBriefView[] {
  return [
    {
      id: "ai-evidence-search-ad",
      providerKey: "search_ad",
      channelLabel: "네이버 키워드광고",
      title: "네이버 키워드광고 AI 판독 근거",
      decisionLabel: "판단 가능",
      tone: "ready",
      summary: "상위 키워드 2개와 최대 월검색 16,000회를 요약 근거로 사용합니다.",
      allowedUseCases: ["키워드 확장 후보 선별"],
      blockedUseCases: ["광고비/입찰가 즉시 변경"],
      evidenceIds: ["kw-1", "kw-2"],
      sourceReportIds: ["provider-sync-search-ad"],
      checkedAt: "2026-05-22 11:00",
      rawDataPolicyLabel: "원천 행 제외, 요약 근거와 근거 ID만 사용",
    },
    {
      id: "ai-evidence-datalab",
      providerKey: "datalab",
      channelLabel: "네이버 데이터랩",
      title: "데이터랩 AI 보조 근거",
      decisionLabel: "원천 확인 필요",
      tone: "warning",
      summary: "검색어 그룹 1개의 상대 추이만 사용합니다.",
      allowedUseCases: ["시즌 흐름 보조 판단"],
      blockedUseCases: ["절대 검색량 판단"],
      evidenceIds: ["trend-1"],
      sourceReportIds: ["provider-sync-datalab"],
      checkedAt: "2026-05-22 11:00",
      rawDataPolicyLabel: "원천 행 제외, 요약 근거와 근거 ID만 사용",
    },
  ];
}
