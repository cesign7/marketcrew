# ai-marketing-character-ops Act Iteration 16

> **PDCA Phase**: Act / Iteration 16
>
> **Date**: 2026-05-23 KST
>
> **Scope**: 근거 요청 큐 처리 API와 데이 검증 액션
>
> **Completes**: `module-21` / evidence request review workflow
>
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-15.md`

## Act Target

`module-20`은 자유 탐색 가설을 결재 안건과 분리하고, 데이 검증 전 승격을 차단했다. 이번 iteration은 그 큐를 실제 업무처럼 움직이게 한다. 데이는 `/operations`에서 근거 요청을 `수집 시작`, `근거 충분`, `근거 부족`으로 처리하고, 검증된 가설만 내부 `AgendaCandidate`로 승격한다.

## Implemented Change

| Area | Change |
|------|--------|
| Application | `reviewEvidenceRequest`가 `EvidenceRequest` 상태, `HypothesisCandidate` 상태, 승격 `AgendaCandidate`를 한 번에 처리한다. |
| Repository | 검증 결과는 기존 memory/file/Postgres repository의 `evidenceRequests`, `hypothesisCandidates`, `agendaCandidates`, `agentRuns`, `agentRunWorkflowLinks`에 저장된다. |
| Audit | `evidence_request_review` AgentRun을 추가해 데이 검증 기록과 연결 객체를 남긴다. |
| API | `PATCH /api/evidence-requests/[id]`가 상태 변경, 검증 메모, 근거 ID를 받고 오류를 한글 메시지로 반환한다. |
| Operations UI | `근거 요청 큐` 카드에 `수집 시작`, `근거 충분`, `근거 부족` 버튼을 추가하고 처리 후 화면을 새로 고친다. |
| Docs | Plan v0.9, Design v0.5에 module-21 계약과 완료 상태를 반영했다. |

## Review Rule

| Day Action | Stored State | Promotion |
|------------|--------------|-----------|
| `수집 시작` | `EvidenceRequest.status=COLLECTING` | 승격하지 않음 |
| `근거 부족` | `EvidenceRequest.status=INSUFFICIENT` | 승격하지 않음 |
| `근거 충분` | `EvidenceRequest.status=VERIFIED` | 연결 요청이 모두 검증되면 `AgendaCandidate` 저장 |

## Verification

| Check | Result |
|-------|--------|
| TDD red check | `reviewEvidenceRequest`, evidence request API route, queue action 버튼이 없는 상태에서 대상 테스트 실패 확인 |
| 대상 테스트 | `tests/application/evidence-request-review.test.ts`, `tests/api/evidence-request-route.test.ts`, `tests/components/evidence-request-queue-panel.test.ts` passed |
| 타입체크 | `npm run typecheck` passed |

## MVP Progress

1차 MVP 대비 진행율은 **100%**로 유지한다. 이번 작업은 1차 MVP 이후 “생각하지 못한 가설도 실제 업무 큐에서 검증하고 감사 가능한 방식으로 승격하는 운영 보강”이다.

## Act Decision

`module-21`은 local MVP 기준으로 구현한다. 다음 안전한 순서는 실제 LLM adapter dry-run을 바로 열기 전에, 비용 가드가 허용한 범위 안에서 LLM 실행 큐가 어떤 근거 묶음을 읽고 어떤 결과를 남기는지 dry-run 계약으로 고정하는 것이다.
