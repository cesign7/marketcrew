import { describe, expect, it, vi } from "vitest";
import { runGeminiPlannerPilot } from "../../src/lib/llm/gemini-planner";
import type { LlmPlannerInput } from "../../src/lib/domain";
import { getProviderHistoryPolicy } from "../../src/lib/domain";

const GENERATED_AT = "2026-05-23T03:20:00.000Z";

describe("Gemini planner pilot", () => {
  it("집계 요약 입력만 보내고 Gemini 응답을 결재 후보 결과로 정규화한다", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const prompt = body.contents[0].parts[0].text as string;
      expect(prompt).toContain("원천 행");
      expect(prompt).toContain("approval-real-1");
      expect(prompt).toContain("스티커씨와 커피프린트는 서로 다른 브랜드");
      expect(prompt).toContain("두 브랜드의 매출이나 예산을 비교하거나 하나의 균형 안건으로 묶지 않는다");
      expect(prompt).not.toContain("customerName");

      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: "실제 수집 기반 우선 안건",
                      summary: "스티커씨 상위 상품과 커피프린트 재구매 안건을 먼저 검토합니다.",
                      recommendedApprovalIds: ["approval-real-1", "unknown-approval"],
                      evidenceIds: ["commerce-aggregate-stickersee-2026-05-23", "unknown-evidence"],
                      judgmentNotes: ["스마트스토어 주문 집계가 충분합니다."],
                      missingEvidenceRequests: ["광고비 대비 매출 연결은 다음 수집에서 확인합니다."],
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 900,
            candidatesTokenCount: 120,
            totalTokenCount: 1020,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const pilot = await runGeminiPlannerPilot({
      plannerInput: buildPlannerInput(),
      context: {
        providerSyncReports: [
          {
            id: "provider-sync-smartstore-2026-05-23",
            provider: "smartstore",
            label: "스마트스토어(스티커씨) 읽기 전용 수집",
            status: "SYNCED",
            readOnly: true,
            networkAttempted: true,
            writeAttempted: false,
            endpoint: "https://api.commerce.naver.com",
            sourceUrl: "https://apicenter.commerce.naver.com",
            missingEnvKeys: [],
            evidenceNotes: ["최근 30일 변경 주문 100건을 집계 전용으로 정규화했습니다."],
            checkedAt: GENERATED_AT,
            historyPolicy: getProviderHistoryPolicy("smartstore"),
            commerceAggregateSnapshot: {
              id: "commerce-aggregate-stickersee-2026-05-23",
              provider: "naver_commerce",
              brandKey: "STICKERSEE",
              windowDays: 30,
              paidOrderCount: 100,
              grossSales: 697220,
              topProductName: "생일축하스티커",
              topProductImageUrl: "https://example.com/product.jpg",
              dataSolutionAvailable: false,
              collectedAt: GENERATED_AT,
              dataScope: "aggregate_only",
            },
          },
        ],
        keywordDemandSnapshots: [],
        searchTrendSnapshots: [],
      },
      env: {
        AI_LLM_PROVIDER: "gemini",
        AI_LLM_MODEL_STRATEGIC: "gemini-3.5-flash",
        GEMINI_API_KEY: "test-key",
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      generatedAt: GENERATED_AT,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-goog-api-key": "test-key",
        }),
      }),
    );
    expect(pilot.result.mode).toBe("llm_ready");
    expect(pilot.result.recommendedApprovalIds).toEqual(["approval-real-1"]);
    expect(pilot.result.evidenceIds).toEqual(["commerce-aggregate-stickersee-2026-05-23"]);
    expect(pilot.result.rawRowsIncluded).toBe(false);
    expect(pilot.audit.provider).toBe("gemini");
    expect(pilot.audit.model).toBe("gemini-3.5-flash");
    expect(pilot.audit.tokenUsage.totalEstimate).toBe(1020);
    expect(pilot.audit.billing.estimatedCostKrw).toBeGreaterThan(0);
  });

  it("Gemini 응답에 사용 중단된 교차 브랜드 판단 문구가 섞이면 규칙 기반 요약으로 되돌린다", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: "스마트스토어/자체몰 매출 균형 점검",
                      summary: "스마트스토어와 자체몰의 매출 균형을 통합 검토해야 합니다.",
                      recommendedApprovalIds: ["approval-real-1"],
                      evidenceIds: ["commerce-aggregate-stickersee-2026-05-23"],
                      judgmentNotes: [],
                      missingEvidenceRequests: [],
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 900,
            candidatesTokenCount: 120,
            totalTokenCount: 1020,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const pilot = await runGeminiPlannerPilot({
      plannerInput: buildPlannerInput(),
      context: {
        providerSyncReports: [],
        keywordDemandSnapshots: [],
        searchTrendSnapshots: [],
      },
      env: {
        AI_LLM_PROVIDER: "gemini",
        AI_LLM_MODEL_STRATEGIC: "gemini-3.5-flash",
        GEMINI_API_KEY: "test-key",
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      generatedAt: GENERATED_AT,
    });

    expect(pilot.result.recommendedApprovalIds).toEqual(["approval-real-1"]);
    expect(pilot.result.title).toBe("모아 실제 AI 파일럿 요약");
    expect(pilot.result.summary).not.toContain("스마트스토어/자체몰");
    expect(pilot.result.summary).not.toContain("매출 균형");
  });
});

function buildPlannerInput(): LlmPlannerInput {
  return {
    id: `planner-input-${GENERATED_AT}`,
    generatedAt: GENERATED_AT,
    source: "signal_summary",
    rawRowsIncluded: false,
    candidateSummaries: [
      {
        approvalRequestId: "approval-real-1",
        title: "스마트스토어 상위 상품 키워드 확장 안건",
        owner: "pro",
        status: "PENDING",
        confidence: "READY_TO_APPROVE",
        riskLevel: "LOW",
        summary: "상위 상품 매출과 키워드 수요를 연결해 상품명/키워드 개선 초안을 검토합니다.",
        evidenceIds: ["commerce-aggregate-stickersee-2026-05-23"],
      },
    ],
    constraints: {
      privacy: "aggregate_only",
      maxCandidates: 5,
      externalWriteAllowed: false,
    },
  };
}
