import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EvidenceRequestQueuePanel } from "../../src/components/agenda-room/EvidenceRequestQueuePanel";
import { buildAgendaRoomViewModel } from "../../src/features/agenda-room/buildAgendaRoomViewModel";

describe("EvidenceRequestQueuePanel", () => {
  it("검증 대기 가설과 승격 가능한 가설을 한글로 보여준다", () => {
    const viewModel = buildAgendaRoomViewModel({ env: {} });
    const html = renderToString(
      createElement(EvidenceRequestQueuePanel, {
        queue: viewModel.evidenceRequestQueue,
      }),
    );

    expect(html).toContain("근거 요청 큐");
    expect(html).toContain("검증 전 결재 승격 차단");
    expect(html).toContain("부처님오신날 선물카드 모바일 저녁 광고 가설");
    expect(html).toContain("데이 확인 대기");
    expect(html).toContain("승격 가능");
    expect(html).not.toContain("WAITING_EVIDENCE");
    expect(html).not.toContain("VERIFIED");
    expect(html).not.toContain("REQUESTED");
  });
});
