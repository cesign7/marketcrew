import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkDeskCardList } from "../../src/components/agenda-room/WorkDeskCardList";
import type { WorkDeskCardView } from "../../src/features/agenda-room/types";

describe("WorkDeskCardList", () => {
  it("키워드, 성과, 유지 예외, 첫 승인 위임 기준을 간결한 카드로 보여준다", () => {
    const html = renderToString(
      createElement(WorkDeskCardList, {
        title: "키워드별 업무카드",
        cards: [buildKeywordCard()],
      }),
    );

    expect(html).toContain("생일 답례품");
    expect(html).toContain("최근 7일 클릭 64회");
    expect(html).toContain("즉시 중지 전 유지 예외");
    expect(html).toContain("대표 첫 승인 필요");
    expect(html).toContain("다음부터 모아에게 위임");
  });
});

function buildKeywordCard(): WorkDeskCardView {
  return {
    id: "work-desk-card-test",
    ownerId: "gro",
    ownerName: "그로",
    parentTitle: "저성과 검색광고 키워드 조정 안건",
    title: "생일 답례품 조정 검토",
    brandLabel: "스티커씨",
    domainLabel: "검색광고",
    statusLabel: "대표 첫 승인 필요",
    priorityLabel: "높음",
    routeLabel: "모아 검토 후 대표 승인",
    keywordLabel: "생일 답례품",
    contextLabels: ["스티커씨 검색광고", "대표 상품", "기기 전체", "시간 09-23"],
    metricLabels: ["최근 7일 클릭 64회", "비용 38,400원", "주문 0건"],
    diagnosisLabel: "클릭은 있으나 주문 없음",
    recommendedActionLabel: "입찰 하향 또는 일시중지 검토",
    reasonLabel: "주문은 없지만 시즌/브랜드 핵심 키워드일 수 있으므로 즉시 중지 전 유지 예외를 먼저 확인합니다.",
    evidenceLabels: ["근거 ad-perf-test"],
    detailHref: "/approvals",
    delegation: {
      state: "OWNER_FIRST_APPROVAL_REQUIRED",
      label: "대표 첫 승인 필요",
      summary: "처음 실행하는 키워드 조정 유형은 대표가 먼저 승인합니다.",
      ruleHint: "승인 시 같은 브랜드, 같은 진단, 같은 조정 한도는 다음부터 모아에게 위임할 수 있습니다.",
      reportLabel: "모아 자동 처리 후에도 대표에게 결과 보고",
    },
  };
}
