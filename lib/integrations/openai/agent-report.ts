import type { AgentReport, AgentStatus } from "@/lib/domain/agents";

export type AiAgentMode = "off" | "llm-shadow" | "llm-assisted";
export type AiAgentProvider = "openai";

export interface EnabledAiAgentConfig {
  enabled: true;
  mode: Exclude<AiAgentMode, "off">;
  provider: AiAgentProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
}

export interface DisabledAiAgentConfig {
  enabled: false;
  mode: AiAgentMode;
  provider: AiAgentProvider;
  model: string;
  reason: string;
}

export type AiAgentConfig = EnabledAiAgentConfig | DisabledAiAgentConfig;

export interface AgentReportRequestInput {
  model: string;
  characterName: string;
  roleName: string;
  workBrief: string;
}

export interface ParsedAgentReportOutput {
  summary: string;
  status: AgentStatus;
  mood: AgentReport["mood"];
  confidence: number;
  proposedNextSteps: string[];
}

interface RequestOpenAiAgentReportInput extends AgentReportRequestInput {
  config: EnabledAiAgentConfig;
  fetchFn?: typeof fetch;
}

type EnvLike = Record<string, string | undefined>;

const agentStatuses = ["IDLE", "WORKING", "DONE", "NEEDS_ATTENTION"] as const;
const agentMoods = ["calm", "excited", "worried", "focused"] as const;
const defaultModel = "gpt-5.2";
const defaultBaseUrl = "https://api.openai.com/v1";

export function getAiAgentConfig(env: EnvLike = process.env): AiAgentConfig {
  const mode = parseMode(env.AI_AGENT_MODE);
  const provider = "openai";
  const model =
    cleanString(env.AI_AGENT_MODEL) ??
    cleanString(env.OPENAI_MODEL) ??
    cleanString(env.LLM_MODEL) ??
    defaultModel;
  const apiKey = cleanString(env.OPENAI_API_KEY);
  const baseUrl =
    cleanString(env.OPENAI_BASE_URL) ??
    cleanString(env.AI_AGENT_OPENAI_BASE_URL) ??
    defaultBaseUrl;

  if (mode === "off") {
    return {
      enabled: false,
      mode,
      provider,
      model,
      reason: "AI_AGENT_MODE is off.",
    };
  }

  if (!apiKey) {
    return {
      enabled: false,
      mode,
      provider,
      model,
      reason: "OPENAI_API_KEY is missing.",
    };
  }

  return {
    enabled: true,
    mode,
    provider,
    model,
    apiKey,
    baseUrl,
  };
}

export function buildOpenAiAgentReportRequest({
  model,
  characterName,
  roleName,
  workBrief,
}: AgentReportRequestInput) {
  return {
    model,
    store: false,
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text:
              "You are a MarketCrew AI operator. Return only the requested structured report. " +
              "Do not claim that external advertising changes were executed. " +
              "Suggestions must remain approval-first and Search Ad write-safe.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Character: ${characterName}`,
              `Role: ${roleName}`,
              "Work brief:",
              workBrief,
            ].join("\n"),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "marketcrew_agent_report",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: [
            "summary",
            "status",
            "mood",
            "confidence",
            "proposedNextSteps",
          ],
          properties: {
            summary: {
              type: "string",
              minLength: 10,
              maxLength: 500,
            },
            status: {
              type: "string",
              enum: agentStatuses,
            },
            mood: {
              type: "string",
              enum: agentMoods,
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            proposedNextSteps: {
              type: "array",
              minItems: 1,
              maxItems: 5,
              items: {
                type: "string",
                minLength: 2,
                maxLength: 160,
              },
            },
          },
        },
      },
    },
  };
}

export async function requestOpenAiAgentReport({
  config,
  model,
  characterName,
  roleName,
  workBrief,
  fetchFn = fetch,
}: RequestOpenAiAgentReportInput) {
  const response = await fetchFn(`${config.baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      buildOpenAiAgentReportRequest({
        model,
        characterName,
        roleName,
        workBrief,
      }),
    ),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Responses API failed with HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  return {
    report: parseAgentReportOutput(extractResponseOutputText(payload)),
    raw: payload,
  };
}

export function parseAgentReportOutput(outputText: string): ParsedAgentReportOutput {
  let parsed: unknown;

  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("LLM agent report output is not valid JSON.");
  }

  const json = objectFromJson(parsed);
  const summary = stringFromJson(json.summary);
  const status = enumFromJson(json.status, agentStatuses);
  const mood = enumFromJson(json.mood, agentMoods);
  const confidence = numberFromJson(json.confidence);
  const proposedNextSteps = stringArrayFromJson(json.proposedNextSteps).slice(0, 5);

  if (!summary || !status || !mood || confidence === null) {
    throw new Error("LLM agent report output does not match the required schema.");
  }

  return {
    summary,
    status,
    mood,
    confidence,
    proposedNextSteps,
  };
}

export function extractResponseOutputText(payload: unknown) {
  const json = objectFromJson(payload);
  const output = Array.isArray(json.output) ? json.output : [];

  for (const item of output) {
    const content = objectFromJson(item).content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      const partJson = objectFromJson(part);

      if (partJson.type === "output_text") {
        const text = stringFromJson(partJson.text);

        if (text) {
          return text;
        }
      }
    }
  }

  const outputText = stringFromJson(json.output_text);

  if (outputText) {
    return outputText;
  }

  throw new Error("OpenAI response did not include output_text.");
}

function parseMode(value: unknown): AiAgentMode {
  if (value === "llm-shadow" || value === "llm-assisted") {
    return value;
  }

  return "off";
}

function objectFromJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function stringFromJson(value: unknown) {
  return typeof value === "string" ? cleanString(value) : null;
}

function cleanString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberFromJson(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArrayFromJson(value: unknown) {
  return Array.isArray(value)
    ? value.map(stringFromJson).filter((item): item is string => Boolean(item))
    : [];
}

function enumFromJson<T extends string>(
  value: unknown,
  allowed: readonly T[],
) {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : null;
}
