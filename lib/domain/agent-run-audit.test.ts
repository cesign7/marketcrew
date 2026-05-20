import { describe, expect, it } from "vitest";
import {
  buildAgentRunInputHash,
  normalizeAgentRunJson,
  summarizeTokenUsage,
} from "./agent-run-audit";

describe("buildAgentRunInputHash", () => {
  it("creates a stable hash regardless of object key order", () => {
    expect(buildAgentRunInputHash({ b: 2, a: 1 })).toBe(
      buildAgentRunInputHash({ a: 1, b: 2 }),
    );
  });
});

describe("normalizeAgentRunJson", () => {
  it("removes undefined values before data is stored as JSON", () => {
    expect(
      normalizeAgentRunJson({
        mode: "llm-shadow",
        missing: undefined,
        nested: { value: "kept", empty: undefined },
      }),
    ).toEqual({
      mode: "llm-shadow",
      nested: { value: "kept" },
    });
  });
});

describe("summarizeTokenUsage", () => {
  it("extracts token usage fields from an OpenAI response payload", () => {
    expect(
      summarizeTokenUsage({
        usage: {
          input_tokens: 123,
          output_tokens: 45,
          total_tokens: 168,
        },
      }),
    ).toEqual({
      inputTokens: 123,
      outputTokens: 45,
      totalTokens: 168,
    });
  });
});
