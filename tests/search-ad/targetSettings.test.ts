import { describe, expect, it } from "vitest";
import { OPERATION_TIME_POLICY_ITEMS, describeCriterionScheduleCode, describeTargetSetting } from "@/features/search-ad/domain/targetSettings";

describe("targetSettings", () => {
  it("PC/모바일 타게팅 설정을 한국어로 설명한다", () => {
    expect(describeTargetSetting("PC_MOBILE_TARGET", { pc: true, mobile: false })).toEqual({
      targetTypeLabel: "기기",
      settingLabel: "PC만 노출",
    });
  });

  it("보고서 시간대 코드를 요일/시간으로 설명한다", () => {
    expect(describeCriterionScheduleCode("SDMON0820")).toBe("월요일 8:00~20:00");
  });

  it("운영시간 기준은 평일, 토요일, 일요일, 시즌 예외를 분리한다", () => {
    expect(OPERATION_TIME_POLICY_ITEMS.map((item) => item.title)).toEqual(["월~금", "토요일", "일요일", "시즌 그룹"]);
    expect(OPERATION_TIME_POLICY_ITEMS.find((item) => item.title === "일요일")?.value).toBe("기본 OFF");
  });
});
