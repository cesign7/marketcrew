import { describe, expect, it } from "vitest";
import { describeCriterionScheduleCode, describeTargetSetting } from "@/features/search-ad/domain/targetSettings";

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
});
