# ai-marketing-character-ops Act Iteration 14

> **PDCA Phase**: Act / Iteration 14
>
> **Date**: 2026-05-23 KST
>
> **Scope**: 인사과 자유 탐색/근거 요청 롤모델
>
> **Completes**: `module-19` / people-office free exploration policy and character role models
>
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-13.md`

## Act Target

대표가 기대하는 LLM 캐릭터의 가치는 정해진 이상신호를 체크하는 데서 끝나지 않는다. 각 캐릭터는 예상 못 한 상품/키워드/기기/시간대/고객군 가설을 제안할 수 있어야 하고, 그 가설은 확인된 근거가 생기기 전까지 결재 안건이 아니라 근거 요청으로 남아야 한다.

이번 iteration은 이 원칙을 `/people` 인사과 화면과 캐릭터별 기본 롤모델에 먼저 고정한다. 실제 근거 요청 큐와 승격 가드는 후속 `module-20`에서 구현한다.

## Implemented Change

| Area | Change |
|------|--------|
| View model | `AiExplorationPolicyView`를 추가해 정형 감지, 자유 탐색, 근거 요청, 검증 후 안건화 단계를 제공한다. |
| Saved settings compatibility | 이미 저장된 캐릭터 롤모델도 새 자유 탐색/검증 문장이 없으면 안전하게 보강한다. |
| People UI | `/people` 인사과에 `자유 탐색과 근거 요청 원칙` 카드를 추가했다. |
| Character role models | 모아, 그로, 프로, 카피, 리피, 마루, 데이에 자유 탐색 가설과 근거 검증 책임을 반영했다. |
| Docs | Plan v0.7, Design v0.3에 자유 탐색 정책, 근거 요청 루프, 후속 module-20을 추가했다. |
| Tests | view model과 컴포넌트 테스트로 새 정책과 기존 저장값 보강을 고정했다. |

## Character Role Model Update

| Character | Added Direction |
|-----------|-----------------|
| 모아 | 낯선 가설은 바로 결재하지 않고 검증된 근거만 안건으로 승격한다. |
| 그로 | 정해진 지표 밖의 키워드·기기·시간대 조합도 자유 탐색한다. |
| 프로 | 상품·시즌·채널 조합 가설을 만들고 필요한 근거를 요청한다. |
| 카피 | 고객 언어와 숨은 구매 이유 가설을 초안으로 제안한다. |
| 리피 | 재구매 고객군과 이탈 조짐을 개인정보 없이 집계 근거로 확인한다. |
| 마루 | 마진·예산·기회비용의 예상 못 한 위험을 찾고 확인 전 지출 확대를 막는다. |
| 데이 | LLM이 제안한 근거 후보를 실제 원천 필드와 집계 기준으로 검증한다. |

## Verification

| Check | Result |
|-------|--------|
| TDD red check | `explorationPolicy`와 저장 롤모델 보강이 없는 상태에서 대상 테스트 3건 실패 확인 |
| 대상 view/component 테스트 | `tests/components/ai-people-office.test.ts`, `tests/application/ai-operations-view-loader.test.ts` passed |
| 전체 단위 테스트 | 38 files, 107 tests passed |
| 타입체크 | `npm run typecheck` passed |
| Production build | `npm run build` passed |
| Diff whitespace check | `git diff --check` passed |
| Local HTTP smoke | `GET /people` returned 200 and contained `자유 탐색과 근거 요청 원칙`, `검증 후 안건화`, `키워드·기기·시간대` |

## MVP Progress

1차 MVP 대비 진행율은 **100%**로 유지한다. 이번 작업은 1차 MVP 이후 “LLM이 스스로 생각할 수 있는 범위”를 더 명확하게 제품 규칙과 인사과 화면에 붙인 운영 보강이다.

## Act Decision

`module-19`는 local MVP 기준으로 완료한다. 다음 안전한 순서는 `module-20` 근거 요청 큐와 검증 후 승격 가드다. 이 단계부터는 자유 탐색 가설을 별도 상태로 저장하고, 데이가 검증한 근거만 모아가 대표 결재 안건으로 승격하도록 구현한다.
