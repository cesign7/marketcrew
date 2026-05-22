# follow-up-task-queue-owner-learning Do Log

> **Project**: marketcrew2
> **Feature**: `follow-up-task-queue-owner-learning`
> **PDCA Cycle**: #3
> **Status**: Complete
> **Started**: 2026-05-22 KST

---

## Scope

이번 Do 단계는 결재 이후 생성된 `FollowUpInternalTask`를 실제 운영 화면에서 관리할 수 있게 만드는 첫 slice다. 핵심은 대표가 결정을 내린 뒤 일이 사라지지 않고 담당 캐릭터별 내부 업무와 다음 추천 기준으로 남는 것이다.

## Module Map

| Module | Goal | Status |
|--------|------|--------|
| module-1 | follow-up queue view model과 status API | Complete |
| module-2 | `/follow-ups` UI와 `/operations` link | Complete |
| module-3 | tests/docs/check | Complete |

## Iteration 1 - Deterministic Follow-up Queue

### Completed

- `buildFollowUpQueueViewModel`을 추가해 후속 업무, source approval, 최신 대표 결정, preflight blocker, execution blocker, outcome 상태를 묶었다.
- owner learning signal 6개를 계산한다.
  - 대표 결정 학습
  - 초안 우선 패턴
  - 쓰기 게이트 차단
  - 반복 차단 사유
  - 미완료 후속 업무
  - 성과 판단 대기
- `/follow-ups` route를 추가했다.
- `FollowUpQueueBoard`, `OwnerLearningPanel`, `FollowUpTaskStatusButton`을 추가했다.
- `PATCH /api/follow-ups/[id]`로 `OPEN`/`DONE` 상태 변경을 저장한다.
- `/operations` topbar에 `후속 업무` link를 추가했다.

### Verification

| Command | Result |
|---------|--------|
| `npm test -- --run tests/application/follow-up-queue-view-model.test.ts tests/api/follow-up-route.test.ts` | passed, 2 files / 4 tests |
| `npm test -- --run` | passed, 20 files / 67 tests |
| `npm run typecheck` | passed |
| `npm run build` | passed, `/follow-ups` and `/api/follow-ups/[id]` included |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e -- --project=chromium tests/e2e/follow-ups-smoke.spec.ts` | passed, 1 chromium test |
| in-app browser `/follow-ups` smoke | title, Owner Learning, 후속 업무 큐, 완료 처리, 쓰기 게이트 차단 visible |

## Next

Check, QA, completion report까지 완료했다. `docs/03-analysis/follow-up-task-queue-owner-learning.analysis.md`는 matchRate 99%, `docs/05-qa/follow-up-task-queue-owner-learning.qa-report.md`는 `QA_PASS`, `docs/04-report/follow-up-task-queue-owner-learning.report.md`는 completion rate 99%로 정리했다. 실제 provider write는 계속 차단한다.
