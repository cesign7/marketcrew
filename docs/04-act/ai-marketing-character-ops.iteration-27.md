# Iteration 27 - 실제 AI 판단 전 교차 브랜드 잔여 데이터 차단

## 완료한 목표

production DB에 이전 구조에서 저장된 `스마트스토어/자체몰 매출 균형` 결재안이 남아 있어도 실제 AI 파일럿 판단 후보와 운영 화면에 다시 섞이지 않도록 차단했다.

## 발견한 문제

실제 Gemini 파일럿 호출은 성공했지만, 저장소에 남아 있던 예전 `channel-balance` 결재안이 후보로 들어가면서 스티커씨와 커피프린트를 하나의 매출 균형 문제로 묶는 판단이 나왔다.

이 판단은 현재 제품 원칙과 맞지 않는다.

- 스티커씨와 커피프린트는 서로 다른 브랜드다.
- 스마트스토어, 자체몰, 향후 커피프린트 스마트스토어는 각 브랜드 안의 판매채널이다.
- AI는 두 브랜드의 매출/예산을 비교하거나 하나의 균형 안건으로 묶으면 안 된다.

## 반영 내역

| 영역 | 변경 |
|---|---|
| AI 입력 후보 | `filterActiveApprovalRequests`를 추가해 사용 중단된 교차 브랜드 결재안을 `candidateSummaries`에서 제외한다. |
| 실제 파일럿 API | Railway 백엔드의 `/api/operations/llm-real-pilot`도 같은 필터를 사용해 production DB의 잔여 안건을 입력 전에 걸러낸다. |
| Gemini 프롬프트 | 스티커씨/커피프린트 브랜드 분리, 매출/예산 비교 금지, 커피프린트 스마트스토어는 커피프린트 내부 판매채널이라는 규칙을 명시했다. |
| Gemini 응답 정규화 | 응답 제목/요약에 교차 브랜드 균형 판단이 섞이면 규칙 기반 요약으로 되돌린다. |
| 운영 화면 | 저장된 실제 AI 실행 이력 중 사용 중단된 교차 브랜드 판단은 최신 실행이어도 AI 파일럿 판단 패널에서 제외한다. |

## 테스트 기준

- 오래된 `approval-agenda-provider-channel-balance-stickersee-coffeeprint-*` 결재안이 저장돼 있어도 AI 입력 후보에 들어가지 않는다.
- Gemini 프롬프트에는 브랜드 분리와 비교 금지 규칙이 포함된다.
- Gemini 응답에 `스마트스토어/자체몰 매출 균형` 같은 문구가 섞이면 화면 표시용 요약으로 채택하지 않는다.
- 저장된 이전 AI 실행 이력이 최신이어도 운영 화면은 유효한 이전 판단을 보여주거나 연결 없음 상태로 떨어진다.

## 검증

- `npm run typecheck`
- `npm test -- --run tests/application/deprecated-approvals.test.ts tests/application/llm-planner.test.ts tests/llm/gemini-planner.test.ts tests/application/agenda-room-view-model.test.ts` - 4 files / 16 tests
- `npm test -- --run` - 51 files / 137 tests
- `npm run build`
- `npm run test:e2e` - 11 tests
- `npm audit --omit=dev` - 0 vulnerabilities
