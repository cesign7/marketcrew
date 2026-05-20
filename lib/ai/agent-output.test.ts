import { describe, expect, it } from "vitest";
import { parseAgentWorkDecisionOutput } from "./agent-output";

describe("parseAgentWorkDecisionOutput", () => {
  it("parses a valid structured agent decision", () => {
    expect(parseAgentWorkDecisionOutput(validDecision())).toMatchObject({
      report: {
        status: "NEEDS_ATTENTION",
        mood: "focused",
      },
      proposals: [
        {
          actionType: "REPORT_ONLY",
          confidence: 0.74,
        },
      ],
      memoryCandidates: [],
    });
  });

  it("rejects overlong proposal lists", () => {
    expect(() =>
      parseAgentWorkDecisionOutput({
        ...validDecision(),
        proposals: Array.from({ length: 9 }, () => validDecision().proposals[0]),
      }),
    ).toThrow("LLM agent decision output does not match the required schema.");
  });

  it("rejects unknown action types", () => {
    expect(() =>
      parseAgentWorkDecisionOutput({
        ...validDecision(),
        proposals: [
          {
            ...validDecision().proposals[0],
            actionType: "NAVER_WRITE_NOW",
          },
        ],
      }),
    ).toThrow("LLM agent decision output does not match the required schema.");
  });

  it("rejects output without a report summary", () => {
    const decision = validDecision();

    expect(() =>
      parseAgentWorkDecisionOutput({
        ...decision,
        report: {
          ...decision.report,
          summary: "",
        },
      }),
    ).toThrow("LLM agent decision output does not match the required schema.");
  });
});

function validDecision() {
  return {
    report: {
      status: "NEEDS_ATTENTION",
      mood: "focused",
      summary:
        "승인 후보와 데이터 공백을 분리해서 오늘 처리할 수 있는 안전한 다음 업무를 정리했습니다.",
    },
    proposals: [
      {
        actionType: "REPORT_ONLY",
        riskLevel: "LOW",
        title: "시즌 스티커 번들 테스트",
        reason:
          "최근 스티커 키워드의 탐색 의도가 높아져 소형 번들 랜딩 테스트가 적합합니다.",
        expectedImpact:
          "소액 테스트로 신규 서비스 반응을 확인하고 이후 광고 문안을 좁힐 수 있습니다.",
        evidenceRefs: ["keyword:스티커 제작"],
        confidence: 0.74,
        beforeJson: {},
        afterJson: {
          kind: "SERVICE_IDEA",
          nextStep: "스티커 번들 랜딩 초안을 만들고 클릭률을 측정합니다.",
        },
      },
    ],
    memoryCandidates: [],
  };
}
