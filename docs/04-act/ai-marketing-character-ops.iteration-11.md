# ai-marketing-character-ops Act Iteration 11

> **PDCA Phase**: Act / Iteration 11
>
> **Date**: 2026-05-22 KST
>
> **Scope**: Outcome report history API and approval detail re-read
>
> **Completes**: `module-12` / saved outcome report API and approval detail history
>
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-10.md`

## Act Target

Iteration 10에서 대표가 결재 상세 화면에서 provider sync 성공/실패 근거를 볼 수 있게 했다. 이번 iteration은 대표 결정 후 생성된 `OutcomeReport`가 저장 이력으로 남고, 같은 결재 상세 또는 API에서 다시 읽히는지 확인한다.

대표가 `승인 후 바로 반영`을 눌렀을 때 write gate가 닫혀 있으면 외부 반영은 멈추지만, 그 판단 결과와 후속 업무는 사라지면 안 된다. reload 이후에도 기준선, 체크포인트, provider 근거, source report ID가 남아야 한다.

## Implemented Change

| Area | Change |
|------|--------|
| Detail view model | `ApprovalDetailViewModel`에 `outcomeHistory`를 추가했다. |
| Outcome mapper | `buildOutcomeHistory`가 저장된 `OutcomeReport`를 결재 ID 기준으로 필터링하고 최신순으로 정렬한다. |
| Detail UI | `OutcomeReportHistoryPanel`이 `저장된 성과 보고`, 상태, 기준선, 체크포인트, evidence label, source report ID, 후속 업무를 보여준다. |
| API | `GET /api/approvals/[id]/outcomes`가 결재별 저장 성과 보고 이력을 JSON으로 반환한다. |
| E2E | approval detail smoke가 대표 결정 후 reload를 수행하고, 성과 보고 이력이 화면에 남는지 확인한다. |
| Safety | outcome 재조회는 read-only다. provider write gate가 닫힌 결과를 보여줄 뿐 외부 재시도나 write 호출을 만들지 않는다. |

## Outcome History Contract

| Field | Purpose |
|-------|---------|
| `stateLabel` / `stateTone` | 대표가 성공, 부분 성공, 실패, 판단 보류를 빠르게 구분한다. |
| `summary` | 실행 결과를 사람이 읽는 한 줄 성과 보고로 표시한다. |
| `baselineSummary` | 성과 판단 기준이 된 사전 기준선을 표시한다. |
| `checkpointSummary` | 언제 무엇을 다시 확인해야 하는지 표시한다. |
| `evidenceLabels` | 키워드광고, 데이터랩, 스마트스토어, 자체몰 같은 provider 근거 label을 보존한다. |
| `sourceReportIds` | 내부 추적을 위한 provider sync report ID를 보존한다. |
| `followUpAgendaTitle` | 오피가 만든 후속 내부 업무를 상세 화면에서 이어 보게 한다. |

## Verification

| Check | Result |
|-------|--------|
| Targeted app/API tests | `approval-detail-view-model`, `approval-decision-route` 8 tests passed |
| `npm test -- --run` | 15 files, 53 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e` | 1 chromium smoke passed |
| E2E re-read proof | After `승인 후 바로 반영`, reload still showed `저장된 성과 보고` and provider write gate summary |

## Remaining Act Order

1. 최종 MVP check에서 Plan/Design/Do 대비 빠진 수직 슬라이스와 운영 위험을 확인한다.
2. 실제 DB 스키마/저장소로 옮길 계약을 정리한다.
3. 실제 provider write는 계속 차단하고, 대표 승인 + write gate + preflight + rollback + 별도 운영 승인 조건이 모두 갖춰진 뒤 별도 Act로 연다.

## Act Decision

`module-12`는 local MVP 기준으로 구현됐다. 대표 결정 이후 생성된 성과 보고는 이제 API와 결재 상세 화면에서 다시 읽을 수 있다. 다음 iteration은 새 기능 추가보다 MVP 최종 check, 저장소 전환 범위, 실제 운영 전 안전 경계 점검이 우선이다.
