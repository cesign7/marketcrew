# ai-marketing-character-ops Act Iteration 15

> **PDCA Phase**: Act / Iteration 15
>
> **Date**: 2026-05-23 KST
>
> **Scope**: 근거 요청 큐와 검증 후 승격 가드
>
> **Completes**: `module-20` / hypothesis evidence request queue and promotion guard
>
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-14.md`

## Act Target

`module-19`에서 캐릭터별 자유 탐색 롤모델은 화면에 고정했다. 이번 iteration은 그 정책을 실제 업무 흐름으로 내린다. 캐릭터는 정해진 이상신호 밖의 가설을 만들 수 있지만, 데이가 요청 근거를 확인하기 전에는 대표 결재 안건으로 올라가지 않아야 한다.

## Implemented Change

| Area | Change |
|------|--------|
| Domain | `HypothesisCandidate`, `EvidenceRequest`, status 타입을 추가했다. |
| Application | `buildSampleHypothesisEvidenceQueue`, `canPromoteHypothesis`, `promoteVerifiedHypothesesToAgendaCandidates`로 검증 후 승격 규칙을 고정했다. |
| Repository | memory/file/Postgres workflow repository에 `hypothesisCandidates`, `evidenceRequests` 컬렉션을 추가했다. |
| Operations view model | 검증 전 근거 요청을 `WAITING_EVIDENCE` count에 포함하고 `evidenceRequestQueue` view model을 제공한다. |
| Operations UI | `/operations`에 `근거 요청 큐` 패널을 추가해 검증 대기, 승격 가능, 확인할 필드, 비교 기간을 한글로 보여준다. |
| Docs | Plan v0.8, Design v0.4에 module-20 구현 상태와 실제 타입 계약을 반영했다. |

## Promotion Guard

| State | Result |
|-------|--------|
| `HypothesisCandidate.status=WAITING_EVIDENCE` | 대표 결재로 승격하지 않고 근거 요청 큐에 남긴다. |
| 연결된 `EvidenceRequest.status`가 `REQUESTED` 또는 `COLLECTING` | 데이 확인 대기로 표시한다. |
| 연결된 `EvidenceRequest.status=INSUFFICIENT` | 보강 필요로 표시한다. |
| 가설이 `VERIFIED`이고 연결 근거 요청이 모두 `VERIFIED` | `AgendaCandidate`로 승격 가능하다. |

## Verification

| Check | Result |
|-------|--------|
| TDD red check | `evidence-request-guard`, `EvidenceRequestQueuePanel`, view model count가 없는 상태에서 대상 테스트 실패 확인 |
| 대상 테스트 | `tests/application/evidence-request-guard.test.ts`, `tests/application/agenda-room-view-model.test.ts`, `tests/components/evidence-request-queue-panel.test.ts` passed |
| 전체 단위 테스트 | 40 files, 109 tests passed |
| 타입체크 | `npm run typecheck` passed |
| Production build | `npm run build` passed |
| Diff whitespace check | `git diff --check` passed |
| E2E smoke | 11 Chromium tests passed |
| Local browser smoke | `/operations` 모바일 390px에서 `근거 요청 큐`, `검증 전 결재 승격 차단`, `데이 확인 대기`, `승격 가능` 표시 확인 |

## MVP Progress

1차 MVP 대비 진행율은 **100%**로 유지한다. 이번 작업은 1차 MVP 이후 “생각하지 못한 가설도 안전하게 다루는 운영 보강”이다.

## Act Decision

`module-20`은 local MVP 기준으로 구현한다. 다음 안전한 순서는 실제 근거 요청이 쌓였을 때 데이가 원천 필드/집계 근거를 어떻게 확인하고 상태를 바꾸는지 운영 로그와 API로 다듬는 것이다.
