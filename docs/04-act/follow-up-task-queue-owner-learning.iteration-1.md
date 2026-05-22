# follow-up-task-queue-owner-learning Iteration 1

> **PDCA Phase**: Act / Do hardening
>
> **Date**: 2026-05-22 KST
> **Feature**: `follow-up-task-queue-owner-learning`
> **Module/Goal**: module-1 + module-2, 후속 업무 전용 큐와 owner learning 첫 화면
> **Status**: Complete

---

## Goal

대표 결정 이후 생성된 후속 내부 업무를 담당 캐릭터별로 보고, 업무를 완료/재오픈하며, 대표 결정 패턴을 다음 추천 기준으로 요약한다.

## Completed

- `/follow-ups` route를 추가했다.
- `FollowUpInternalTask`를 모아/그로/프로/카피/리피/마루/데이 큐로 나눴다.
- 각 업무에 source approval link, approval status, latest owner decision, outcome state, blocker, learning note를 붙였다.
- owner learning signal 6개를 계산했다.
- `PATCH /api/follow-ups/[id]`로 `OPEN`/`DONE` 상태를 저장한다.
- `/operations`에서 `후속 업무`로 이동할 수 있게 했다.

## Verification So Far

| Check | Result |
|-------|--------|
| Targeted unit/API tests | passed, 2 files / 4 tests |
| Full Vitest | passed, 20 files / 67 tests |
| Typecheck | passed |
| Build | passed, `/follow-ups` route included |
| Audit | 0 vulnerabilities |
| Follow-up e2e | passed, 1 chromium test |
| Browser smoke | `/follow-ups` visible with Owner Learning, 후속 업무 큐, 완료 처리 |

## Final Check

- Check 문서 작성 완료
- QA/report packaging 완료
- matchRate 99%, QA_PASS, completion rate 99%

## Safety

이번 iteration은 내부 follow-up task status만 바꾼다. 실제 provider write, 광고 변경, 쇼핑몰 수정은 열지 않는다.
