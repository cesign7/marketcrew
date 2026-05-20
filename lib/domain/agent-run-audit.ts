import { createHash } from "node:crypto";

export interface TokenUsageSummary {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export function buildAgentRunInputHash(value: unknown) {
  return createHash("sha256")
    .update(stableStringify(normalizeAgentRunJson(value)))
    .digest("hex");
}

export function normalizeAgentRunJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeAgentRunJson);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, normalizeAgentRunJson(item)]),
    );
  }

  return value;
}

export function summarizeTokenUsage(value: unknown): TokenUsageSummary {
  const usage = objectFromJson(objectFromJson(value).usage);

  return {
    inputTokens:
      numberFromJson(usage.input_tokens) ?? numberFromJson(usage.inputTokens),
    outputTokens:
      numberFromJson(usage.output_tokens) ?? numberFromJson(usage.outputTokens),
    totalTokens:
      numberFromJson(usage.total_tokens) ?? numberFromJson(usage.totalTokens),
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function objectFromJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function numberFromJson(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
