# marketcrew2 에이전트 작업 맥락

이 저장소는 `marketcrew2` 프로젝트다. 목표는 한국어 기반 AI/LLM 마케팅 운영 시스템을 만드는 것이다. 앞으로 이 저장소에서 작업하는 에이전트는 이 파일을 먼저 읽고, 현재 제품 방향과 안전 경계를 유지해야 한다.

## 현재 기준 문서

- 1차 MVP 플랜 문서: `docs/01-plan/features/ai-marketing-character-ops.plan.md`
- 디자인 문서: `docs/02-design/features/ai-marketing-character-ops.design.md`
- 분석 문서: `docs/03-analysis/ai-marketing-character-ops.analysis.md`
- 완료 보고서: `docs/04-report/ai-marketing-character-ops.report.md`
- 현재 플랜 문서: `docs/01-plan/features/ops-persistence-provenance-foundation.plan.md`
- 현재 디자인 문서: `docs/02-design/features/ops-persistence-provenance-foundation.design.md`
- 현재 Do 문서: `docs/03-do/ops-persistence-provenance-foundation.do.md`
- 현재 Act 문서: `docs/04-act/ops-persistence-provenance-foundation.iteration-6.md`
- 현재 Check 문서: `docs/03-analysis/ops-persistence-provenance-foundation.analysis.md`
- 현재 QA 문서: `docs/05-qa/ops-persistence-provenance-foundation.qa-report.md`
- 현재 완료 보고서: `docs/04-report/ops-persistence-provenance-foundation.report.md`
- 후속 업무 큐 플랜 문서: `docs/01-plan/features/follow-up-task-queue-owner-learning.plan.md`
- 후속 업무 큐 디자인 문서: `docs/02-design/features/follow-up-task-queue-owner-learning.design.md`
- 후속 업무 큐 Do 문서: `docs/03-do/follow-up-task-queue-owner-learning.do.md`
- 후속 업무 큐 Act 문서: `docs/04-act/follow-up-task-queue-owner-learning.iteration-1.md`
- 후속 업무 큐 Check 문서: `docs/03-analysis/follow-up-task-queue-owner-learning.analysis.md`
- 후속 업무 큐 QA 문서: `docs/05-qa/follow-up-task-queue-owner-learning.qa-report.md`
- 후속 업무 큐 완료 보고서: `docs/04-report/follow-up-task-queue-owner-learning.report.md`
- LLM 비용 가드 플랜 문서: `docs/01-plan/features/real-llm-provider-cost-governance.plan.md`
- LLM 비용 가드 디자인 문서: `docs/02-design/features/real-llm-provider-cost-governance.design.md`
- LLM 비용 가드 Do 문서: `docs/03-do/real-llm-provider-cost-governance.do.md`
- LLM 비용 가드 Act 문서: `docs/04-act/real-llm-provider-cost-governance.iteration-1.md`
- LLM 비용 가드 Check 문서: `docs/03-analysis/real-llm-provider-cost-governance.analysis.md`
- LLM 비용 가드 QA 문서: `docs/05-qa/real-llm-provider-cost-governance.qa-report.md`
- LLM 비용 가드 완료 보고서: `docs/04-report/real-llm-provider-cost-governance.report.md`
- MVP 최종 근거 드릴다운 Act 문서: `docs/04-act/mvp-final-provenance-closeout.iteration-1.md`
- MVP 최종 근거 드릴다운 QA 문서: `docs/05-qa/mvp-final-provenance-closeout.qa-report.md`
- MVP 최종 완료 보고서: `docs/04-report/mvp-final-provenance-closeout.report.md`
- 클라우드 연결 문서: `docs/06-deploy/marketcrew-cloud-setup.md`
- PDCA 상태 파일: `.bkit-memory.json`
- 현재 기능명: `mvp-final-provenance-closeout`
- 현재 PDCA 단계: `completed`
- 1차 MVP 완료 상황: `ai-marketing-character-ops`는 iteration 11과 QA report까지 완료했고, 최신 Check에서 1차 MVP match rate는 92%, QA verdict는 `QA_PASS`다. `/operations`에서 올라온 안건을 보고 `/approvals/[id]`에서 provider 근거, diff, 대표 결정, write gate 차단, 저장된 outcome report를 확인할 수 있다.
- 현재 진행 작업: `ops-persistence-provenance-foundation` PDCA cycle #2는 QA/report까지 완료했다. Check 7/7, matchRate 98%, QA verdict `QA_PASS`다. `.env` 기준 local runtime은 새 `marketcrew` Postgres DB를 읽고 쓴다. `/operations`와 `/approvals/[id]`에서 AgentRun, model/token/cost, provider evidence, 스티커씨/커피프린트 채널 근거를 확인할 수 있다. 실제 provider write는 계속 차단한다.
- 현재 진행 작업 2: `follow-up-task-queue-owner-learning` PDCA cycle #3는 Check/QA/report까지 완료했다. `/follow-ups` 전용 큐, owner learning signal, `PATCH /api/follow-ups/[id]` 상태 변경 API, `/operations` 후속 업무 link가 동작한다. `npm test -- --run` 20 files/67 tests, typecheck, build, audit 0 vulnerabilities, follow-ups Playwright smoke, in-app browser smoke를 통과했다. 1차 MVP 대비 진행율은 99%다.
- 현재 진행 작업 3: `real-llm-provider-cost-governance` PDCA cycle #4는 Check/QA/report까지 완료했다. `/operations`에 LLM 비용 가드가 표시되고 `/api/operations/llm-cost-governance`가 read-only로 provider/key, env 단가, 1회/일 예산, AgentRun 누적 비용, token cap, raw row privacy gate를 반환한다. 현재 local env는 Gemini provider/key가 준비됐지만 단가/예산 env가 없어 의도대로 `live call 차단`이다. `npm test -- --run` 21 files/70 tests, typecheck, build, audit 0 vulnerabilities, LLM cost governance Playwright smoke, localhost:3001 HTTP/API smoke를 통과했다. 1차 MVP 대비 진행율은 99.5%였다.
- 현재 진행 작업 4: `mvp-final-provenance-closeout`은 `/operations` 결재 미리보기 카드에 `카드별 근거 추적`을 추가해 데이터 근거, AI 실행 이력, 연동 수집 기록, 성과 체크포인트, 안전 조건을 카드 안에서 바로 확인하게 했다. 검증은 typecheck, full unit, build, audit, full e2e 3 tests, localhost:3001 browser text scan을 통과했다. 1차 MVP 대비 진행율은 100%다.
- 클라우드 연결 상태: GitHub `https://github.com/cesign7/marketcrew`의 기본 브랜치는 `main`이며 현재 MVP 커밋이 올라가 있다. Vercel production은 `https://marketcrew.vercel.app`이고 Git 연결의 production branch도 `main`이다. Railway project는 `marketcrew`, Postgres service는 `Online`이다. Vercel production은 Railway Postgres를 `MARKETCREW_REPOSITORY_MODE=db`로 읽고, `/api/operations/workflow-state` production smoke에서 `approvalRequests=5`, `providerSyncReports=18`, `agentRuns=1`을 확인했다. Custom domain `marketcrew.app`과 `www.marketcrew.app`은 Vercel project에 추가됐고 Cloudflare DNS의 `A @ 76.76.21.21`, `A www 76.76.21.21` 설정을 기다리는 상태다. 기존 GitHub branch `feat-ai-marketing-operations-mvp`는 아직 남아 있으며 삭제는 명시 지시 전까지 하지 않는다.
- 다음 권장 작업: 1차 MVP는 완료로 닫고, 이후 작업은 실제 LLM adapter dry-run, normalized analytics schema, 실제 provider write executor 설계처럼 후속 확장으로 진행한다. 실제 provider write executor는 별도 PDCA와 명시 승인 전까지 시작하지 않는다.

제품 방향이 바뀌면 위 문서들을 함께 갱신한다. PDCA 단계, 요약, 다음 작업이 바뀌면 `.bkit-memory.json`도 같이 수정한다.

## 제품 방향

이 제품은 단순한 대시보드가 아니다. 대표 혼자 광고와 마케팅을 관리하기 어렵기 때문에, AI 직원들이 데이터를 보고 먼저 안건을 올리고, 오피가 결재 문서로 정리하고, 대표 승인 후 실행과 성과 보고까지 이어지는 회사형 AI 마케팅 운영실이다.

기본 업무 흐름은 아래와 같다.

```text
데이터 소스
  -> 하위 캐릭터가 문제/기회 감지
  -> 캐릭터 보고
  -> 오피 종합
  -> 대표 결재
  -> 실행 전 점검 / 쓰기 게이트 / 되돌리기 조건 확인
  -> 모의 실행 또는 승인된 실행기
  -> 실행 결과
  -> 성과 체크포인트
  -> 결과 보고
  -> 후속 내부 업무
```

첫 MVP는 하위 캐릭터가 먼저 안건을 올리는 상신형 흐름이다. 대표가 오피에게 먼저 지시하는 command center를 1차 화면으로 만들지 않는다. 대표 직접 지시는 bottom-up 안건, 결재, 실행 미리보기, 성과 추적이 동작한 뒤 후속 확장으로 둔다.

## MVP 범위 기준

핵심 판단 기준은 이것이다.

```text
대표가 올라온 자료만 보고 오늘 결재할 수 있는가?
```

MVP에 포함한다.

- `MarketingCalendar` 기반 음력/양력 이벤트 윈도우.
- 하위 캐릭터의 bottom-up 안건 상신.
- 상품, 키워드, 캠페인, 상품 발굴, 시즌 키워드 광고 제안의 근거 표시.
- `ApprovalRequest`의 변경 전/후 diff, 위험 등급, 되돌리기 계획, 성과 측정 계획.
- 모의 실행기 또는 샌드박스 실행기.
- `ExecutionResult`, `PerformanceCheckpoint`, `OutcomeReport`.

MVP에서 제외한다.

- 모든 광고 자동 최적화.
- 실제 외부 provider write 기본 활성화.
- 대표 직접 지시형 command center를 메인 화면으로 만드는 것.
- 복잡한 게임 레벨, 보상, 전투 같은 장식적 시스템.
- 명시 승인과 write gate 없는 대량 메시지 발송, 쿠폰 발급, 입찰가/예산 변경, 상품 수정.

## 캐릭터 모델

MVP의 화면에 보이는 캐릭터는 7개로 유지한다.

| 키 | 이름 | 역할 |
|----|------|------|
| `opi` | 오피 | AI Chief of Staff / 마케팅 운영실장. 하위 보고를 대표 결재 안건으로 종합한다. |
| `gro` | 그로 | 퍼포먼스 마케터. 네이버 키워드광고, 키워드 기회, 시즌 키워드 광고 생애주기를 담당한다. |
| `maru` | 마루 | 커머스 운영 분석가. 스마트스토어/자체몰 매출, 주문, 재고, 이벤트 준비 상태를 담당한다. |
| `day` | 데이 | 데이터 QA와 근거 감사 담당. 데이터 신뢰도, 누락 근거, API 실패, 실행 전 점검을 담당한다. |
| `copy` | 카피 | 캠페인 문안 담당. 광고 문구, 상품 메시지, 이벤트 캠페인 초안을 만든다. |
| `ripi` | 리피 | 재구매/CRM 마케터. 재구매, 고객군, VIP, 휴면 고객 안건을 담당한다. |
| `pro` | 프로 | 상품/수익 전략가. 상품, 가격, 마진, 프로모션, 묶음상품, 상품 발굴을 담당한다. |

새로운 캐릭터를 쉽게 늘리지 않는다. 반복되는 안건 유형이 위 7개 역할로 도저히 소화되지 않을 때만 새 캐릭터를 검토한다. 우선은 기존 캐릭터의 모드나 스킬로 확장한다.

## 시즌성과 음력 규칙

시즌성은 핵심 도메인 규칙이다.

- 설날, 추석, 부처님오신날 같은 음력 명절은 같은 양력 날짜가 아니라 같은 음력 이벤트 윈도우 기준으로 비교한다.
- `MarketingCalendar`는 이벤트 유형, 음력/양력 날짜 정보, 연도별 양력 환산일, D-n 이벤트 윈도우를 저장한다.
- `lunar_event_yoy`는 올해 이벤트 윈도우와 전년도 같은 음력 이벤트 윈도우를 비교한다.
- 시즌 키워드 광고는 일반 상품 시즌성과 분리해서 `SeasonalKeywordAdPlan`으로 관리한다.

시즌 키워드 광고 생애주기는 아래 순서로 둔다.

```text
DISCOVER -> VALIDATE -> TEST -> SCALE -> PEAK_GUARD -> TAPER -> REVIEW
```

시즌 키워드 광고 안건은 승인 전 아래 안전 필드를 가져야 한다.

- `dailyBudgetCap`
- `bidCap`
- `stopConditions`
- `negativeKeywordCandidates`
- `landingReadiness`
- `measurementPlan`

키워드 수요는 `KeywordDemandSnapshot`으로 캐시한다. 검색 트렌드는 `SearchTrendSnapshot`으로 저장한다. 데이터랩 계열 지표는 상대 추이이므로 절대 검색량처럼 표현하지 않는다. LLM에는 전체 키워드 원본 목록을 보내지 않고 상위 후보 요약과 근거 ID만 보낸다.

## 안전 경계

기본값은 read-only다.

- 실제 외부 쓰기는 같은 작업 턴에서 사용자가 명시 승인하지 않는 한 구현하거나 활성화하지 않는다.
- `EXTERNAL_WRITE_ENABLED`와 `SEARCH_AD_WRITE_ENABLED` 같은 provider별 write gate는 기본값을 false로 둔다.
- 대표 승인만으로 위험 작업을 실행하지 않는다. 실행 전 점검, 위험 등급, write gate, rollback snapshot, 예산/중지 조건, 추적 상태가 모두 통과해야 한다.
- `CRITICAL` 위험 작업은 2차 확인이 필요하며 단일 클릭으로 실행하지 않는다.
- 데이터 신뢰도가 낮거나, 오래됐거나, 추적 상태가 불확실하면 실행이 아니라 근거 보강 또는 수정 요청으로 보낸다.

네이버 검색광고 작업은 구현이나 리뷰 전에 공식 API 동작을 확인한다. 특히 인증 서명, 헤더, 엔드포인트, 호출 제한, read/write 범위, 키워드 도구 제한을 확인해야 한다. 같은 턴에서 외부 쓰기 승인이 없는 한 검색광고 API 작업은 read-only로 유지한다.

## 아키텍처 방향

선택된 설계안은 Pragmatic Balance다.

MVP는 Next.js + TypeScript를 기준으로 한다. 도메인 규칙은 순수 함수와 타입으로 분리하고, UI와 API는 Next.js 기본 패턴을 따른다.

권장 구조는 아래와 같다.

```text
src/
  app/
    operations/
    approvals/
    api/
  components/
    character-room/
    agenda/
    approval/
    execution/
    opportunity/
    outcome/
  features/
    agenda-room/
    approvals/
  lib/
    application/
    domain/
      characters/
      signals/
      calendar/
      agenda/
      opportunities/
      approvals/
      execution/
      outcomes/
    integrations/
      sample/
      calendar/
      search-ad/
      datalab/
      smartstore/
      shop/
      executors/
    persistence/
    llm/
  tests/
```

의존성 규칙은 아래와 같다.

- Presentation 계층은 application query/action wrapper와 화면 표시용 타입을 가져온다.
- Application 계층은 domain과 infrastructure interface를 가져온다.
- Domain 계층은 React, DB, env, provider SDK, fetch, LLM client를 가져오지 않는다.
- Infrastructure 계층은 domain 타입을 가져올 수 있지만 presentation을 가져오지 않는다.

## 구현 순서

디자인 문서의 세션 가이드를 따른다.

1. `module-1`: 프로젝트 스캐폴드와 한국어 UI 셸.
2. `module-2`: 캘린더, 시그널, 기회, 시즌 키워드 정책, 승인/실행 타입 도메인 코어.
3. `module-3`: 샘플 어댑터, 인메모리 저장소, 안건 생성 루프, 모의 실행기.
4. `module-4`: Operations Room UI. 완료: 결재함 버킷, 오피 종합 문구, 결재 미리보기, 변경 전/후, rollback, 성과 확인 일정, write gate 경계 표시.
5. `module-5`: 승인과 성과 추적 루프. 완료: owner decision, preflight, mock execution result, outcome checkpoint, 결재 상세 화면, decision API route, client-side decision submit.
6. `module-6`: LLM 인터페이스, readiness 카드, Search Ad/DataLab read-only probe. 완료: planner 입력 계약, deterministic fallback, provider readiness API/화면, Search Ad/DataLab 공식 문서 기준 설정 점검.

## UI 방향

화면은 실무용 한국어 운영실이어야 한다. 랜딩페이지처럼 만들지 않는다.

- 첫 화면 핵심 영역: `오늘 올라온 안건`, `시즌 키워드`, `승인하면 바로 반영될 작업`, `성과 추적`, `추가 근거 대기`, `실패 실행`.
- 화면 라벨은 한국어로 쓴다.
- 캐릭터화는 담당자와 책임을 빠르게 파악하기 위한 장치다. 장식이 업무 속도를 방해하면 안 된다.
- 반복 운영 항목은 읽기 쉬운 카드와 표로 표시한다.
- 승인 상세 화면에는 오피 종합, 하위 캐릭터 보고, 근거, diff, 위험 등급, 되돌리기 계획, 성과 측정 계획, 결재 버튼이 있어야 한다.

## 테스트와 검증

완료를 주장하기 전에 반드시 검증한다.

Do 단계에서 추가해야 할 핵심 테스트는 아래와 같다.

- 음력 이벤트 윈도우 변환과 `lunar_event_yoy`.
- 시즌 키워드 광고 guard: 예산 상한, 입찰가 상한, 중지 조건 없이는 `APPROVE_AND_APPLY` 불가.
- `KeywordDemandSnapshot` stale/backoff 처리.
- 안건 triage의 중복 제거와 근거 기준.
- 승인 전 점검, write gate, 모의 실행 결과 상태.
- 성과 체크포인트 생성.
- Operations Room, Approval Detail, Outcome View의 Playwright smoke.

실제 API 키가 없어도 MVP가 동작하도록 샘플 fixture를 먼저 만든다.

## 문서 관리 규칙

- 제품 방향이 바뀌면 plan/design 문서를 함께 갱신한다.
- PDCA 단계가 바뀌면 `.bkit-memory.json`도 갱신한다.
- MVP 범위 기준을 유지한다. 새 기능을 추가하고 싶을 때는 “대표가 오늘 결재할 수 있는 구체 안건에 직접 도움이 되는가?”를 먼저 판단한다.
- 작업 완료 보고마다 `1차 MVP 대비 진행율`을 표시한다. 기준은 `.bkit-memory.json`의 `matchRate`와 최신 Act 문서의 남은 수직 slice를 함께 보고, 숫자와 짧은 근거를 한국어로 적는다.
