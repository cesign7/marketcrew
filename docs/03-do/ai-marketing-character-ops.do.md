# AI 마케팅 캐릭터 운영 시스템 Do 기록

## 실행 범위

- 기능: `ai-marketing-character-ops`
- 실행 단계: `module-1` ~ `module-12`
- 목표: 실제 외부 반영 없이 한국어 업무실 UI, 승인 대기 구조, 도메인 판단 규칙, 샘플 안건 생성 루프, 결재함 버킷, 결재 미리보기, 대표 결정, preflight, mock 실행 결과, 성과 체크포인트, LLM planner 입력 계약, provider readiness, read-only provider sync, 상품/키워드/마케팅 후보, provider 근거 기반 outcome 분석, 결재 상세 provider 근거 추적, 저장된 성과 보고 재조회와 테스트를 먼저 구현한다.

## 설계 기준

- 하위 담당 캐릭터가 안건을 만들고 `모아`가 묶어 대표 승인 대기열로 올린다.
- 대표가 승인하기 전에는 네이버 키워드광고, 스마트스토어, 자체 쇼핑몰에 쓰기 작업을 하지 않는다.
- 시즌성 판단은 양력과 음력을 모두 다루며, 설날/추석/부처님오신날처럼 음력 기준 행사는 음력 상대일로 비교한다.
- LLM 비용을 줄이기 위해 화면은 원천 데이터 전체가 아니라 집계된 근거와 판단 결과를 보여주는 구조로 둔다.

## 구현 내용

### module-1

- Next.js 앱 뼈대를 생성했다.
- `/operations`를 첫 화면으로 만들었다.
- 7개 캐릭터 업무 현황, 오늘 올라온 안건, 시즌 키워드, 승인 후 반영 대기열, 성과 추적 영역을 정적 샘플 데이터로 연결했다.
- 루트 `/`는 `/operations`로 이동한다.

### module-2

- `src/lib/domain`에 `MarketingCalendarEvent`, `Signal`, `KeywordDemandSnapshot`, `SeasonalKeywordAdPlan`, `AgendaCandidate` 타입을 만들었다.
- 음력 이벤트는 연도별 양력 환산일과 D-n 윈도우로 계산한다.
- `lunar_event_yoy` 시그널은 같은 양력 날짜가 아니라 같은 음력 이벤트 상대 윈도우를 비교한다.
- 시즌 키워드 광고안은 예산 상한, 입찰 상한, 중지 조건, 랜딩 준비, 근거가 없으면 승인 불가로 판정한다.
- stale 키워드 수요 캐시는 `KEYWORD_DEMAND_STALE`로 표시하고 LLM 원본 확장을 막는다.
- 중복 안건은 `duplicateKey` 기준으로 묶고 더 강한 후보만 올린다.

### module-3

- `SampleProviderAdapter`가 부처님오신날/스승의날 이벤트와 키워드 수요 스냅샷을 제공한다.
- `MemoryMarketingWorkflowRepository`가 signal, 시즌 키워드 광고안, 안건 후보, 캐릭터 보고, 모아 종합, 결재 요청, 성과 체크포인트를 저장한다.
- `runAgendaCycle`이 샘플 입력을 `Signal -> SeasonalKeywordAdPlan -> AgendaCandidate -> CharacterReport -> MoaSynthesisReport -> ApprovalRequest -> PerformanceCheckpoint`로 변환한다.
- `MockProviderExecutor`는 write gate가 닫힌 상태에서 외부 쓰기를 호출하지 않고 `WRITE_GATE_CLOSED` 차단 결과를 만든다.
- 업무실 view model은 정적 샘플 객체 대신 `runSampleAgendaCycle()` 결과를 읽는다.

### module-4

- 업무실 view model에 `TODAY_APPROVAL`, `SEASONAL_KEYWORD_REVIEW`, `TRACKING_OUTCOME`, `WAITING_EVIDENCE`, `AUTO_HOLD`, `FAILED_EXECUTION` 버킷을 추가했다.
- `InboxBucketBar`가 대표가 먼저 봐야 할 결재함 상태를 버킷별 숫자와 설명으로 보여준다.
- `ApprovalPreviewPanel`이 결재 요청별 변경 전/후, 근거 요약, 위험/신뢰도, rollback, 성과 확인 일정, write gate 경계를 보여준다.
- `부처님오신날 무료 이미지`처럼 제외 후보로 봐야 하는 검색어가 승인 후 추가 키워드에 섞이지 않도록 시즌 키워드 도메인 규칙을 보강했다.
- 승인 가능 안건은 `승인 후 바로 반영` 버튼이 열리고, 근거 보강 안건은 같은 버튼이 비활성화되며 차단 사유를 표시한다.

### module-5

- `OwnerDecision`, `PreflightCheck`, `OutcomeReport`, `FollowUpInternalTask` 도메인 타입을 추가했다.
- `processOwnerDecision`이 대표 결정 이후 `APPROVE_AND_APPLY`, `APPROVE_DRAFT_ONLY`, 수정/근거요청/보류/반려 흐름을 처리한다.
- `APPROVE_AND_APPLY`는 결재 상태, 데이터 신뢰도, rollback, 성과 측정, 2차 확인, write gate를 preflight로 확인한다.
- 실제 provider write gate가 닫혀 있으면 preflight는 통과하되 warning을 남기고, mock executor는 `NEEDS_MANUAL_ACTION`과 `WRITE_GATE_CLOSED`를 기록한다.
- 승인 후 성과 체크포인트, `INCONCLUSIVE` outcome report, 모아 후속 업무를 생성한다.
- `/api/approvals/[id]/decision` route가 샘플 결재 요청에 대표 결정을 적용하고, write gate 닫힘은 423으로 반환한다.
- `/approvals/[id]` 결재 상세 화면에서 결재 미리보기, 대표 결정 후 흐름, 실행 결과, 성과 체크포인트를 함께 보여준다.
- `/operations` 카드에서 결재 상세 화면으로 이동할 수 있게 했다.
- `OwnerDecisionSubmitPanel`이 결재 상세 화면에서 `승인 후 바로 반영`, `초안만 승인`, `수정 요청`, `추가 근거 요청`, `보류`, `반려`를 `/api/approvals/[id]/decision`으로 전송한다.
- 즉시 반영은 UI에서도 차단 사유가 있으면 비활성화하고, API 응답의 `WRITE_GATE_CLOSED`, preflight 차단, 초안 승인 결과를 화면 상태로 표시한다.

### module-6

- `LlmPlannerInput`, `LlmPlannerResult`, `ProviderReadinessReport` 도메인 타입을 추가했다.
- `buildPlannerInputFromApprovals`가 결재 후보를 원천 행 없이 `candidate summary`, `confidence`, `risk`, `evidenceIds`만 포함하는 LLM 입력으로 축약한다.
- `DeterministicLlmPlanner`와 `buildDeterministicPlannerResult`가 실제 LLM 설정 전에도 같은 계약으로 모아 planner preview를 만든다.
- `buildSearchAdReadinessReport`가 네이버 검색광고 공식 인증 구조에 맞춰 `NAVER_SEARCH_AD_ACCESS_LICENSE`(`NAVER_SEARCH_AD_API_KEY` alias 허용), `NAVER_SEARCH_AD_SECRET_KEY`, `NAVER_SEARCH_AD_CUSTOMER_ID` 누락과 `X-Timestamp`, `X-API-KEY`, `X-Customer`, `X-Signature` 요구 헤더를 표시한다.
- `buildDatalabReadinessReport`가 네이버 데이터랩 `Client ID/Secret` 설정과 `ratio`가 절대 검색량이 아닌 상대 비율이라는 주석을 유지한다.
- `buildProviderReadinessReports`가 검색광고, 데이터랩, 스마트스토어, 자체 쇼핑몰, LLM의 읽기 준비상태와 쓰기 차단 상태를 한 번에 반환한다.
- `/api/operations/readiness` route가 readiness와 planner preview를 JSON으로 반환한다.
- `/operations`에 연동 준비상태 카드와 모아 planner preview 패널을 추가했다.
- module-6에서는 설정/계약/화면/API 검증을 먼저 수행했다. 실제 Search Ad/DataLab read-only 호출은 Act iteration 3에서 별도 slice로 열었고, provider write는 계속 차단한다.
- Act iteration 4에서 Playwright smoke를 추가해 결재 상세 화면의 대표 클릭, API 응답 상태 알림, `WRITE_GATE_CLOSED` 차단 표시를 실제 브라우저에서 검증했다.
- Act iteration 5에서 스마트스토어/커머스와 자체 쇼핑몰/영카트 read-only adapter를 추가했다. 네이버 커머스는 token + 주문 조회 aggregate, 영카트는 token-protected bridge aggregate로 동작하며 둘 다 raw row와 token을 저장하지 않는다.

### module-7

- Act iteration 6에서 `완성 대상 모듈/목표`를 모든 iteration 문서에 명시하는 규칙을 반영했다.
- `buildProviderSignalAgendaArtifacts`가 스마트스토어/커머스 aggregate report를 `프로`의 상품/키워드 초안 안건으로 변환한다.
- `buildProviderSignalAgendaArtifacts`가 영카트 aggregate report를 `리피`의 재구매 고객군 CRM 초안 안건으로 변환한다.
- 스마트스토어와 영카트가 모두 synced 상태면 `마루`가 채널 매출 균형 점검 안건을 상신한다.
- `persistProviderSyncReports`가 provider report/signal/snapshot 저장 뒤 provider 기반 `AgendaCandidate`, `CharacterReport`, `ApprovalRequest`, `PerformanceCheckpoint`도 저장한다.
- `/operations`와 `/approvals/:id`가 local workflow repository를 읽어 provider 기반 안건과 결재 상세를 볼 수 있다.
- provider 기반 안건은 내부 초안/검토 작업이며 `requiresWriteGate=false`로 외부 계정에는 쓰지 않는다.

### module-8

- Act iteration 7에서 provider sync 결과와 snapshot/report 근거를 `/operations` 화면에 직접 노출했다.
- `ProviderSyncEvidenceView`가 provider별 최신 report를 `SYNCED/FAILED/SKIPPED`, HTTP 상태, read-only/write 시도 여부, snapshot label, 누락 env, evidence note로 정리한다.
- `ProviderSyncEvidencePanel`이 Search Ad, DataLab, Smartstore, Youngcart의 실제 수집 근거를 대표가 안건 검토 전에 확인할 수 있게 보여준다.

### module-9

- Act iteration 8에서 `buildProductGrowthOpportunities`를 추가해 Search Ad 키워드 수요와 스마트스토어/영카트 집계를 조합했다.
- 키워드 확장은 `그로`, 마케팅 초안은 `카피`, 상품 발굴은 `프로`가 담당한다.
- `ProductGrowthOpportunityPanel`이 상품명, 키워드 후보, 근거 label, 다음 담당자 행동, write gate 차단 경계를 보여준다.
- 후보 생성은 원천 행이 아니라 상위 `KeywordDemandSnapshot`, `CommerceAggregateSnapshot`, `ShopAggregateSnapshot` 요약만 사용한다.

### module-10

- Act iteration 9에서 `buildProviderOutcomeAnalysis`를 추가해 승인 결과의 `OutcomeReport`를 실제 read-only provider snapshot 기준선과 연결했다.
- `OutcomeReport`가 `evidenceIds`, `evidenceLabels`, `sourceReportIds`를 보관해 성과 보고의 근거 trace를 남긴다.
- `processOwnerDecision`이 `providerSyncReports`를 받아 승인된 내부 초안, 검색광고 승인 시도, CRM 초안, 내부 점검안별 관련 provider report를 선택한다.
- `/api/approvals/[id]/decision`은 local workflow repository에 저장된 provider sync report를 outcome 생성에 전달한다.
- `/operations`의 대표 결정 후 흐름은 성과 판단 아래 키워드광고, 데이터랩, 스마트스토어, 자체몰 evidence label을 보여준다.
- 성과 분석은 raw row와 LLM 재분석 없이 aggregate snapshot만 사용한다.

### module-11

- Act iteration 10에서 `ApprovalDetailViewModel`에 `providerSyncEvidence`를 추가했다.
- 결재 제목, 실행기, diff, 근거 요약을 기준으로 상세 화면에 표시할 관련 provider report를 고른다.
- `ProviderSyncEvidencePanel`은 제목/설명/empty message를 받을 수 있게 되어 `/operations`와 `/approvals/[id]`에서 같은 카드 UI를 재사용한다.
- `/approvals/[id]`는 결재 미리보기 아래에 `이 결재의 provider 수집 근거` 패널을 표시한다.
- 상세 화면에서도 동기화 실패 사유, HTTP 상태, 누락 env, snapshot 요약, `쓰기 시도 없음` 경계를 확인할 수 있다.

### module-12

- Act iteration 11에서 `ApprovalDetailViewModel`에 `outcomeHistory`를 추가했다.
- `buildOutcomeHistory`가 저장된 `OutcomeReport`를 결재별로 정렬해 상태, 기준선, 체크포인트, evidence label, source report ID, 후속 업무 제목으로 요약한다.
- `/api/approvals/[id]/outcomes` route가 결재별 저장 성과 보고를 JSON으로 다시 조회한다.
- `/approvals/[id]`는 대표 결정 입력 아래에 `저장된 성과 보고` 패널을 표시한다.
- Playwright smoke가 `승인 후 바로 반영` 클릭 뒤 reload를 수행하고, 저장된 성과 보고 이력이 상세 화면에 다시 표시되는지 확인한다.
- 성과 보고 재조회 역시 read-only다. 저장된 결과를 보여줄 뿐 provider write 재시도나 외부 반영 호출은 만들지 않는다.

## 검증

- `npm test -- --run`: 15개 파일, 53개 테스트 통과.
- `npm run typecheck`: 통과.
- `npm run build`: 통과.
- `npm audit --omit=dev`: 취약점 0개.
- `npm run test:e2e`: chromium smoke 1개 통과.
- `curl -I http://127.0.0.1:3000/operations`: 200 OK.
- `curl` 렌더링 확인: 결재함 버킷, 대표 결재 미리보기, 변경 전/후, rollback, 근거 보강 차단 문구가 HTML에 포함됨.
- `curl http://127.0.0.1:3000/approvals/approval-agenda-season-plan-buddha-gift-card`: 200 OK, 결재 상세/preflight/mock 실행/성과 추적 문구 확인.
- `POST /api/approvals/approval-agenda-season-plan-buddha-gift-card/decision`: write gate 닫힘 상태에서 423, `NEEDS_MANUAL_ACTION`, `WRITE_GATE_CLOSED`, `INCONCLUSIVE` 반환 확인.
- `curl http://127.0.0.1:3000/operations`: 200 OK, `연동 준비상태`, `네이버 키워드광고`, `네이버 데이터랩`, `모아 deterministic planner 요약`, `원천 행 제외` 렌더링 확인.
- `curl http://127.0.0.1:3000/api/operations/readiness`: 200 OK, Search Ad/DataLab 누락 env, required headers, DataLab ratio 주석, planner preview JSON 확인.
- `curl http://127.0.0.1:3000/approvals/approval-agenda-season-plan-buddha-gift-card`: 200 OK, `대표 결정 입력`, `API 연결됨`, `결정 메모`, 6개 결정 버튼 렌더링 확인.
- `POST /api/approvals/approval-agenda-season-plan-buddha-gift-card/decision` with `APPROVE_DRAFT_ONLY`: 200 OK, `draft-only:mock-search-ad-keyword-executor`, `INCONCLUSIVE` outcome 반환 확인.
- `GET http://localhost:3001/api/operations/provider-sync`: 200 OK, Search Ad/DataLab/Smartstore/Youngcart 모두 `SYNCED`.
- `GET http://localhost:3001/operations`: 200 OK, `Provider 동기화 결과`, `실제 수집 근거`, `키워드, 마케팅, 상품 발굴 후보`, `상품 키워드 확장 후보` 렌더링 확인.
- `npm test -- --run tests/application/provider-outcome-analysis.test.ts tests/application/approval-workflow.test.ts tests/application/agenda-room-view-model.test.ts`: 3개 파일, 6개 테스트 통과. `OutcomeReport`가 provider evidence label/source report id를 포함하는 것 확인.
- Browser smoke on `http://127.0.0.1:3001/operations`: decision flow card 2개, outcome evidence list 2개, `최신 read-only provider report`, `스마트스토어 매출`, `키워드광고 수요` 렌더링 확인.
- `npm test -- --run tests/application/approval-detail-view-model.test.ts`: 1개 파일, 3개 테스트 통과. 결재 상세가 관련 provider sync 실패 report와 `SIGNATURE_ERROR`를 포함하는 것 확인.
- Browser smoke on `http://127.0.0.1:3001/approvals/approval-agenda-season-plan-buddha-gift-card`: `이 결재의 provider 수집 근거`, `네이버 키워드광고`, `read-only`, `쓰기 시도 없음` 렌더링 확인.
- `npm test -- --run tests/application/approval-detail-view-model.test.ts tests/api/approval-decision-route.test.ts`: 2개 파일, 8개 테스트 통과. 저장된 `OutcomeReport`가 결재 상세 view model과 outcomes API에서 다시 읽히는 것 확인.
- `npm run test:e2e`: 대표가 `승인 후 바로 반영`을 클릭한 뒤 reload해도 `저장된 성과 보고` 패널과 provider write gate 차단 요약이 상세 화면에 남는 것 확인.

## 아직 하지 않은 것

- 실제 데이터베이스 스키마와 저장소 구현.
- 승인 후 외부 반영 실행기.
- 실제 owner decision/outcome report를 운영 DB에 저장하는 영속화 구현.
- 최종 MVP check 문서와 회귀 검증 리포트.

## 다음 단계

1. `check` 단계에서 Plan/Design/Do 대비 MVP 충족도와 빠진 수직 슬라이스를 점검한다.
2. 실제 DB 스키마/저장소로 옮기기 전 local file repository와 API 계약을 최종 리뷰한다.
3. 실제 provider write는 계속 차단하고, read-only 검증과 대표의 별도 승인 뒤에만 설계한다.
