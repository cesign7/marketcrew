import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAiPeopleOfficeView, buildDefaultAiOperationsSettings } from "../../src/features/people/ai-operations-settings";

describe("AI operations view loader", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/backend/workflow-state-client");
    vi.doUnmock("@/features/agenda-room/loadAgendaRoomViewModel");
    vi.resetModules();
  });

  it("운영 화면에서는 전체 workflow-state 대신 AI 설정 전용 응답으로 인사과 화면을 만든다", async () => {
    const settings = buildDefaultAiOperationsSettings({
      now: "2026-05-23T00:00:00.000Z",
    });
    const peopleOfficeView = buildAiPeopleOfficeView({
      settings,
      agentRuns: [],
      generatedAt: "2026-05-23T00:00:00.000Z",
    });
    const readBackendAiOperationsSettings = vi.fn(async () => ({
      settings,
      peopleOfficeView,
    }));
    const loadWorkflowReadRepository = vi.fn(async () => {
      throw new Error("workflow-state should not be loaded");
    });

    vi.doMock("@/lib/backend/workflow-state-client", () => ({
      readBackendAiOperationsSettings,
    }));
    vi.doMock("@/features/agenda-room/loadAgendaRoomViewModel", () => ({
      loadWorkflowReadRepository,
    }));

    const { loadAiOperationsSettings, loadAiPeopleOfficeView } = await import(
      "../../src/features/people/loadAiOperationsView"
    );
    const env = {
      VERCEL: "1",
      MARKETCREW_BACKEND_API_URL: "https://marketcrew-api.example.test",
    } as unknown as NodeJS.ProcessEnv;

    await expect(loadAiOperationsSettings({ env })).resolves.toMatchObject({
      id: "default",
      budget: expect.objectContaining({ monthlyBudgetKrw: 100_000 }),
    });
    await expect(loadAiPeopleOfficeView({ env })).resolves.toMatchObject({
      settings: expect.objectContaining({ id: "default" }),
      monthlyBudgetLabel: "100,000원",
    });
    expect(readBackendAiOperationsSettings).toHaveBeenCalledTimes(2);
    expect(loadWorkflowReadRepository).not.toHaveBeenCalled();
  });
});
