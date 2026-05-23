import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProviderEvidenceExpansionPlanPanel } from "../../src/components/agenda-room/ProviderEvidenceExpansionPlanPanel";
import { buildProviderEvidenceExpansionPlans } from "../../src/features/agenda-room/provider-evidence-expansion-plans";

describe("ProviderEvidenceExpansionPlanPanel", () => {
  it("판단 근거를 어떤 순서로 늘릴지 한글 계획으로 보여준다", () => {
    const html = renderToString(
      createElement(ProviderEvidenceExpansionPlanPanel, {
        plans: buildProviderEvidenceExpansionPlans(),
      }),
    );

    expect(html).toContain("판단 근거 확장 순서");
    expect(html).toContain("1단계");
    expect(html).toContain("광고그룹 실제 설정");
    expect(html).toContain("PC/모바일 집행 설정");
    expect(html).toContain("기기·시간대·요일 성과");
    expect(html).toContain("스마트스토어 순매출과 클레임");
    expect(html).toContain("데이터랩 세그먼트");
    expect(html).toContain("스마트스토어 데이터솔루션");
    expect(html).not.toContain("PC_MOBILE_TARGET");
  });
});
