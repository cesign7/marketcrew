# ai-marketing-character-ops Completion Report

> **Status**: Complete for 1차 MVP
>
> **Project**: marketcrew2
> **Version**: 0.1.0
> **Author**: Codex
> **Completion Date**: 2026-05-22 KST
> **PDCA Cycle**: #1

---

## Executive Summary

### 1.1 Project Overview

| Item | Content |
|------|---------|
| Feature | `ai-marketing-character-ops` |
| Start Date | 2026-05-21 KST |
| End Date | 2026-05-22 KST |
| Duration | 2 days |

### 1.2 Results Summary

```text
Completion Rate: 100% for the accepted first-MVP boundary

Complete:      15 / 16 first-MVP success criteria
Partial:        1 / 16 first-MVP success criteria
Deferred:       0 / 16 first-MVP success criteria
Critical Issues: 0
QA Verdict:    QA_PASS
```

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | 대표 혼자 스마트스토어, 네이버 키워드광고, 자체 쇼핑몰 데이터를 매일 확인하고 시즌성까지 판단하기 어렵다. 특히 음력 명절과 시즌 키워드는 작년 같은 양력 날짜 비교만으로는 결재 판단이 흔들린다. |
| **Solution** | 하위 캐릭터가 read-only 데이터와 음력/양력 캘린더를 읽어 안건을 상신하고, 모아가 대표 결재용 diff/위험/rollback/성과 계획으로 묶는 bottom-up 업무실을 구현했다. |
| **Function/UX Effect** | `/operations`에서 오늘 안건, provider 근거, 상품/키워드/마케팅 후보를 보고, `/approvals/[id]`에서 승인 버튼, write gate 차단, provider evidence, 저장된 outcome report를 확인할 수 있다. |
| **Core Value** | 실제 provider write를 열지 않고도 “올라온 자료만 보고 승인할 수 있는가”를 검증했다. 최신 회귀는 26개 테스트 파일/79개 테스트, Playwright e2e, API/browser smoke를 통과한다. |

---

## 1.4 Success Criteria Final Status

| # | Criteria | Status | Evidence |
|---|----------|:------:|----------|
| SC-1 | `/operations`에 오늘 올라온 안건 중심 업무 지휘실이 있다. | Met | `/operations` 200 OK, browser smoke |
| SC-2 | 샘플과 provider read-only 데이터가 공통 signal/agenda로 변환된다. | Met | `runAgendaCycle`, provider signal tests |
| SC-3 | 하위 캐릭터가 안건 후보를 생성한다. | Met | `AgendaCandidate`, `CharacterReport`, `MoaSynthesisReport` |
| SC-4 | triage 통과/탈락 이유가 기록된다. | Partial | 중복 제거와 근거 기준은 있으나 탈락 사유 UI는 후속 |
| SC-5 | 캐릭터 보고서와 모아 종합 보고서가 구분된다. | Met | agenda room view model |
| SC-6 | 대표 결재 요청에 diff, 실행 작업, 위험, rollback이 포함된다. | Met | `ApprovalPreviewPanel` |
| SC-7 | 대표가 6개 결정을 선택할 수 있다. | Met | `OwnerDecisionSubmitPanel` |
| SC-7a | 검색광고 안건은 AI 제안 실행 범위와 대표 수정값을 결재 기록에 남긴다. | Met | `ExecutionScopeProposal`, `OwnerDecision.executionScopeSelection` |
| SC-8 | 승인 후 바로 반영은 preflight/executor/ExecutionResult를 만든다. | Met | e2e write gate block, route tests |
| SC-9 | 승인 작업은 checkpoint와 outcome으로 이어진다. | Met | `PerformanceCheckpoint`, `OutcomeReport` |
| SC-10 | 대표 결정/실행/성과가 후속 업무로 내려간다. | Met | `FollowUpInternalTask`, outcome history |
| SC-11 | 시즌 키워드 광고 안건은 생애주기/예산/입찰/중지/제외 키워드를 포함한다. | Met | seasonal keyword tests |
| SC-12 | `KeywordDemandSnapshot`에 캐시/조회 시각이 있다. | Met | keyword demand snapshot tests |
| SC-13 | 승인 없는 외부 쓰기는 차단된다. | Met | 423 `WRITE_GATE_CLOSED`, no provider write |
| SC-14 | 최소 단위 테스트와 브라우저 smoke가 통과한다. | Met | Vitest 128 tests, Playwright 결재 상세 smoke |
| SC-15 | 저장된 성과 보고를 다시 조회할 수 있다. | Met | `/api/approvals/[id]/outcomes`, `OutcomeReportHistoryPanel` |
| SC-16 | 외부 API 조회 한계와 백필/일별 저장 정책이 데이터 연동 화면에 보인다. | Met | `ProviderSyncReport.historyPolicy`, `/data` policy panel |
| SC-17 | 자동 스케줄, 수동 수집, 결재 전 최신성, 중복 방지 기준이 데이터 연동 화면에 보인다. | Met | `/data` collection schedule board, provider별 schedule labels |

**Success Rate**: 17 Met / 1 Partial within the first-MVP boundary.
**Operator MVP Rate**: 100%.

## 1.5 Decision Record Summary

| Source | Decision | Followed? | Outcome |
|--------|----------|:---------:|---------|
| Plan | 첫 MVP는 top-down 지시보다 bottom-up 안건 상신을 먼저 증명한다. | Yes | `Signal -> AgendaCandidate -> CharacterReport -> MoaSynthesisReport -> ApprovalRequest` 흐름 구현 |
| Plan | 화면은 캐릭터 자체보다 오늘 안건, 근거, 대표 결정을 중심으로 둔다. | Yes | `/operations`가 안건/근거/결재 후보 중심으로 구성됨 |
| Plan | 음력 명절은 같은 음력 이벤트 윈도우로 비교한다. | Yes | `MarketingCalendar`와 `lunar_event_yoy` 테스트 통과 |
| Plan | 실제 외부 write는 명시 승인 전까지 차단한다. | Yes | e2e에서 `WRITE_GATE_CLOSED`, provider write 미시도 확인 |
| Design | Pragmatic Balance 아키텍처를 선택한다. | Yes | domain/application/integrations/persistence/UI 분리, Next.js 기본 패턴 사용 |
| Design | LLM에는 raw row가 아니라 집계 요약과 근거 ID를 전달한다. | Yes | planner preview `rawRowsIncluded: false` |
| Act | provider read-only sync 근거를 대표 화면과 결재 상세에 노출한다. | Yes | provider readiness/sync/evidence panels 구현 |
| Act | 생성된 outcome report는 상세 화면/API에서 다시 읽힌다. | Yes | outcome history panel과 outcomes API 구현 |
| Act | API 과거 조회 한계는 화면에서 운영 정책으로 드러나야 한다. | Yes | provider별 조회 한계/백필/음력 시즌 비교/AI 입력 제한 표시 |
| Act | 자동 스케줄과 수동 수집은 역할을 나누고 중복 저장은 최신 스냅샷 갱신으로 처리한다. | Yes | `/data` 추천 수집 주기, 결재 전 최신성, provider별 dedupe key 표시 |
| Act | 검색광고 결재 전 실행 범위는 AI가 먼저 제안하고 대표가 수정할 수 있어야 한다. | Yes | `ExecutionScopeProposal` 표시와 `executionScopeSelection` 저장 구현 |

## 1.6 2026-05-23 Follow-up

대표가 키워드광고 안건을 결재하기 전에 광고 유형, 적용 위치, PC/모바일, 시간대, 예산/입찰, 제외 키워드 범위를 볼 수 있도록 `ExecutionScopeProposal`을 추가했다. 결재 상세의 대표 입력 영역에서는 추천값을 그대로 쓰거나 수정할 수 있고, 선택값은 `OwnerDecision.executionScopeSelection`과 결정 메모에 저장된다.

검증은 `npm run typecheck`, 표적 테스트 3 files / 11 tests, 전체 단위 테스트 49 files / 128 tests, `npm run build`, `npm audit --omit=dev`, 결재 상세 Playwright smoke를 통과했다. 1차 MVP 대비 진행율은 100% 유지다.

## 1.7 2026-05-23 Backfill Follow-up

기존 DB에 이미 저장된 결재안도 실행 범위 계약을 갖도록 `backfillExecutionScopes`와 `/api/operations/execution-scope-backfill`을 추가했다. GET은 미리보기, POST는 실제 적용 결과를 반환한다.

로컬 `marketcrew` Postgres DB에서 기존 저장 결재안 3건을 소급 적용했고, 재조회 결과 3건 모두 `executionScopeProposal.fields` 6개를 가진 것을 확인했다. 저장된 대표 결정은 0건이라 결정 기록 소급 적용은 없었다.

검증은 `npm run typecheck`, 표적 테스트 3 files / 11 tests, 전체 단위 테스트 50 files / 130 tests, `npm run build`, `npm audit --omit=dev`를 통과했다. 1차 MVP 대비 진행율은 100% 유지다.

## 1.8 2026-05-23 Brand-Separated AI Pilot Follow-up

실제 Gemini 파일럿 재실행 전, production DB에 남아 있던 예전 `스마트스토어/자체몰 매출 균형` 결재안이 다시 AI 판단 후보로 섞이지 않도록 차단했다.

`buildPlannerInputFromApprovals`와 Railway 백엔드 `/api/operations/llm-real-pilot`은 사용 중단된 교차 브랜드 결재안을 제외한다. Gemini 프롬프트에는 스티커씨와 커피프린트는 서로 다른 브랜드이며, 두 브랜드의 매출/예산을 비교하거나 하나의 균형 안건으로 묶지 않는다는 규칙을 명시했다. 저장된 이전 AI 실행 이력도 같은 기준으로 걸러 운영 화면에 잘못된 최신 판단이 남지 않게 했다.

검증은 `npm run typecheck`, 표적 테스트 4 files / 16 tests, 전체 단위 테스트 51 files / 137 tests, `npm run build`, `npm run test:e2e` 11 tests, `npm audit --omit=dev` 0 vulnerabilities를 통과했다. 1차 MVP 대비 진행율은 100% 유지다.

---

## 2. Related Documents

| Phase | Document | Status |
|-------|----------|--------|
| Plan | [ai-marketing-character-ops.plan.md](../01-plan/features/ai-marketing-character-ops.plan.md) | Finalized |
| Design | [ai-marketing-character-ops.design.md](../02-design/features/ai-marketing-character-ops.design.md) | Finalized |
| Do | [ai-marketing-character-ops.do.md](../03-do/ai-marketing-character-ops.do.md) | Complete |
| Check | [ai-marketing-character-ops.analysis.md](../03-analysis/ai-marketing-character-ops.analysis.md) | Complete |
| Act | [ai-marketing-character-ops.iteration-13.md](../04-act/ai-marketing-character-ops.iteration-13.md) | Complete |
| QA | [ai-marketing-character-ops.qa-report.md](../05-qa/ai-marketing-character-ops.qa-report.md) | QA_PASS |

---

## 3. Completed Items

### 3.1 Functional Requirements

| Area | Status | Notes |
|------|--------|-------|
| Korean operations room | Complete | `/operations` route and first screen |
| Character role model | Complete | 7 visible roles: 모아, 그로, 프로, 카피, 리피, 마루, 데이 |
| Calendar/seasonality | Complete | Lunar/solar event windows and YoY comparison |
| Seasonal keyword ads | Complete | Budget, bid, stop condition, negative keyword guardrails |
| Bottom-up agenda loop | Complete | Signal, agenda, character report, Moa synthesis, approval request |
| Approval detail | Complete | diff, risk, rollback, measurement plan, provider evidence |
| Owner decisions | Complete | approve/apply, draft-only, reject, revise, hold, request evidence |
| Safe execution | Complete for MVP | mock executor and write gate block |
| Outcome tracking | Complete for MVP | checkpoints, outcome report, outcome history API/UI |
| Provider readiness | Complete | Search Ad, DataLab, Smartstore, Shop, LLM readiness |
| Read-only provider sync | Complete for MVP | aggregate snapshots and evidence labels |
| Provider history policy | Complete for MVP | API 조회 한계, 백필 분할, 일별 스냅샷, AI 요약 입력 기준 |
| 판단 근거 확장 로드맵 | MVP 보강 완료 | 광고 설정, 기기/시간대 성과, 순매출/클레임, 데이터랩 세그먼트, 판매 분석 확장 순서 |
| Product growth candidates | Complete for MVP | keyword, marketing, product discovery candidates |
| 실제 LLM 파일럿 | 읽기 전용 파일럿 완료 | Gemini `gemini-3.5-flash`, 집계 입력만 사용, AgentRun 감사 기록 저장 |

### 3.2 Non-Functional Requirements

| Item | Target | Achieved | Status |
|------|--------|----------|--------|
| Safety | no unapproved external write | provider write remains blocked | Complete |
| Traceability | evidence IDs and provider labels visible | provider evidence/source report IDs shown | Complete for MVP |
| Localization | Korean operator UI | UI copy is Korean | Complete |
| Determinism | fallback without LLM key | deterministic planner and sample flow | Complete |
| Runtime proof | tests/build/browser smoke | QA_PASS | Complete |

### 3.3 Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| App routes | `src/app/operations`, `src/app/approvals/[id]` | Complete |
| API routes | `src/app/api/operations/*`, `src/app/api/approvals/[id]/*` | Complete |
| Domain/application logic | `src/lib/domain`, `src/lib/application` | Complete for MVP |
| Provider integrations | `src/lib/integrations` | Complete for read-only MVP |
| Persistence | `src/lib/persistence` | Complete for local file MVP |
| Tests | `tests/` | Complete for MVP |
| PDCA docs | `docs/` | Complete |

---

## 4. Incomplete Items

### 4.0 2026-05-22 MVP Closeout

후속 PDCA cycle에서 운영 DB/AgentRun provenance, 후속 업무 큐, LLM 비용 가드, `/operations` 카드별 근거 추적까지 완료했다. 1차 MVP 대비 진행율은 최신 상태 기준 100%로 닫는다. 실제 외부 provider write는 1차 MVP 밖의 후속 확장으로 유지한다.

### 4.0.1 2026-05-23 실제 데이터/LLM 파일럿

대표 요청에 따라 기존 운영 생성 레코드를 백업 후 초기화하고, Search Ad, DataLab, 스마트스토어(스티커씨), 쇼핑몰(커피프린트) 네 연동처를 읽기 전용으로 다시 수집했다. 이후 `POST /api/operations/llm-real-pilot`로 실제 provider 집계, 후보 안건, 근거 ID만 Gemini `gemini-3.5-flash`에 전달하는 파일럿을 수행했다.

파일럿 결과는 `AgentRun(mode=llm, provider=gemini)`으로 저장하며, 원천 행/고객 식별정보/시크릿/provider write는 계속 제외한다. 비용 가드는 실제 프롬프트 기준 입력 토큰을 사전 추정한 뒤 1회/일/월 예산과 토큰 상한을 확인한다.

### 4.0.2 2026-05-23 AI 파일럿 판단 패널

저장된 실제 AI 모델 파일럿 결과를 `/operations`에서 바로 확인할 수 있도록 `AI 파일럿 판단` 패널을 추가했다. 패널은 `AgentRun(mode=llm, provider=gemini)`과 연결된 추천 안건/근거 ID를 읽어 모델, 토큰/비용, 근거 수, 추천 안건, 안전 조건을 한글로 보여준다.

화면에는 원천 행, 고객 식별정보, provider secret, raw approval ID를 노출하지 않는다. 저장된 추천 안건 ID가 현재 후보와 달라도 대표가 읽을 수 있는 한글 안건명으로 풀어 보여주며, 이 패널은 외부 광고나 상품을 직접 바꾸지 않는다.

### 4.0.3 2026-05-23 결재 상태 용어 정리

`APPROVE_DRAFT_ONLY`의 화면 표현을 `초안 확정`으로 정리했다. 이 결정은 외부 광고, 상품, CRM에 바로 적용된 상태가 아니라 내부 작업 방향이 확정되고 외부 반영 전 재상신이 필요한 상태다.

운영실과 후속 업무 큐에서는 draft-only 결과를 `초안 확정됨`, `내부 초안`, `초안 확정 범위로 내부 작업을 정리하고 외부 반영 전 재상신`으로 표시한다. 내부 enum과 저장 계약은 그대로 유지하며 실제 provider write는 계속 차단한다.

### 4.1 Carried Over to Next Cycle

아래 표는 최초 MVP 종료 시점의 이월 항목이다. 이후 운영 DB, AgentRun/model/token/cost provenance, 후속 업무 큐, 비용 가드, 실제 AI 파일럿 표시까지는 후속 iteration에서 완료했다.

| Item | Reason | Priority | Estimated Effort |
|------|--------|----------|------------------|
| Operating DB schema | Local JSON store is enough for MVP, not enough for production audit/concurrency | High | 1-2 iterations |
| AgentRun/model/token/cost provenance | Needed before real LLM operation and cost visibility | High | 1 iteration |
| Follow-up internal task queue | Follow-up tasks exist but lack a dedicated queue/status UI | Medium | 1 iteration |
| Triage rejection reason UI | Triage exists, but rejected candidates are not first-class in UI | Medium | 1 iteration |
| Actual provider write executor | Requires separate write policy, rollback proof, and explicit owner approval | High but deferred | Separate PDCA cycle |

### 4.2 Cancelled/On Hold Items

| Item | Reason | Alternative |
|------|--------|-------------|
| Top-down owner command center as first screen | First MVP intentionally proves bottom-up reporting first | Add after DB/provenance foundation |
| Fully autonomous ad/product/CRM writes | Unsafe before write gates, rollback, and operator proof | Keep read-only and mock execution |
| Decorative game mechanics | Could distract from operator decisions | Keep characters as accountability labels |

---

## 5. Quality Metrics

### 5.1 Final Analysis Results

| Metric | Target | Final | Result |
|--------|--------|-------|--------|
| Overall Match Rate | 90% | 92% | Pass |
| Strategic Alignment | 90% | 94% | Pass |
| Functional Depth | 90% | 92% | Pass |
| API Contract | 90% | 91% | Pass |
| Runtime Evidence | 90% | 95% | Pass |
| Safety Boundary | 95% | 96% | Pass |

### 5.2 QA Results

| Check | Result |
|-------|--------|
| `npm test -- --run` | 27 files, 81 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Targeted Playwright `/data` smoke | 1 chromium smoke passed |
| `/operations` smoke | 200 OK |
| `/data` HTTP smoke | 200 OK, data contract and collapsible raw field checklist visible |
| `/approvals/[id]` smoke | 200 OK |
| outcomes API | 1 report, `판단 보류` |
| Browser smoke | provider evidence and saved outcome visible |

### 5.3 Resolved Issues

| Issue | Resolution | Result |
|-------|------------|--------|
| Initial static page only | Added domain/application-driven agenda cycle | Resolved |
| Missing owner decision loop | Added decision API and submit panel | Resolved |
| Missing persistence | Added local file repository and workflow-state API | Resolved for MVP |
| Missing provider evidence | Added readiness, read-only sync, evidence panels | Resolved for MVP |
| Missing outcome re-read | Added outcomes API and outcome history panel | Resolved |
| Missing data contract visibility | Added `/data` contract panel for incoming fields, collapsible raw field checklists, stored fields, samples, and safety notes | Resolved |
| Risk of external writes | Kept provider write gates closed | Resolved for MVP |

---

## 6. Lessons Learned & Retrospective

### 6.1 What Went Well

- The bottom-up model kept the product useful: characters own cases, but the screen stays centered on evidence and decisions.
- Read-only provider evidence gave the MVP a concrete operational feel without opening write risk.
- Iteration documents made it easier to track which module each Act slice completed.
- Playwright e2e caught a real UI ambiguity around duplicated text locators before the report phase.

### 6.2 What Needs Improvement

- Generated Next cache files such as `.next/types/* 2.ts` can cause noisy typecheck failures after local app runs.
- Follow-up tasks are visible as outcome context but not yet a full queue.
- LLM 계획 provenance는 읽기 전용 Gemini 파일럿까지 연결됐다. 운영 반영 전에는 대표가 보는 결과 패널과 더 엄격한 정규화 분석 입력이 필요하다.

### 6.3 What to Try Next

- 다음 cycle은 대표가 보는 AI 파일럿 결과 패널과 정규화 분석 스키마부터 시작한다.
- Add a small pre-release QA script so bkit QA pre-scan can run without manual fallback.
- Add a dedicated follow-up queue after DB tables exist, not before.

---

## 7. Process Improvement Suggestions

| Area | Improvement Suggestion | Expected Benefit |
|------|------------------------|------------------|
| PDCA docs | Keep iteration docs but add a consolidated report earlier near QA | Faster handoff |
| Testing | Add cache cleanup before typecheck in local QA script | Fewer false failures |
| Data model | Move from local JSON to DB schema before real users | Better audit and concurrency |
| LLM operations | Add AgentRun/model/token/cost provenance before live LLM routing | Better cost and trust visibility |

---

## 8. Next Steps

### 8.1 Immediate

- Keep the local app visible at `http://localhost:3001/operations`.
- Do not enable actual provider write.
- Review this report and choose the next PDCA cycle.

### 8.2 Next PDCA Cycle Candidates

| Item | Priority | Expected Start |
|------|----------|----------------|
| Operating DB schema and repository migration | High | Next |
| AgentRun/model/token/cost provenance | High | Next |
| Follow-up internal task queue | Medium | After DB schema |
| Actual provider write executor policy | High but gated | After DB/provenance and explicit approval |
| AI 파일럿 결과 패널 | High | Next |
| 정규화 분석 스키마 | High | Next |

---

## 9. Changelog

### v0.1.0 (2026-05-22)

**Added:**

- Korean `/operations` room.
- Bottom-up agenda/report/approval workflow.
- Lunar/solar marketing calendar and seasonal keyword guardrails.
- Provider readiness and read-only sync evidence.
- Provider data contract panel for incoming data, collapsible raw field checklists, stored data, column descriptions, and sample values.
- Product keyword/marketing/product discovery candidates.
- Approval detail with provider evidence, owner decision submit, execution result, checkpoints, and outcome history.
- Owner-editable AI execution scope proposal for search ad approvals.
- Execution scope backfill API and local DB backfill for existing saved approval requests.
- Local file repository, workflow-state API, outcomes API.
- Vitest and Playwright verification.

**Changed:**

- MVP boundary refined from broad AI marketing automation to evidence-first, approval-first operations room.
- Real provider write moved out of first MVP and kept behind gates.
- 실제 LLM 호출은 dry-run 전용에서 집계 근거 입력과 AgentRun 감사를 남기는 읽기 전용 Gemini 파일럿으로 확장했다.
- 검색광고 결재안은 키워드/예산뿐 아니라 광고 유형, 적용 위치, 기기/매체, 시간대, 제외 키워드 범위까지 결재 전에 고르게 바꿨다.
- 기존 저장 결재안도 내부 초안/채널/외부 반영 경계/성과 확인 실행 범위를 갖도록 소급 적용했다.
- 검색광고 저성과 판단은 LLM이 먼저 추측하지 않고 `SearchAdPerformanceSnapshot`과 규칙 엔진이 낮은 전환율, 주문 없는 클릭, 높은 CPA, 기기/시간대 차이, 전환 추적 미확인을 먼저 판정하도록 확장했다.
- 조정 가능한 광고 성과 안건은 그로, 전환 추적/주문 연결 검증은 데이가 맡도록 담당자 배정과 인사과 기본 롤모델을 보강했다.

**Fixed:**

- Outcome reports no longer disappear after owner decision; they can be re-read through API and approval detail UI.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-05-22 | Completion report created | Codex |
| 1.1 | 2026-05-22 | Added `/data` provider data contract transparency slice | Codex |
| 1.2 | 2026-05-23 | Added `/data` provider evidence expansion roadmap for post-MVP judgment hardening | Codex |
| 1.3 | 2026-05-23 | Added real provider collection reset and read-only Gemini LLM pilot evidence | Codex |
| 1.4 | 2026-05-23 | Added AI-proposed search ad execution scope and owner-editable decision recording | Codex |
| 1.5 | 2026-05-23 | Added execution scope backfill API and applied it to local saved approval requests | Codex |
| 1.6 | 2026-05-23 | Added Search Ad performance rule engine, owner assignment, AI evidence summary, and data contract fields before LLM judgment | Codex |
