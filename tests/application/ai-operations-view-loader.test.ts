import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAiPeopleOfficeView,
  buildDefaultAiOperationsSettings,
  resolveAiOperationsSettings,
} from "../../src/features/people/ai-operations-settings";

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

  it("인사과 기본 문구와 기존 저장 문구를 자연스러운 한국어로 보여준다", () => {
    const fallback = buildDefaultAiOperationsSettings({ now: "2026-05-23T00:00:00.000Z" });
    const [moaProfile, ...otherProfiles] = fallback.characterProfiles;
    if (!moaProfile) {
      throw new Error("기본 모아 프로필이 필요합니다.");
    }
    const settings = resolveAiOperationsSettings({
      stored: {
        ...fallback,
        characterProfiles: [
          {
            ...moaProfile,
            departmentRole: "CRM 담당자",
            roleModel: "Chief of Staff처럼 보고합니다.",
          },
          ...otherProfiles,
        ],
      },
      now: "2026-05-23T00:00:00.000Z",
    });
    const view = buildAiPeopleOfficeView({
      settings,
      agentRuns: [],
      generatedAt: "2026-05-23T00:00:00.000Z",
    });
    const visibleText = JSON.stringify({
      profiles: view.settings.characterProfiles.map((profile) => ({
        departmentRole: profile.departmentRole,
        roleModel: profile.roleModel,
      })),
      modelOptions: view.modelOptions.map((option) => option.label),
      sourceNote: view.sourceNote,
    });

    expect(visibleText).toContain("대표 비서실장");
    expect(visibleText).toContain("고객 관리 담당자");
    expect(visibleText).toContain("제미나이 3.5 빠른 모델");
    expect(visibleText).not.toMatch(/Chief of Staff|Performance Marketer|Merchandiser|Creative Strategist|Lifecycle Marketer|FP&A Controller|BI Analyst|AgentRun|CRM 담당자/);
  });
});
