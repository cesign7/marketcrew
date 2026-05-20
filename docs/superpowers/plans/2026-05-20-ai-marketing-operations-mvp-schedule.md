# Coffeeprint/Stickersee AI Marketing Operations MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first internal MVP for Coffeeprint/Stickersee that visualizes AI marketing agents, ingests Naver Search Ad data, creates keyword position rules, and routes safe actions through auto-execution or approval.

**Architecture:** Start with a Next.js application that contains the operator dashboard, mock-data agent room, approval queue, and typed domain model. Add server modules for Naver Search Ad ingestion in dry-run mode first, then persist snapshots and action proposals. Real bid changes stay behind explicit approval and safety rules.

**Tech Stack:** Next.js, TypeScript, Prisma, PostgreSQL, server actions/API routes, OpenAI structured outputs, Naver Search Ad API integration, later Naver Commerce API and Youngcart read-only sync.

---

## Frontend-First Decision

Do not build only the visual design first. Build a **mock-data vertical slice** first:

```txt
Typed domain model
→ mock data
→ AI marketing room UI
→ approval queue UI
→ keyword rule board UI
→ dry-run Naver Search Ad ingestion
```

This gives the user something visible early while preventing the frontend from becoming disconnected from the real API, approval, and automation model.

The first visible UI should be the **Today Operations Room** with cute game-like agents, but every card must be backed by realistic mock objects:

- `AgentReport`
- `ActionProposal`
- `KeywordRule`
- `AdKeywordSnapshot`
- `ApprovalTask`
- `AutomationRule`

---

## Development Schedule

### Week 1: Product Skeleton and Mock Operations Room

Goal: Create the app foundation and make the product direction visible.

Deliverables:

- Next.js project scaffold
- Global layout and navigation
- Cute game-like AI operations room
- Mock agent reports
- Approval queue
- Keyword rule board
- Static safety policy panel

Why this comes first:

- The product is workflow-heavy, not just API-heavy.
- The user needs to validate the “agents reporting to me” interaction early.
- API implementation can proceed safely after the UI/data contracts are stable.

### Week 2: Domain Model and Persistence

Goal: Turn mock objects into persisted records.

Deliverables:

- Prisma schema
- PostgreSQL setup
- Seed data for Coffeeprint and Stickersee
- Models for stores, ad snapshots, keyword rules, action proposals, approvals, automation rules
- Read/write pages for rules and approvals

### Week 3: Naver Search Ad API Dry-Run Integration

Goal: Pull real search ad structure and metrics without changing anything.

Deliverables:

- Naver Search Ad credential configuration
- Campaign/adgroup/keyword sync
- Recent 90-day metric snapshots
- Season comparison data structure
- Dry-run import screen
- Error and retry logs

### Week 4: Keyword Rule Engine

Goal: Generate initial keyword rules from historical data.

Deliverables:

- Brand/core/season/general/low-quality keyword classification
- 1st-position defense candidate detection
- Top 1 vs top 2-3 efficiency comparison
- Rule generation
- Rule approval flow
- Rule improvement proposal flow

### Week 5: Approval-Based Execution

Goal: Allow approved changes to be executed safely.

Deliverables:

- Action proposal details
- Approval/deny/hold/modify flow
- Execution record
- Before/after values
- Rollback metadata
- Naver Search Ad bid update behind approval

### Week 6: Low-Risk Auto Execution

Goal: Enable limited automated bid changes under strict safety limits.

Deliverables:

- Automation rules
- Max CPC limit
- Daily adjustment count limit
- Monthly budget limit
- 5% bid-change guard
- Emergency stop
- Auto-execution audit log

### Week 7+: Profit Engine and Store Data

Goal: Add margin-based decisioning.

Deliverables:

- Cost formula editor
- Stickersee SmartStore API sync
- Youngcart read-only sync database
- Product mapping
- Contribution margin snapshots
- Margin-based bid and keyword recommendations

---

## File Structure Plan

The initial repository should be created as a focused web app.

```txt
app/
  page.tsx
  operations/
    page.tsx
  approvals/
    page.tsx
  keywords/
    page.tsx
  settings/
    automation-rules/
      page.tsx
components/
  marketing-room/
    AgentRoom.tsx
    AgentDesk.tsx
    AgentSpeechBubble.tsx
    TodayQuestList.tsx
  approvals/
    ApprovalQueue.tsx
    ApprovalCard.tsx
    RiskBadge.tsx
  keywords/
    KeywordRuleBoard.tsx
    KeywordRuleCard.tsx
    PositionEfficiencyPanel.tsx
  layout/
    AppShell.tsx
lib/
  domain/
    agents.ts
    approvals.ts
    keywords.ts
    automation.ts
    stores.ts
  mock/
    marketingOperationsMock.ts
  integrations/
    naver-search-ad/
      client.ts
      types.ts
      sync.ts
  safety/
    automationPolicy.ts
prisma/
  schema.prisma
  seed.ts
```

---

## Phase 0: Before Coding

- [ ] **Step 1: Confirm stack**

Use this stack unless the user changes it:

```txt
Next.js + TypeScript + Prisma + PostgreSQL
```

Expected user confirmation only if a different stack is required.

- [ ] **Step 2: Create repository scaffold**

Run:

```powershell
npx create-next-app@latest . --ts --eslint --app --src-dir false --import-alias "@/*"
```

Expected: Next.js app files are created in the current workspace.

- [ ] **Step 3: Install core dependencies**

Run:

```powershell
npm install prisma @prisma/client zod lucide-react
```

Expected: dependencies are added to `package.json`.

- [ ] **Step 4: Initialize Prisma**

Run:

```powershell
npx prisma init
```

Expected: `prisma/schema.prisma` and `.env` are created.

---

## Phase 1: Mock-Data Frontend Vertical Slice

### Task 1: Domain Types

**Files:**

- Create: `lib/domain/agents.ts`
- Create: `lib/domain/approvals.ts`
- Create: `lib/domain/keywords.ts`
- Create: `lib/domain/automation.ts`
- Create: `lib/mock/marketingOperationsMock.ts`

- [ ] **Step 1: Define agent types**

Create `lib/domain/agents.ts`:

```ts
export type AgentKey =
  | "GENERAL_MANAGER"
  | "POSITION_DEFENDER"
  | "BID_OPTIMIZER"
  | "KEYWORD_STRATEGIST"
  | "PRODUCT_STRATEGIST"
  | "TITLE_SEO"
  | "AD_COPYWRITER"
  | "MARGIN_ANALYST";

export type AgentStatus = "IDLE" | "WORKING" | "DONE" | "NEEDS_ATTENTION";

export interface AgentReport {
  id: string;
  agentKey: AgentKey;
  characterName: string;
  roleName: string;
  status: AgentStatus;
  summary: string;
  mood: "calm" | "excited" | "worried" | "focused";
  createdAt: string;
  relatedProposalIds: string[];
}
```

- [ ] **Step 2: Define approval types**

Create `lib/domain/approvals.ts`:

```ts
export type ActionType =
  | "BID_ADJUSTMENT"
  | "KEYWORD_RULE_CHANGE"
  | "NEGATIVE_KEYWORD"
  | "AD_COPY_CHANGE"
  | "PRODUCT_TITLE_CHANGE"
  | "REPORT_ONLY";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type ProposalStatus =
  | "AUTO_EXECUTED"
  | "NEEDS_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "HELD"
  | "FAILED";

export interface ActionProposal {
  id: string;
  agentKey: string;
  actionType: ActionType;
  riskLevel: RiskLevel;
  title: string;
  reason: string;
  expectedImpact: string;
  beforeLabel: string;
  afterLabel: string;
  status: ProposalStatus;
  createdAt: string;
}
```

- [ ] **Step 3: Define keyword rule types**

Create `lib/domain/keywords.ts`:

```ts
export type KeywordRuleType =
  | "BRAND_DEFENSE"
  | "TOP_1_DEFENSE"
  | "TOP_2_TO_3_OPTIMIZE"
  | "SEASONAL_TOP_TEST"
  | "PROFIT_BASED_BID"
  | "LOW_BID_KEEP"
  | "NEGATIVE_CANDIDATE"
  | "PAUSE_CANDIDATE"
  | "DISCOVERY_TEST";

export interface KeywordRule {
  id: string;
  brandKey: "COFFEEPRINT" | "STICKERSEE";
  keyword: string;
  ruleType: KeywordRuleType;
  targetPositionLabel: string;
  maxCpc: number;
  currentAvgCpc: number;
  currentAvgRank: number;
  confidence: number;
  reason: string;
}
```

- [ ] **Step 4: Define automation policy types**

Create `lib/domain/automation.ts`:

```ts
export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  maxBidChangeRate: number;
  maxDailyChangesPerKeyword: number;
  maxCpc: number;
  monthlyBudgetLimit: number;
  requiresApprovalAboveRisk: "LOW" | "MEDIUM" | "HIGH";
}
```

- [ ] **Step 5: Create mock data**

Create `lib/mock/marketingOperationsMock.ts` with realistic Coffeeprint/Stickersee records:

```ts
import type { AgentReport } from "@/lib/domain/agents";
import type { ActionProposal } from "@/lib/domain/approvals";
import type { KeywordRule } from "@/lib/domain/keywords";
import type { AutomationRule } from "@/lib/domain/automation";

export const mockAgentReports: AgentReport[] = [
  {
    id: "report-1",
    agentKey: "POSITION_DEFENDER",
    characterName: "루키",
    roleName: "순위 방어 AI",
    status: "NEEDS_ATTENTION",
    summary: "'기업 초대장'은 1위보다 2~3위권에서 공헌이익이 더 좋아 보입니다.",
    mood: "focused",
    createdAt: "2026-05-20T09:00:00+09:00",
    relatedProposalIds: ["proposal-1"]
  },
  {
    id: "report-2",
    agentKey: "BID_OPTIMIZER",
    characterName: "비디",
    roleName: "입찰 최적화 AI",
    status: "DONE",
    summary: "저위험 키워드 3개는 5% 이내 하향 조정 후보입니다.",
    mood: "calm",
    createdAt: "2026-05-20T09:10:00+09:00",
    relatedProposalIds: ["proposal-2"]
  }
];

export const mockActionProposals: ActionProposal[] = [
  {
    id: "proposal-1",
    agentKey: "POSITION_DEFENDER",
    actionType: "KEYWORD_RULE_CHANGE",
    riskLevel: "MEDIUM",
    title: "'기업 초대장' 목표 순위를 2~3위 유지로 변경",
    reason: "최근 90일 기준 1위 구간보다 2~3위 구간의 광고비 대비 효율이 더 높습니다.",
    expectedImpact: "광고비를 줄이면서 공헌이익률을 개선할 가능성이 있습니다.",
    beforeLabel: "1위 방어",
    afterLabel: "2~3위 유지",
    status: "NEEDS_APPROVAL",
    createdAt: "2026-05-20T09:20:00+09:00"
  },
  {
    id: "proposal-2",
    agentKey: "BID_OPTIMIZER",
    actionType: "BID_ADJUSTMENT",
    riskLevel: "LOW",
    title: "'무료 초대장 양식' 입찰가 5% 하향",
    reason: "클릭은 발생하지만 구매 의도와 전환 기여가 낮습니다.",
    expectedImpact: "불필요한 클릭 비용을 줄입니다.",
    beforeLabel: "420원",
    afterLabel: "399원",
    status: "AUTO_EXECUTED",
    createdAt: "2026-05-20T09:25:00+09:00"
  }
];

export const mockKeywordRules: KeywordRule[] = [
  {
    id: "rule-1",
    brandKey: "COFFEEPRINT",
    keyword: "커피프린트",
    ruleType: "BRAND_DEFENSE",
    targetPositionLabel: "1위 방어",
    maxCpc: 600,
    currentAvgCpc: 210,
    currentAvgRank: 1.1,
    confidence: 0.91,
    reason: "브랜드 검색어는 경쟁 유입 방어가 중요합니다."
  },
  {
    id: "rule-2",
    brandKey: "COFFEEPRINT",
    keyword: "기업 초대장",
    ruleType: "TOP_2_TO_3_OPTIMIZE",
    targetPositionLabel: "2~3위 유지",
    maxCpc: 850,
    currentAvgCpc: 720,
    currentAvgRank: 2.4,
    confidence: 0.76,
    reason: "1위 구간보다 2~3위 구간의 효율이 더 좋습니다."
  }
];

export const mockAutomationRule: AutomationRule = {
  id: "auto-1",
  name: "저위험 입찰 조정",
  enabled: true,
  maxBidChangeRate: 0.05,
  maxDailyChangesPerKeyword: 2,
  maxCpc: 850,
  monthlyBudgetLimit: 1000000,
  requiresApprovalAboveRisk: "LOW"
};
```

- [ ] **Step 6: Run typecheck**

Run:

```powershell
npm run lint
```

Expected: no import or TypeScript errors.

### Task 2: App Shell and Operations Room

**Files:**

- Create: `components/layout/AppShell.tsx`
- Create: `components/marketing-room/AgentRoom.tsx`
- Create: `components/marketing-room/AgentDesk.tsx`
- Create: `components/marketing-room/AgentSpeechBubble.tsx`
- Modify: `app/page.tsx`
- Create: `app/operations/page.tsx`

- [ ] **Step 1: Build shell**

Create a left navigation with:

- 오늘의 운영실
- 승인실
- 키워드/입찰실
- 상품/마진실
- 설정

- [ ] **Step 2: Build game-like agent room**

Use a cute operational room style:

- agent desks
- speech bubbles
- color-coded status
- compact KPI strip
- no decorative cards inside cards

- [ ] **Step 3: Render mock reports**

Use `mockAgentReports`.

- [ ] **Step 4: Verify locally**

Run:

```powershell
npm run dev
```

Expected: the operations room is visible at `http://localhost:3000/operations`.

### Task 3: Approval Queue

**Files:**

- Create: `app/approvals/page.tsx`
- Create: `components/approvals/ApprovalQueue.tsx`
- Create: `components/approvals/ApprovalCard.tsx`
- Create: `components/approvals/RiskBadge.tsx`

- [ ] **Step 1: Render proposal list**

Use `mockActionProposals`.

- [ ] **Step 2: Add action buttons**

Buttons:

- 승인
- 반려
- 보류
- 다음부터 자동 처리
- 이 유형 자동 처리 금지

- [ ] **Step 3: Keep actions mock-only**

The first UI does not call real APIs.

### Task 4: Keyword Rule Board

**Files:**

- Create: `app/keywords/page.tsx`
- Create: `components/keywords/KeywordRuleBoard.tsx`
- Create: `components/keywords/KeywordRuleCard.tsx`
- Create: `components/keywords/PositionEfficiencyPanel.tsx`

- [ ] **Step 1: Render keyword rules**

Use `mockKeywordRules`.

- [ ] **Step 2: Show position strategy**

Each keyword card shows:

- current average rank
- current CPC
- max CPC
- target position label
- confidence
- reason

- [ ] **Step 3: Add efficiency comparison panel**

Show mock comparison:

```txt
1위: 매출 높음, 광고비 높음, 공헌이익 낮음
2~3위: 매출 중간, 광고비 낮음, 공헌이익 높음
```

---

## Phase 2: Persistence and Real Integration

### Task 5: Prisma Schema

**Files:**

- Modify: `prisma/schema.prisma`

Add models:

- Store
- MarketingAccount
- AdCampaignSnapshot
- AdKeywordSnapshot
- KeywordRule
- ActionProposal
- ActionExecution
- AutomationRule
- AgentReport

### Task 6: Naver Search Ad Dry-Run Client

**Files:**

- Create: `lib/integrations/naver-search-ad/types.ts`
- Create: `lib/integrations/naver-search-ad/client.ts`
- Create: `lib/integrations/naver-search-ad/sync.ts`

Rules:

- Never mutate bid amounts in this phase.
- Store credentials in environment variables.
- Log API errors without exposing secrets.

### Task 7: Rule Engine

**Files:**

- Create: `lib/rules/keywordClassification.ts`
- Create: `lib/rules/positionRuleEngine.ts`
- Create: `lib/rules/seasonWindow.ts`

Rules:

- General keywords use recent 90 days.
- Seasonal keywords use recent 90 days plus previous comparable season.
- Lunar holidays use D-day-relative windows, not fixed calendar dates.

---

## Phase 3: Controlled Execution

### Task 8: Approval Execution

Build approved bid adjustment execution behind a server action.

Safety gates:

- proposal must be approved
- action must match proposal
- max CPC must not be exceeded
- bid change must be logged with before/after values

### Task 9: Low-Risk Auto Execution

Enable only after dry-run data and approval execution are verified.

Initial allowed action:

```txt
Bid adjustment within 5%, max 2 changes per keyword per day, under max CPC and monthly budget limit.
```

---

## Verification Plan

- UI smoke test in Browser after every major screen.
- Lint/typecheck after every phase.
- Dry-run API sync before any write-capable action.
- Real bid write feature must start disabled.
- Auto execution must start disabled by default.

---

## Implementation Decisions

1. Tech stack: `Next.js + TypeScript + Prisma + PostgreSQL`.
2. Development database: local Docker PostgreSQL.
3. Deployment target after local MVP: Vercel for the app and Railway for PostgreSQL/backend services if needed.
4. Naver Search Ad credentials: allowed in local `.env`.
5. First UI language: Korean-only.
6. Git/worktree status: the current workspace is not a git repository, so implementation starts in-place.
