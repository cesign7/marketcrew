import { describe, expect, it } from "vitest";
import { SAMPLE_RULE_RESULTS } from "@/features/search-ad/domain/sampleData";
import { getRuleActionIntentLabel, getRuleResultActionIntentKey, parseRuleActionIntentFilter } from "@/features/search-ad/domain/ruleActionIntents";

describe("rule action intents", () => {
  it("주소의 조치 후보 필터를 허용된 값으로만 해석한다", () => {
    expect(parseRuleActionIntentFilter("negative_keyword")).toBe("negative_keyword");
    expect(parseRuleActionIntentFilter("unknown")).toBe("all");
    expect(parseRuleActionIntentFilter(undefined)).toBe("all");
  });

  it("규칙 결과의 근거 패킷에서 조치 후보 키를 꺼낸다", () => {
    const result = {
      ...SAMPLE_RULE_RESULTS[0],
      evidencePacket: {
        ...SAMPLE_RULE_RESULTS[0].evidencePacket,
        actionIntent: "landing_check",
      },
    };

    expect(getRuleResultActionIntentKey(result)).toBe("landing_check");
    expect(getRuleActionIntentLabel("landing_check")).toBe("랜딩 점검");
  });

  it("근거 패킷이 없는 옛 결과도 분류 기준으로 조치 후보를 보완한다", () => {
    const result = {
      ...SAMPLE_RULE_RESULTS[0],
      evidencePacket: {},
    };

    expect(getRuleResultActionIntentKey(result)).toBe("negative_keyword");
  });
});
