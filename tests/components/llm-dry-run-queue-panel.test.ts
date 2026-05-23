import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LlmDryRunQueuePanel } from "../../src/components/agenda-room/LlmDryRunQueuePanel";
import { buildAgendaRoomViewModel } from "../../src/features/agenda-room/buildAgendaRoomViewModel";

describe("LlmDryRunQueuePanel", () => {
  it("AI 실행 대기 상태와 비용 가드를 자연스러운 한글로 보여준다", () => {
    const viewModel = buildAgendaRoomViewModel({ env: {} });
    const html = renderToString(createElement(LlmDryRunQueuePanel, { queue: viewModel.llmDryRunQueue }));

    expect(html).toContain("AI 실행 큐");
    expect(html).toContain("비용 가드 차단");
    expect(html).toContain("모의 실행만 기록");
    expect(html).toContain("원천 행 제외");
    expect(html).toContain("실제 호출 전");
    expect(html).not.toContain("dry-run");
    expect(html).not.toContain("live call");
    expect(html).not.toContain("blocked");
  });
});
