import { describe, expect, it } from "vitest";
import { analyzeKeywordDiagnostics } from "./keyword-diagnostics";

describe("analyzeKeywordDiagnostics", () => {
  it("reports data issues without generating proposals", () => {
    const result = analyzeKeywordDiagnostics({
      quality: {
        status: "NO_PERFORMANCE_ROWS",
        canDiagnose: false,
        title: "성과 데이터가 비어 있습니다",
        detail: "성과 row가 없습니다.",
        nextAction: "성과 동기화를 다시 실행하세요.",
      },
      keywords: [],
    });

    expect(result.proposals).toEqual([]);
    expect(result.reports.map((report) => report.agentKey)).toEqual([
      "GENERAL_MANAGER",
      "KEYWORD_STRATEGIST",
    ]);
    expect(result.reports[0].summary).toContain("성과 데이터가 비어 있습니다");
  });

  it("creates a brand defense proposal when a brand keyword is below first place", () => {
    const result = analyzeKeywordDiagnostics({
      quality: readyQuality(),
      keywords: [
        keyword({
          keywordId: "kw-brand",
          keyword: "커피프린트",
          avgRank: 2.2,
          clicks: 30,
          conversions: 3,
          cost: 12_000,
          conversionSales: 180_000,
        }),
      ],
    });

    expect(result.proposals).toContainEqual(
      expect.objectContaining({
        agentKey: "POSITION_DEFENDER",
        actionType: "KEYWORD_RULE_CHANGE",
        riskLevel: "MEDIUM",
        title: "'커피프린트' 1위 방어 후보",
      }),
    );
  });

  it("creates an efficient 2-3 rank keep proposal when conversions are healthy", () => {
    const result = analyzeKeywordDiagnostics({
      quality: readyQuality(),
      keywords: [
        keyword({
          keywordId: "kw-invite",
          keyword: "기업 초대장",
          avgRank: 2.4,
          clicks: 80,
          conversions: 5,
          cost: 50_000,
          conversionSales: 400_000,
        }),
      ],
    });

    expect(result.proposals).toContainEqual(
      expect.objectContaining({
        agentKey: "BID_OPTIMIZER",
        actionType: "KEYWORD_RULE_CHANGE",
        riskLevel: "LOW",
        title: "'기업 초대장' 2~3위 유지 후보",
      }),
    );
  });

  it("creates a negative keyword proposal for spend without conversions", () => {
    const result = analyzeKeywordDiagnostics({
      quality: readyQuality(),
      keywords: [
        keyword({
          keywordId: "kw-free",
          keyword: "무료 초대장 양식",
          avgRank: 2.7,
          clicks: 45,
          conversions: 0,
          cost: 35_000,
          conversionSales: 0,
        }),
      ],
    });

    expect(result.proposals).toContainEqual(
      expect.objectContaining({
        agentKey: "KEYWORD_STRATEGIST",
        actionType: "NEGATIVE_KEYWORD",
        riskLevel: "MEDIUM",
        title: "'무료 초대장 양식' 제외 키워드 후보",
      }),
    );
  });
});

function readyQuality() {
  return {
    status: "READY" as const,
    canDiagnose: true,
    title: "진단 준비 완료",
    detail: "준비됨",
    nextAction: "진단 실행",
  };
}

function keyword(overrides: Partial<KeywordInput> = {}): KeywordInput {
  return {
    keywordId: "kw-1",
    keyword: "기업 초대장",
    campaignId: "cmp-1",
    adgroupId: "grp-1",
    impressions: 1000,
    clicks: 50,
    cost: 20_000,
    conversions: 2,
    conversionSales: 200_000,
    avgRank: 2.2,
    avgCpc: 400,
    ...overrides,
  };
}

interface KeywordInput {
  keywordId: string;
  keyword: string;
  campaignId: string;
  adgroupId: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionSales: number;
  avgRank: number;
  avgCpc: number;
}
