# ai-marketing-character-ops Act Iteration 21

> **Module/Goal**: `module-23 실데이터 + 실제 LLM 파일럿`으로 기존 운영 데이터를 정리한 뒤 실제 수집 집계와 Gemini 호출을 연결한다.
> **Check Source**: 대표 요청 - 기존 데이터 혼동 제거, 실제 데이터 수집 확인, LLM 판단 패킷 생성, 실제 LLM 호출 파일럿
> **Date**: 2026-05-23
> **Status**: Done

## Context

1차 MVP는 규칙 기반 모아 계획과 `llm_dry_run` 감사 기록까지 닫혔다. 다음 운영 검증은 "실제 수집 데이터만 보고 LLM이 결재 가능한 우선순위를 만들 수 있는가"였다. 기존 샘플/이전 실행 데이터가 섞이면 판단 품질을 보기 어렵기 때문에 먼저 DB를 백업하고 운영 생성 레코드를 초기화했다.

## Changes

| Area | Result |
|------|--------|
| DB 정리 | `.marketcrew/backups/marketcrew-before-real-llm-pilot-2026-05-23.sql` 백업 후 `workflow_records` 운영 레코드 156건을 초기화했다. |
| 실제 수집 | `GET /api/operations/provider-sync`로 Search Ad, DataLab, Smartstore, Shop 네 채널을 읽기 전용으로 수집했다. |
| LLM 입력 | `POST /api/operations/llm-real-pilot`를 추가해 실제 provider 집계, 후보 안건, 근거 ID만 Gemini에 전달한다. |
| 비용 가드 | 실제 파일럿 프롬프트 기준으로 입력 토큰을 사전 추정해 1회/일/월 예산과 토큰 상한을 검사한다. |
| 실행 기록 | Gemini 응답을 `AgentRun(mode=llm, provider=gemini)`으로 저장하고, 선택된 `approval_request`와 근거 ID를 연결한다. |
| 로컬 백엔드 | 로컬 `.env`에 같은 Next 서버를 백엔드 API로 읽는 설정을 추가해, 프론트가 DB를 직접 읽지 않고도 실제 DB 화면을 볼 수 있게 했다. |

## Real Data Pilot Evidence

| Source | Result |
|--------|--------|
| 네이버 키워드광고 | `SYNCED`, 64개 키워드 수요 요약 저장, 외부 쓰기 0건 |
| 네이버 데이터랩 | `SYNCED`, 2개 검색 트렌드 요약 저장, 절대 검색량으로 표현하지 않음 |
| 스마트스토어(스티커씨) | `SYNCED`, 최근 30일 주문 100건, 매출 697,220원, 상위 상품 이미지 확인 |
| 쇼핑몰(커피프린트) | `SYNCED`, 최근 30일 주문 26건, 재구매 고객 4명, 매출 3,940,300원 |
| 실제 LLM 호출 | Gemini `gemini-3.5-flash`, 원천 행 제외, 후보 3건, 근거 6개, 예상 비용 18원 기록 |

## Safety Contract

- 외부 광고, 상품, 주문, 고객 데이터 write는 계속 차단한다.
- LLM에는 주문번호, 고객 식별정보, 토큰, 시크릿, 원천 행을 보내지 않는다.
- 실제 LLM 호출은 대표 결재 초안/우선순위 판단만 수행한다.
- `ProviderSyncReport`, `AgentRun`, `AgentRunWorkflowLink`로 수집 근거와 LLM 판단을 추적한다.

## Verification

| Check | Result |
|-------|--------|
| DB backup | 백업 파일 236KB 생성 |
| DB reset | `workflow_records` 156건 삭제 후 새 파일럿 데이터만 저장 |
| Provider sync | 네 채널 모두 `SYNCED`, `writeAttempted=false` |
| Gemini model probe | `v1beta/models`에서 `gemini-3.5-flash` `generateContent` 지원 확인 |
| Real LLM pilot API | `POST /api/operations/llm-real-pilot` 200, `status=SUCCEEDED` |
| AgentRun audit | Gemini run 2건, provider sync run 4건, raw rows included 0건 |
| Unit tests | `npm test -- tests/llm/gemini-planner.test.ts tests/api/llm-real-pilot-route.test.ts` passed |
| Full unit tests | `npm test -- --run` 48 files / 124 tests passed |
| Typecheck | `npm run typecheck` passed |
| Build | `npm run build` passed |
| Audit | `npm audit --omit=dev` 0 vulnerabilities |
| Diff check | `git diff --check` passed |
| Browser smoke | `/growth` 실제 DB 화면에서 상품 후보 카드 3개, 드릴다운 3개, `대상 상품/판단 근거/수집 기록` 확인 |

## MVP Progress

1차 MVP 대비 진행율은 **100% 유지**다. 이번 작업은 MVP 이후 실제 데이터/실제 LLM 연결을 검증한 후속 운영 확장이다.

## Next

다음 순서는 실제 LLM 결과를 운영 화면의 별도 "AI 파일럿 판단" 패널로 보여주고, 이후 normalized analytics schema를 설계해 시간대, PC/모바일, 광고 설정, 상품/채널 단위 판단 근거를 더 안정적으로 공급하는 것이다. 실제 provider write executor는 별도 PDCA와 명시 승인 전까지 시작하지 않는다.
