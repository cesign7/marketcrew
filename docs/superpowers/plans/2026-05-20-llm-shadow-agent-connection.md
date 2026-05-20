# LLM Shadow Agent Connection Completion Note

**Goal:** Attach the role-modeled AI character workflow to a real LLM entrypoint while keeping the default local environment safe and read-only.

**Status (2026-05-20 KST):** First LLM connection slice completed and locally verified.

## Completed

- [x] Added OpenAI Responses API request builder for strict structured agent reports.
- [x] Added parser and tests for model output, malformed JSON, and `output_text` extraction.
- [x] Added AI agent config that keeps LLM execution disabled until `AI_AGENT_MODE=llm-shadow` and `OPENAI_API_KEY` are configured.
- [x] Added `/operations` server action for LLM shadow checks.
- [x] Added an `LLM 점검` button to the operations room.
- [x] Persisted shadow results to existing `AgentReport` rows without adding external write actions.
- [x] Added `.env.example` keys for `AI_AGENT_MODE`, `AI_AGENT_PROVIDER`, `AI_AGENT_MODEL`, and `OPENAI_API_KEY`.

## Safety

- Default mode is `AI_AGENT_MODE=off`.
- Missing `OPENAI_API_KEY` creates a local “LLM 연결 대기” report instead of calling the model.
- Model output can only become an `AgentReport` in this slice.
- Naver Search Ad write APIs remain blocked.

## Verification

- [x] `pnpm vitest run lib/integrations/openai/agent-report.test.ts`
- [x] `pnpm vitest run lib/integrations/openai/agent-report.test.ts lib/domain/proposal-rule-materialization.test.ts`
- [x] `pnpm test`
- [x] `pnpm lint`
- [x] `pnpm build`
- [x] `curl -I http://localhost:3000/operations`

## Remaining Follow-Up

- Add durable `AgentRun` audit tables before using LLM output to create proposals.
- Add safety validators before enabling `llm-assisted`.
- Run a live shadow check only after the OpenAI key is configured locally.
