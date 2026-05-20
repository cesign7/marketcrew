# AgentRun Audit And Safety Validator Completion Note

**Goal:** Make LLM shadow runs auditable and add deterministic safety gates before any model output can graduate into assisted proposals.

**Status (2026-05-20 KST):** Completed and locally verified.

## Completed

- [x] Added `AgentRun` and `AgentMemory` Prisma models.
- [x] Added optional `ActionProposal` audit fields: `agentRunId`, `confidence`, `evidenceJson`, and `safetyJson`.
- [x] Added migration `20260520193000_add_agent_runs`.
- [x] Updated LLM shadow runner so skipped, succeeded, and failed runs write an `AgentRun` record.
- [x] Linked shadow `AgentReport.detailJson` back to `agentRunId`.
- [x] Added stable input hashing and token usage normalization helpers.
- [x] Added structured LLM decision parser in `lib/ai/agent-output.ts`.
- [x] Added proposal safety validator in `lib/ai/safety.ts`.

## Verification

- [x] `pnpm vitest run lib/domain/agent-run-audit.test.ts`
- [x] `pnpm vitest run lib/domain/agent-run-audit.test.ts lib/integrations/openai/agent-report.test.ts`
- [x] `pnpm prisma validate`
- [x] `pnpm db:generate`
- [x] `pnpm prisma migrate deploy`
- [x] `env OPENAI_API_KEY= AI_AGENT_MODE=llm-shadow pnpm tsx -e ...runLlmAgentShadowReport(...)`
- [x] Local DB read confirmed latest `AgentRun` is `LLM_SHADOW` / `SUCCEEDED` with `skipped: true` when the OpenAI key is missing.
- [x] `pnpm vitest run lib/ai/agent-output.test.ts lib/ai/safety.test.ts`

## Remaining Follow-Up

- Wire validated `AgentWorkDecision` output into `llm-assisted` proposal creation.
- Add approval feedback memory extraction into `AgentMemory`.
- Surface compact `AgentRun` health metrics in `/operations`.
