import { describe, expect, it } from "vitest";
import { getRuleRebuildMessage } from "@/components/search-ad/RuleRebuildPanel";

describe("rule rebuild panel helpers", () => {
  it("규칙 재계산 성공 메시지를 한글 건수로 보여준다", () => {
    expect(getRuleRebuildMessage({ ok: true, data: { saved: 1234 } }, 200)).toEqual({
      actionHref: "/rule-results",
      actionText: "규칙 결과 보기",
      kind: "success",
      text: "1,234건의 규칙 결과를 다시 만들었습니다.",
    });
  });

  it("백필 진행 중 차단 응답은 경고로 보여준다", () => {
    expect(
      getRuleRebuildMessage(
        {
          code: "SEARCH_AD_BACKFILL_RUNNING",
          message: "보고서 백필이 아직 진행 중입니다.",
          ok: false,
        },
        409,
      ),
    ).toEqual({
      kind: "warning",
      text: "보고서 백필이 아직 진행 중입니다.",
    });
  });
});
