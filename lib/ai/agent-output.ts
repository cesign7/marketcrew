import { z } from "zod";

export const agentWorkDecisionSchema = z.object({
  report: z.object({
    status: z.enum(["IDLE", "WORKING", "DONE", "NEEDS_ATTENTION"]),
    mood: z.enum(["calm", "excited", "worried", "focused"]),
    summary: z.string().min(20).max(500),
  }),
  proposals: z
    .array(
      z.object({
        actionType: z.enum([
          "BID_ADJUSTMENT",
          "KEYWORD_RULE_CHANGE",
          "NEGATIVE_KEYWORD",
          "AD_COPY_CHANGE",
          "PRODUCT_TITLE_CHANGE",
          "REPORT_ONLY",
        ]),
        riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
        title: z.string().min(5).max(120),
        reason: z.string().min(20).max(700),
        expectedImpact: z.string().min(20).max(700),
        evidenceRefs: z.array(z.string()).max(12),
        confidence: z.number().min(0).max(1),
        beforeJson: z.record(z.string(), z.unknown()),
        afterJson: z.record(z.string(), z.unknown()),
      }),
    )
    .max(8),
  memoryCandidates: z
    .array(
      z.object({
        memoryType: z.enum([
          "USER_PREFERENCE",
          "REJECTION_PATTERN",
          "WINNING_PATTERN",
          "DATA_GAP",
        ]),
        subjectKey: z.string().min(3).max(120),
        summary: z.string().min(20).max(300),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(5),
});

export type AgentWorkDecision = z.infer<typeof agentWorkDecisionSchema>;

export function parseAgentWorkDecisionOutput(output: unknown): AgentWorkDecision {
  const json = typeof output === "string" ? parseJson(output) : output;
  const parsed = agentWorkDecisionSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error("LLM agent decision output does not match the required schema.");
  }

  return parsed.data;
}

function parseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("LLM agent decision output is not valid JSON.");
  }
}
