# LLM Character Agents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the role-modeled AI characters to real LLM runs so they can analyze work like assigned operators, create safer proposals, absorb approval feedback, and suggest service/workflow improvements without bypassing approval or Search Ad safety gates.

**Architecture:** Keep deterministic data collectors and safety validators as the source of truth. Add an LLM orchestration layer that builds sanitized work briefs, calls a configurable model with structured outputs, validates every response, and persists `AgentRun` audit records before creating `AgentReport` or `ActionProposal` rows. Start in shadow/read-only mode, then graduate to assisted proposals, and only later allow approved tool execution.

**Tech Stack:** Next.js App Router Server Actions, TypeScript, Prisma 7, PostgreSQL, Zod, OpenAI Responses API or Agents SDK, Vitest.

---

## Current State Findings

- Character identities already exist in `lib/domain/agent-profiles.ts` for `GENERAL_MANAGER`, `POSITION_DEFENDER`, `BID_OPTIMIZER`, `KEYWORD_STRATEGIST`, `PRODUCT_STRATEGIST`, `TITLE_SEO`, `AD_COPYWRITER`, and `MARGIN_ANALYST`.
- The current keyword workflow is deterministic: `lib/domain/keyword-diagnostics.ts` converts performance metrics into `AgentReport` and `ActionProposal` records without an LLM call.
- The approval page records decisions and approved keyword-related proposals now create or update internal `KeywordRule` rows. Approved proposals still create `ActionExecution` rows with provider `INTERNAL`; external Search Ad mutation is intentionally blocked.
- There is no `openai` SDK dependency, no `OPENAI_API_KEY` or model configuration in `.env.example`, and no audit table for prompt/model/input/output/token/cost data.
- Existing Naver Search Ad scope remains read-only except exact StatReport job creation/download. LLM agents must not be given direct write access to Naver APIs.

## Official Reference Check

- OpenAI docs currently position the Responses API as the model response interface with tool use, structured output, conversation state, and metadata.
- OpenAI docs recommend Structured Outputs over JSON mode when schema adherence matters.
- OpenAI docs say function calling is the right shape when the model needs to interact with application data or tools.
- OpenAI Agents SDK is a good fit when the application owns orchestration, tool execution, approvals, state, handoffs, tracing, and evaluation.
- Current OpenAI model guidance starts with `gpt-5.5` for complex reasoning and uses smaller variants such as `gpt-5.4-mini` or `gpt-5.4-nano` for latency/cost-sensitive workloads.
- Naver Search Ad integration must continue to follow the repo checklist in `docs/integrations/naver-search-ad-review-checklist.md`: read/report endpoints only until a write workflow is explicitly approved.

## Recommended Approach

### Option A: Direct Responses API Wrapper First

Use the OpenAI Node SDK from server-only code, call the Responses API with strict JSON schemas, and keep orchestration in app code.

Pros:
- Smallest change to the current Next.js/Prisma codebase.
- Easy to test with mocked model responses.
- Works well for the first LLM-backed diagnostic and proposal workflows.
- Keeps approvals, persistence, and safety gates in existing application code.

Cons:
- Handoffs between characters are app-managed.
- Tracing/evaluation must be designed locally first.

### Option B: Agents SDK From Day One

Model each character as an SDK agent with tools, handoffs, tracing, and guardrails.

Pros:
- Better fit once characters truly collaborate and hand work to each other.
- Built-in concepts map well to long-running multi-agent workflows.

Cons:
- Larger integration surface.
- More moving parts before the first business value appears.
- Harder to keep the first implementation narrow.

### Option C: Hosted/Builder-Style Workflow Later

Use a hosted workflow editor for agent flows.

Pros:
- Convenient for non-developer iteration once workflows stabilize.

Cons:
- Less aligned with the repo's existing approval, DB, and Naver safety logic.
- Not the right first step for app-owned state and execution rules.

**Decision:** Start with Option A. Design interfaces so Option B can replace the runtime later without rewriting domain contracts.

## Operating Model

```txt
Scheduler or user action
→ deterministic context builder
→ per-character LLM work brief
→ structured model output
→ schema validation
→ safety validation
→ AgentRun audit record
→ AgentReport and/or ActionProposal
→ human approval or held/shadow result
→ feedback memory for next run
```

The LLM is allowed to reason, prioritize, explain, draft, and challenge candidates. It is not allowed to mutate external systems directly. Any write-like outcome must become an `ActionProposal`, pass deterministic validators, and wait for the existing approval/execution policy.

## Character Responsibilities With Real Models

| Character | Primary LLM work | Initial mode | Model class |
|---|---|---|---|
| `GENERAL_MANAGER` / 오피 | summarize cross-agent work, choose priorities, detect missing data, draft daily brief | assisted report | strategic model |
| `POSITION_DEFENDER` / 루키 | challenge brand/core keyword rank defense candidates and explain risk | assisted proposal | strategic model for medium risk |
| `BID_OPTIMIZER` / 비디 | rank bid/rule candidates by evidence quality and budget risk | shadow then assisted | cost-efficient model, strategic escalation |
| `KEYWORD_STRATEGIST` / 키키 | suggest negative/new/season keyword ideas from performance facts | assisted proposal | cost-efficient model |
| `PRODUCT_STRATEGIST` / 프로 | propose product bundles, seasonal offers, service ideas, landing-page opportunities | report-only proposal | strategic model |
| `TITLE_SEO` / 타이 | draft product title improvements from keywords and product facts | report-only proposal | cost-efficient model |
| `AD_COPYWRITER` / 카피 | draft ad copy variants and A/B hypotheses | report-only proposal | cost-efficient model |
| `MARGIN_ANALYST` / 마루 | explain margin constraints and block unprofitable suggestions | safety reviewer | strategic model |

Use environment-configured model names instead of hardcoding current model IDs in domain logic. Suggested defaults at plan time:

```env
AI_AGENT_MODE=rules
AI_LLM_PROVIDER=openai
AI_MODEL_DEFAULT=gpt-5.4-mini
AI_MODEL_STRATEGIC=gpt-5.5
AI_LLM_TIMEOUT_MS=30000
AI_LLM_MAX_OUTPUT_TOKENS=4000
```

Mode semantics:

- `rules`: current deterministic behavior only.
- `llm-shadow`: run the model and store `AgentRun`, but do not create model-backed proposals.
- `llm-assisted`: create proposals after schema and safety validation.
- `llm-approved-tools`: allow approved proposals to call execution tools; external Naver write tools stay blocked until a separate write plan is approved.

## Data Contracts

### `AgentRun`

Stores each model-backed work attempt.

```prisma
model AgentRun {
  id              String             @id @default(cuid())
  agentKey        AgentKey
  runType         String
  trigger         String
  provider        String
  model           String
  promptVersion   String
  status          ExecutionStatus    @default(PENDING)
  inputHash       String
  inputJson       Json
  outputJson      Json?
  parsedJson      Json?
  validationJson  Json?
  tokenUsageJson  Json?
  errorMessage    String?
  startedAt       DateTime           @default(now())
  finishedAt      DateTime?

  @@index([agentKey, startedAt])
  @@index([runType, status, startedAt])
}
```

### `AgentMemory`

Stores durable feedback and operating preferences distilled from approvals/rejections.

```prisma
model AgentMemory {
  id           String    @id @default(cuid())
  agentKey     AgentKey
  memoryType   String
  subjectKey   String
  summary      String
  sourceRunId  String?
  confidence   Float     @default(0.7)
  status       RuleStatus @default(ACTIVE)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@index([agentKey, memoryType, status])
  @@index([subjectKey])
}
```

### `ActionProposal` Extensions

Add optional audit fields without changing the existing approval flow.

```prisma
agentRunId     String?
confidence     Float?
evidenceJson   Json?
safetyJson     Json?
```

For workflow improvements or new service ideas, keep the existing `REPORT_ONLY` action type at first and encode the subtype in `afterJson`:

```json
{
  "kind": "SERVICE_IDEA",
  "ownerAgent": "PRODUCT_STRATEGIST",
  "nextStep": "Create a small landing-page experiment proposal"
}
```

## Structured Output Schemas

### Work Decision Output

```ts
export const agentWorkDecisionSchema = z.object({
  report: z.object({
    status: z.enum(["IDLE", "WORKING", "DONE", "NEEDS_ATTENTION"]),
    mood: z.enum(["calm", "excited", "worried", "focused"]),
    summary: z.string().min(20).max(500),
  }),
  proposals: z.array(
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
  ).max(8),
  memoryCandidates: z.array(
    z.object({
      memoryType: z.enum(["USER_PREFERENCE", "REJECTION_PATTERN", "WINNING_PATTERN", "DATA_GAP"]),
      subjectKey: z.string().min(3).max(120),
      summary: z.string().min(20).max(300),
      confidence: z.number().min(0).max(1),
    }),
  ).max(5),
});
```

### Safety Validation Rules

- Reject any proposal that references a Naver Search Ad mutation endpoint while `AI_AGENT_MODE` is below `llm-approved-tools`.
- Reject any `BID_ADJUSTMENT` without `keywordId`, current bid, proposed bid, percentage change, and budget guard result.
- Reject any `NEGATIVE_KEYWORD` that is not backed by cost/click/conversion evidence.
- Reject any `PRODUCT_TITLE_CHANGE` or `AD_COPY_CHANGE` that claims it was already applied.
- Reject any service idea that does not include a measurable next step.
- Never persist API keys, customer IDs, raw report download URLs, or full prompts that include secrets.

---

## Task 1: Provider Configuration And Dependency

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Create: `lib/ai/config.ts`
- Create: `lib/ai/config.test.ts`

- [ ] **Step 1: Add RED tests for missing and configured LLM env**

Create `lib/ai/config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readAiConfig } from "./config";

describe("readAiConfig", () => {
  it("defaults to rules mode without an API key", () => {
    expect(readAiConfig({})).toEqual({
      mode: "rules",
      provider: "openai",
      defaultModel: "gpt-5.4-mini",
      strategicModel: "gpt-5.5",
      timeoutMs: 30000,
      maxOutputTokens: 4000,
      hasApiKey: false,
    });
  });

  it("enables shadow mode when configured with a key", () => {
    expect(
      readAiConfig({
        AI_AGENT_MODE: "llm-shadow",
        OPENAI_API_KEY: "sk-test",
        AI_MODEL_DEFAULT: "gpt-5.4-mini",
        AI_MODEL_STRATEGIC: "gpt-5.5",
      }),
    ).toMatchObject({
      mode: "llm-shadow",
      hasApiKey: true,
    });
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `npm test -- lib/ai/config.test.ts`

Expected: FAIL because `lib/ai/config.ts` does not exist.

- [ ] **Step 3: Install the OpenAI SDK**

Run: `npm install openai`

Expected: `package.json` and `package-lock.json` include `openai`.

- [ ] **Step 4: Add environment variables**

Add to `.env.example`:

```env
OPENAI_API_KEY=""
AI_AGENT_MODE="rules"
AI_LLM_PROVIDER="openai"
AI_MODEL_DEFAULT="gpt-5.4-mini"
AI_MODEL_STRATEGIC="gpt-5.5"
AI_LLM_TIMEOUT_MS="30000"
AI_LLM_MAX_OUTPUT_TOKENS="4000"
```

- [ ] **Step 5: Implement config parsing**

Create `lib/ai/config.ts`:

```ts
const modes = ["rules", "llm-shadow", "llm-assisted", "llm-approved-tools"] as const;

export type AiAgentMode = (typeof modes)[number];

export interface AiConfig {
  mode: AiAgentMode;
  provider: "openai";
  defaultModel: string;
  strategicModel: string;
  timeoutMs: number;
  maxOutputTokens: number;
  hasApiKey: boolean;
}

export function readAiConfig(
  env: Partial<Record<string, string | undefined>> = process.env,
): AiConfig {
  const mode = modes.includes(env.AI_AGENT_MODE as AiAgentMode)
    ? (env.AI_AGENT_MODE as AiAgentMode)
    : "rules";

  return {
    mode,
    provider: "openai",
    defaultModel: env.AI_MODEL_DEFAULT?.trim() || "gpt-5.4-mini",
    strategicModel: env.AI_MODEL_STRATEGIC?.trim() || "gpt-5.5",
    timeoutMs: numberFromEnv(env.AI_LLM_TIMEOUT_MS, 30000),
    maxOutputTokens: numberFromEnv(env.AI_LLM_MAX_OUTPUT_TOKENS, 4000),
    hasApiKey: Boolean(env.OPENAI_API_KEY?.trim()),
  };
}

function numberFromEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
```

- [ ] **Step 6: Verify**

Run: `npm test -- lib/ai/config.test.ts`

Expected: PASS.

---

## Task 2: Agent Run Audit Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260520193000_add_agent_runs/migration.sql`
- Modify: `docs/planning/COFFEEPRINT_STICKERSEE_AI_MARKETING_OPERATIONS_MVP_PLAN.md`

- [ ] **Step 1: Add Prisma models**

Add `AgentRun`, `AgentMemory`, and optional `ActionProposal` audit fields described in this plan.

- [ ] **Step 2: Generate migration**

Run: `npx prisma migrate dev --name add_agent_runs`

Expected: migration creates `AgentRun`, `AgentMemory`, and `ActionProposal` audit columns.

- [ ] **Step 3: Validate schema**

Run: `npx prisma validate`

Expected: schema valid.

---

## Task 3: Structured Output And Safety Validators

**Files:**
- Create: `lib/ai/agent-output.ts`
- Create: `lib/ai/agent-output.test.ts`
- Create: `lib/ai/safety.ts`
- Create: `lib/ai/safety.test.ts`

- [ ] **Step 1: Add RED tests for output parsing**

Test valid output, overlong proposals, unknown `actionType`, and missing report summary.

- [ ] **Step 2: Add RED tests for safety rejection**

Use examples:

```ts
expect(validateAgentProposal({ actionType: "BID_ADJUSTMENT", afterJson: {} })).toMatchObject({
  ok: false,
  reason: "BID_ADJUSTMENT_REQUIRES_BID_GUARDS",
});

expect(validateAgentProposal({
  actionType: "REPORT_ONLY",
  afterJson: { kind: "SERVICE_IDEA", nextStep: "Test a seasonal sticker bundle landing page" },
})).toMatchObject({ ok: true });
```

- [ ] **Step 3: Implement Zod schemas and validators**

Use the schemas in this plan. Return typed validation results instead of throwing inside safety checks.

- [ ] **Step 4: Verify**

Run: `npm test -- lib/ai/agent-output.test.ts lib/ai/safety.test.ts`

Expected: PASS.

---

## Task 4: Character Briefs And Prompt Versions

**Files:**
- Create: `lib/ai/agent-briefs.ts`
- Create: `lib/ai/agent-briefs.test.ts`

- [ ] **Step 1: Add RED tests for per-character instructions**

Assert that each `AgentKey` has:

- character name and role from `agentProfiles`
- allowed action types
- forbidden action notes
- model tier
- prompt version

- [ ] **Step 2: Implement brief builder**

The brief should produce a server-side object like:

```ts
export interface AgentBrief {
  agentKey: AgentKey;
  characterName: string;
  roleName: string;
  promptVersion: string;
  modelTier: "default" | "strategic";
  allowedActionTypes: ActionType[];
  instructions: string;
}
```

- [ ] **Step 3: Verify**

Run: `npm test -- lib/ai/agent-briefs.test.ts`

Expected: PASS.

---

## Task 5: LLM Client Wrapper

**Files:**
- Create: `lib/ai/openai-client.ts`
- Create: `lib/ai/openai-client.test.ts`

- [ ] **Step 1: Add tests with a fake OpenAI client**

Test that the wrapper sends:

- selected model
- instructions
- sanitized input
- `text.format` JSON schema
- timeout and output token settings

- [ ] **Step 2: Implement server-only wrapper**

The wrapper should expose one app-level method:

```ts
export async function runStructuredAgentResponse(input: {
  brief: AgentBrief;
  context: unknown;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
}): Promise<{
  model: string;
  output: unknown;
  rawResponseId?: string;
  tokenUsage?: unknown;
}>;
```

- [ ] **Step 3: Ensure no secrets are logged**

Add a redaction helper before any error persistence.

- [ ] **Step 4: Verify**

Run: `npm test -- lib/ai/openai-client.test.ts`

Expected: PASS.

---

## Task 6: Context Builder For Search Ad Agents

**Files:**
- Create: `lib/ai/search-ad-context.ts`
- Create: `lib/ai/search-ad-context.test.ts`

- [ ] **Step 1: Add tests for context minimization**

Assert that context includes aggregated keyword facts, proposal history, recent user decisions, and current rules, but excludes API keys, raw customer IDs, and raw report download URLs.

- [ ] **Step 2: Implement context builder**

Input should be deterministic rows from existing DB helpers. Output should be compact:

```ts
export interface SearchAdAgentContext {
  generatedAt: string;
  quality: PerformanceQualityResult;
  topKeywordFacts: Array<{
    keywordId: string;
    keyword: string;
    avgRank: number;
    clicks: number;
    cost: number;
    conversions: number;
    roas: number;
  }>;
  recentDecisions: Array<{
    title: string;
    agentKey: AgentKey;
    status: ProposalStatus;
    createdAt: string;
  }>;
  activeRules: Array<{
    keyword: string;
    ruleType: string;
    targetPositionType: string;
    maxCpc?: number;
  }>;
}
```

- [ ] **Step 3: Verify**

Run: `npm test -- lib/ai/search-ad-context.test.ts`

Expected: PASS.

---

## Task 7: Shadow Mode Agent Runner

**Files:**
- Create: `lib/ai/agent-runner.ts`
- Create: `lib/ai/agent-runner.test.ts`
- Modify: `lib/db/keyword-diagnostics.ts`

- [ ] **Step 1: Add RED test for `llm-shadow`**

When mode is `llm-shadow`, the runner should create an `AgentRun` with parsed output and validation details but should not create `ActionProposal` rows.

- [ ] **Step 2: Implement runner**

Runner responsibilities:

```txt
read config
build character brief
build context
call model
parse output
run safety validation
persist AgentRun
return accepted reports/proposals or shadow-only output
```

- [ ] **Step 3: Wire keyword diagnostics without replacing rules**

Keep existing deterministic proposals. In shadow mode, compare LLM output against rule-generated candidates and record disagreements in `AgentRun.validationJson`.

- [ ] **Step 4: Verify**

Run: `npm test -- lib/ai/agent-runner.test.ts lib/db/keyword-diagnostics.test.ts`

Expected: PASS.

---

## Task 8: Assisted Proposal Mode

**Files:**
- Modify: `lib/db/keyword-diagnostics.ts`
- Modify: `lib/db/mappers.ts`
- Modify: `lib/domain/approvals.ts`
- Modify: `components/approvals/ApprovalCard.tsx`

- [ ] **Step 1: Add tests for LLM-backed proposal persistence**

Assert that accepted proposals persist `agentRunId`, `confidence`, `evidenceJson`, and `safetyJson`.

- [ ] **Step 2: Show model-backed evidence in approvals**

Approval cards should show compact evidence and confidence when present, but not expose raw prompt text.

- [ ] **Step 3: Verify**

Run: `npm test -- lib/db/mappers.test.ts lib/db/keyword-diagnostics.test.ts`
Run: `npm run lint`

Expected: PASS.

---

## Task 9: Feedback Memory From Approval Decisions

**Files:**
- Modify: `app/approvals/actions.ts`
- Create: `lib/ai/agent-memory.ts`
- Create: `lib/ai/agent-memory.test.ts`

- [ ] **Step 1: Add tests for approval feedback**

Cases:

- approved low-risk bid proposal creates a `WINNING_PATTERN` memory candidate
- rejected proposal creates a `REJECTION_PATTERN` memory candidate
- held proposal does not become durable memory yet

- [ ] **Step 2: Implement memory writer**

Create or update memory by `agentKey`, `memoryType`, and `subjectKey`.

- [ ] **Step 3: Include active memories in context**

Modify `lib/ai/search-ad-context.ts` so the next run sees compact memory summaries.

- [ ] **Step 4: Verify**

Run: `npm test -- lib/ai/agent-memory.test.ts lib/ai/search-ad-context.test.ts`

Expected: PASS.

---

## Task 10: New Service And Improvement Scan

**Files:**
- Create: `lib/ai/opportunity-scan.ts`
- Create: `lib/ai/opportunity-scan.test.ts`
- Create: `app/operations/opportunity-actions.ts`
- Modify: `components/marketing-room/TodayQuestList.tsx`

- [ ] **Step 1: Add RED tests for report-only service ideas**

An opportunity scan can create `REPORT_ONLY` proposals with `afterJson.kind` values:

- `SERVICE_IDEA`
- `WORKFLOW_IMPROVEMENT`
- `CAMPAIGN_EXPERIMENT`
- `DATA_QUALITY_TASK`

- [ ] **Step 2: Implement scan runner**

Use `GENERAL_MANAGER`, `PRODUCT_STRATEGIST`, and `MARGIN_ANALYST` briefs. Never create external execution records from opportunity scans.

- [ ] **Step 3: Add manual operations action**

Add a button in `/operations` such as `개선 아이디어 스캔` that runs the scan in the current mode.

- [ ] **Step 4: Verify**

Run: `npm test -- lib/ai/opportunity-scan.test.ts`
Run: `npm run lint`

Expected: PASS.

---

## Task 11: Observability And Cost Guardrails

**Files:**
- Create: `lib/ai/usage.ts`
- Create: `lib/ai/usage.test.ts`
- Modify: `app/operations/page.tsx`

- [ ] **Step 1: Add usage summary helper**

Summarize last 24h and last 7d runs by agent, status, model, and token usage.

- [ ] **Step 2: Add daily run cap**

Introduce env:

```env
AI_AGENT_DAILY_RUN_LIMIT="50"
```

When exceeded, the runner should skip model calls and create an `AgentReport` saying the daily model run limit was reached.

- [ ] **Step 3: Show compact run status in operations**

Display count of model-backed runs, failures, and shadow outputs without turning the dashboard into a logs page.

- [ ] **Step 4: Verify**

Run: `npm test -- lib/ai/usage.test.ts`
Run: `npm run build`

Expected: PASS.

---

## Task 12: Full Verification

**Files:**
- All changed files

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npx prisma validate`.
- [ ] Run `npm run build`.
- [ ] Verify `/operations` in the in-app browser with `AI_AGENT_MODE=rules`.
- [ ] Verify `/operations` in the in-app browser with `AI_AGENT_MODE=llm-shadow` only after `OPENAI_API_KEY` is configured securely.
- [ ] Verify `/approvals` shows LLM evidence only after `AI_AGENT_MODE=llm-assisted`.
- [ ] Confirm no Naver Search Ad write endpoint is called.
- [ ] Update `docs/integrations/naver-search-ad-review-checklist.md` if any Search Ad scope changes.
- [ ] Commit using the Lore Commit Protocol.

## Rollout Order

1. Keep production/local default as `AI_AGENT_MODE=rules`.
2. Add schema, config, and tests.
3. Run shadow mode locally with one character and compare against deterministic diagnostics.
4. Enable assisted proposal mode for `REPORT_ONLY`, `KEYWORD_RULE_CHANGE`, and `NEGATIVE_KEYWORD`.
5. Add feedback memory after approval decisions are stable.
6. Add opportunity scans for improvement/service ideas.
7. Revisit Agents SDK only when character handoffs and long-running state become more valuable than the direct wrapper's simplicity.

## Completion Criteria

- Every model call has an `AgentRun` audit record.
- Every model-created proposal passes structured output and deterministic safety validation.
- No LLM output can call external write APIs directly.
- User approvals/rejections influence later agent context through `AgentMemory`.
- Operations can compare rule-only, shadow, and assisted outputs.
- New service/improvement suggestions appear as report-only proposals with measurable next steps.
- Tests and build pass, and the Naver Search Ad read-only checklist remains current.
