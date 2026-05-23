import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiPeopleOffice } from "../../src/components/people/AiPeopleOffice";
import {
  buildAiPeopleOfficeView,
  buildDefaultAiOperationsSettings,
} from "../../src/features/people/ai-operations-settings";

describe("AiPeopleOffice", () => {
  it("자유 탐색과 근거 요청 원칙을 캐릭터 롤모델 위에 보여준다", () => {
    const view = buildAiPeopleOfficeView({
      settings: buildDefaultAiOperationsSettings({ now: "2026-05-23T00:00:00.000Z" }),
      agentRuns: [],
      generatedAt: "2026-05-23T00:00:00.000Z",
    });
    const html = renderToString(createElement(AiPeopleOffice, { view }));

    expect(html).toContain("자유 탐색과 근거 요청 원칙");
    expect(html).toContain("정해진 이상신호만 확인하지 않고");
    expect(html).toContain("검증 후 안건화");
    expect(html).toContain("없는 데이터를 근거처럼 말하지 않음");
  });
});
