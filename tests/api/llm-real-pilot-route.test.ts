import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../src/app/api/operations/llm-real-pilot/route";
import { runAgendaCycle } from "../../src/lib/application/agenda-cycle";
import { createFileMarketingWorkflowRepository } from "../../src/lib/persistence/file-repository";
import { persistProviderSyncReports } from "../../src/lib/persistence/workflow-store";
import { SampleProviderAdapter } from "../../src/lib/integrations/sample/provider";
import { getProviderHistoryPolicy } from "../../src/lib/domain";

let temporaryDirectory: string | undefined;
let storePath: string;
const previousEnv: Record<string, string | undefined> = {};

const ENV_KEYS = [
  "MARKETCREW_REPOSITORY_MODE",
  "MARKETCREW_WORKFLOW_STORE_PATH",
  "MARKETCREW_BACKEND_API_URL",
  "MARKETCREW_API_BASE_URL",
  "AI_LLM_PROVIDER",
  "AI_LLM_MODEL_STRATEGIC",
  "AI_LLM_MODEL_DEFAULT",
  "GEMINI_API_KEY",
];

beforeEach(() => {
  for (const key of ENV_KEYS) {
    previousEnv[key] = process.env[key];
  }

  temporaryDirectory = mkdtempSync(join(tmpdir(), "marketcrew2-llm-real-pilot-route-"));
  storePath = join(temporaryDirectory, "workflow-store.json");
  process.env.MARKETCREW_REPOSITORY_MODE = "file";
  process.env.MARKETCREW_WORKFLOW_STORE_PATH = storePath;
  delete process.env.MARKETCREW_BACKEND_API_URL;
  delete process.env.MARKETCREW_API_BASE_URL;
  process.env.AI_LLM_PROVIDER = "gemini";
  process.env.AI_LLM_MODEL_STRATEGIC = "gemini-3.5-flash";
  process.env.AI_LLM_MODEL_DEFAULT = "gemini-3.1-flash-lite";
  process.env.GEMINI_API_KEY = "test-gemini-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of ENV_KEYS) {
    const value = previousEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  if (temporaryDirectory) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

describe("llm real pilot route", () => {
  it("실제 호출 파일럿 결과를 저장하되 외부 쓰기 없이 AgentRun에 기록한다", async () => {
    const repository = createFileMarketingWorkflowRepository(storePath);
    runAgendaCycle({
      sampleProvider: new SampleProviderAdapter(),
      repository,
    });
    persistProviderSyncReports(repository, [
      {
        id: "provider-sync-smartstore-test",
        provider: "smartstore",
        label: "스마트스토어(스티커씨) 읽기 전용 수집",
        status: "SYNCED",
        readOnly: true,
        networkAttempted: true,
        writeAttempted: false,
        endpoint: "https://api.commerce.naver.com",
        sourceUrl: "https://apicenter.commerce.naver.com",
        missingEnvKeys: [],
        evidenceNotes: ["최근 30일 주문 100건을 집계했습니다."],
        checkedAt: "2026-05-23T03:30:00.000Z",
        historyPolicy: getProviderHistoryPolicy("smartstore"),
      },
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        title: "실제 AI 파일럿",
                        summary: "실제 수집 근거로 부처님오신날 선물카드 안건을 우선 검토합니다.",
                        recommendedApprovalIds: ["approval-agenda-season-plan-buddha-gift-card"],
                        evidenceIds: ["kw-demand-buddha-gift-card"],
                        judgmentNotes: ["시즌 수요와 주문 근거를 함께 봅니다."],
                        missingEvidenceRequests: [],
                      }),
                    },
                  ],
                },
              },
            ],
            usageMetadata: {
              promptTokenCount: 800,
              candidatesTokenCount: 100,
              totalTokenCount: 900,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const response = await POST(new Request("http://127.0.0.1/api/operations/llm-real-pilot", { method: "POST" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("SUCCEEDED");
    expect(payload.inputPolicy.rawRowsIncluded).toBe(false);
    expect(payload.costGovernance.liveCallAllowed).toBe(true);
    expect(payload.llmResult.mode).toBe("llm_ready");
    expect(payload.agentRun.provider).toBe("gemini");

    const savedRepository = createFileMarketingWorkflowRepository(storePath);
    expect(savedRepository.listAiOperationsSettings()).toHaveLength(1);
    expect(savedRepository.listAgentRuns().some((run) => run.mode === "llm" && run.provider === "gemini")).toBe(true);
  });
});
