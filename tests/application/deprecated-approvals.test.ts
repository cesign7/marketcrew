import { describe, expect, it } from "vitest";
import { containsDeprecatedCrossBrandJudgment } from "../../src/lib/application/deprecated-approvals";

describe("deprecated approval guards", () => {
  it("교차 브랜드 매출 균형 판단은 사용 중단 판단으로 본다", () => {
    expect(containsDeprecatedCrossBrandJudgment("스마트스토어와 자체몰의 매출 균형을 통합 검토합니다.")).toBe(true);
  });

  it("브랜드를 비교하지 않고 각각 판단한다는 문장은 차단하지 않는다", () => {
    expect(containsDeprecatedCrossBrandJudgment("스티커씨와 커피프린트는 비교하지 않고 각각의 안건으로 검토합니다.")).toBe(
      false,
    );
  });
});
