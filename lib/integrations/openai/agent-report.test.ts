import { describe, expect, it } from "vitest";
import {
  buildOpenAiAgentReportRequest,
  extractResponseOutputText,
  getAiAgentConfig,
  parseAgentReportOutput,
} from "./agent-report";

describe("getAiAgentConfig", () => {
  it("keeps LLM agents disabled until an API key is configured", () => {
    expect(
      getAiAgentConfig({
        AI_AGENT_MODE: "llm-shadow",
        AI_AGENT_PROVIDER: "openai",
        AI_AGENT_MODEL: "gpt-5.2",
        OPENAI_API_KEY: "",
      }),
    ).toEqual({
      enabled: false,
      mode: "llm-shadow",
      provider: "openai",
      model: "gpt-5.2",
      reason: "OPENAI_API_KEY is missing.",
    });
  });

  it("enables OpenAI shadow mode when the key and model are present", () => {
    expect(
      getAiAgentConfig({
        AI_AGENT_MODE: "llm-shadow",
        AI_AGENT_PROVIDER: "openai",
        AI_AGENT_MODEL: "gpt-5.2",
        OPENAI_API_KEY: "sk-test",
      }),
    ).toMatchObject({
      enabled: true,
      mode: "llm-shadow",
      provider: "openai",
      model: "gpt-5.2",
    });
  });
});

describe("buildOpenAiAgentReportRequest", () => {
  it("builds a Responses API request with strict structured output", () => {
    const request = buildOpenAiAgentReportRequest({
      model: "gpt-5.2",
      characterName: "오피",
      roleName: "운영 총괄 AI",
      workBrief: "승인 필요 3건, 고위험 1건입니다.",
    });

    expect(request).toMatchObject({
      model: "gpt-5.2",
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "marketcrew_agent_report",
          strict: true,
        },
      },
    });
    expect(JSON.stringify(request.input)).toContain("오피");
    expect(JSON.stringify(request.input)).toContain("승인 필요 3건");
  });
});

describe("parseAgentReportOutput", () => {
  it("parses and sanitizes a valid structured agent report", () => {
    expect(
      parseAgentReportOutput(
        JSON.stringify({
          summary: "승인 후보를 먼저 처리하고, 제외 후보는 보류 없이 검토하세요.",
          status: "NEEDS_ATTENTION",
          mood: "focused",
          confidence: 0.82,
          proposedNextSteps: ["승인 후보 3건 검토", "제외 후보 기준 확인"],
        }),
      ),
    ).toEqual({
      summary: "승인 후보를 먼저 처리하고, 제외 후보는 보류 없이 검토하세요.",
      status: "NEEDS_ATTENTION",
      mood: "focused",
      confidence: 0.82,
      proposedNextSteps: ["승인 후보 3건 검토", "제외 후보 기준 확인"],
    });
  });

  it("rejects malformed model output", () => {
    expect(() => parseAgentReportOutput("{not json")).toThrow(
      "LLM agent report output is not valid JSON.",
    );
  });
});

describe("extractResponseOutputText", () => {
  it("extracts output_text content from a Responses API payload", () => {
    expect(
      extractResponseOutputText({
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: "{\"summary\":\"ok\"}",
              },
            ],
          },
        ],
      }),
    ).toBe("{\"summary\":\"ok\"}");
  });
});
