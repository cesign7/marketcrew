import { describe, expect, it } from "vitest";
import { truncateDisplayText } from "@/features/search-ad/domain/displayText";

describe("display text helpers", () => {
  it("긴 상품명은 지정 길이까지 보이고 말줄임표를 붙인다", () => {
    const title = "생일축하스티커 생일01 답례품 감사 소량 주문 어린이집 유치원 학원 선물 답례 스티커제작";

    expect(truncateDisplayText(title, 18)).toBe("생일축하스티커 생일01 답례품…");
  });

  it("짧은 표시명은 그대로 둔다", () => {
    expect(truncateDisplayText("스티커소량제작", 18)).toBe("스티커소량제작");
  });
});
