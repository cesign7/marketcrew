# ai-marketing-character-ops Act Iteration 1

> **PDCA Phase**: Act / Iteration 1
>
> **Date**: 2026-05-22 KST
>
> **Scope**: Persistence slice
>
> **Completes**: `module-6A` / local persistence and workflow-state storage goal
>
> **Check Source**: `docs/03-analysis/ai-marketing-character-ops.analysis.md`

## Act Target

Check 단계의 G-1을 먼저 줄인다. 대표가 결재한 뒤 생성되는 `OwnerDecision`, `ExecutionResult`, `OutcomeReport`, `FollowUpInternalTask`가 요청 단위 메모리에서 사라지지 않고 저장소에 남아 다시 조회되어야 한다.

## Implemented Change

| Area | Change |
|------|--------|
| 저장소 | `src/lib/persistence/file-repository.ts`에 로컬 JSON 기반 `MarketingWorkflowRepository` 구현을 추가했다. |
| 저장소 팩토리 | `src/lib/persistence/workflow-store.ts`에서 기본 저장 경로 `.marketcrew/workflow-store.json`, 샘플 workflow seed, 상태 요약을 제공한다. |
| 결재 API | `POST /api/approvals/:id/decision`이 파일 저장소를 사용하고, 샘플 approval이 없을 때만 seed한 뒤 대표 결정 결과를 저장한다. |
| 조회 API | `GET /api/operations/workflow-state`가 저장된 approval/decision/execution/outcome/follow-up 개수와 최근 ID를 반환한다. |
| 안전 경계 | 실제 provider write는 계속 `EXTERNAL_WRITE_ENABLED === "true"`일 때만 열리며, 이번 iteration은 외부 계정에 쓰지 않는다. |

## Acceptance Criteria

| Criteria | Status |
|----------|:------:|
| 대표 초안 승인 후 파일 저장소를 새 인스턴스로 열어도 결정/실행/성과/후속업무가 조회된다. | Implemented |
| 결재 API route가 파일 저장소에 workflow 결과를 남긴다. | Implemented |
| workflow-state API가 저장된 상태를 JSON으로 확인시킨다. | Implemented |
| `.marketcrew/` 로컬 실행 상태 파일은 git 추적에서 제외된다. | Implemented |

## Remaining Act Order

1. Evidence/provenance slice: planner input/output, provider evidence count, model/token metadata를 audit UI에 노출한다.
2. Read-only provider slice: Search Ad/DataLab 실제 읽기 호출을 failure-safe card로 연결한다.
3. Browser regression slice: approval detail에서 버튼 클릭 후 status notice를 검증하는 Playwright smoke를 추가한다.

## Verification

| Check | Result |
|-------|--------|
| `npm test` | 11 files, 25 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed, `/api/operations/workflow-state` dynamic route included |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `GET /api/operations/workflow-state` before decision | 200, persisted counts all 0 |
| `POST /api/approvals/approval-agenda-season-plan-buddha-gift-card/decision` with `APPROVE_DRAFT_ONLY` | 200, draft-only execution result created |
| `GET /api/operations/workflow-state` after decision | 200, `ownerDecisions=1`, `executionResults=1`, `outcomeReports=1`, `followUpInternalTasks=1` |

## Act Decision

G-1은 local MVP 기준으로 완화됐다. 아직 production DB/Prisma가 아니라 로컬 JSON 저장소이므로 “운영 DB 영속화”는 후속 hardening으로 남긴다. 다음 iteration은 Check 문서의 권장 순서대로 evidence/provenance slice를 진행한다.
