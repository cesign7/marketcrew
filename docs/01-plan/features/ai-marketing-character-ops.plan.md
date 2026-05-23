# AI Marketing Character Operations Planning Document

> **Summary**: 스마트스토어, 네이버 키워드광고, 자체 쇼핑몰 데이터와 음력/양력 이벤트 캘린더를 함께 읽고 하위 캐릭터들이 먼저 안건을 발굴해 대표 결재를 올리며, 대표가 승인하면 즉시 반영하고 이후 성과까지 보고하는 회사형 AI 마케팅 업무시스템을 만든다. 키워드 광고는 상품 시즌성과 별도로 시즌 키워드 생애주기, 예산/입찰 안전장치, 검색수 캐시를 가진다.
>
> **Project**: marketcrew2
> **Version**: 0.7
> **Author**: Codex
> **Date**: 2026-05-22 KST
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 혼자 광고와 마케팅을 관리하려면 대표가 매일 여러 채널을 직접 확인하고, 문제를 발견하고, 실행 여부까지 판단해야 한다. 특히 설날, 추석, 부처님오신날처럼 음력 기준으로 움직이는 시즌에는 작년 양력 날짜와 단순 비교하면 성과와 기회를 잘못 해석하기 쉽고, 키워드 광고는 시즌 검색량 급등으로 예산을 빠르게 소진할 수 있다. |
| **Solution** | MVP의 첫 루프를 bottom-up 안건 상신으로 잡는다. 하위 캐릭터들이 데이터와 `MarketingCalendar`, `KeywordDemandSnapshot`을 함께 감시해 `AgendaCandidate`, `KeywordOpportunity`, `SeasonalKeywordAdPlan`, `MarketingProposal`, `ProductOpportunity`를 만들고, 모아가 대표 결재용 `ApprovalRequest`와 변경 전/후 미리보기인 `ExecutionPlan`으로 정리한다. |
| **Function/UX Effect** | 첫 화면은 `오늘 올라온 안건`, `명절/기념일 기회`, `결재하면 바로 반영될 작업`, `성과 추적 중`, `추가 근거 대기`를 보여주는 회사형 지휘실이다. 대표는 올라온 자료와 변경 diff만 보고 승인/반려/수정/추가근거 요청을 선택하며, 승인된 작업은 실행 결과와 성과 체크 일정까지 자동으로 기록된다. |
| **Core Value** | AI 직원들이 먼저 문제와 시즌 기회를 발견하고, 상품별 키워드/마케팅/상품 발굴 제안과 시즌 광고 운영안을 올리고, 대표 승인 후 즉시 반영하고, 성과까지 다시 보고하는 운영 시스템을 제공한다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 대표가 먼저 지시하지 않아도 하위 AI 캐릭터들이 데이터 변화와 음력/양력 시즌 이벤트에서 위험/기회를 발견해 안건으로 상신하고, 승인된 변경은 실제 업무 채널에 바로 반영되게 한다. |
| **WHO** | 스마트스토어, 네이버 광고, 자체 쇼핑몰을 함께 운영하며 매일 올라오는 마케팅 안건을 결재해야 하는 대표/마케팅 운영자. |
| **RISK** | 하위 캐릭터가 근거 부족한 안건을 과다 생성하거나, 음력 이벤트 비교 기준을 잘못 잡거나, 시즌 키워드 광고가 예산/입찰 안전장치 없이 실행되거나, 승인 후 외부 채널 반영이 잘못 실행되거나, 성과 측정 없이 자동화만 누적될 수 있다. |
| **SUCCESS** | 샘플 데이터만으로도 음력 이벤트 기준 비교, 상품별 키워드/마케팅/상품 발굴 안건, 시즌 키워드 광고 운영안, 모아 종합, 변경 diff, 대표 승인, 실행 결과, 성과 추적 체크포인트까지 브라우저에서 확인할 수 있다. |
| **SCOPE** | Phase 1은 bottom-up 안건 발굴/이벤트 캘린더/시즌 키워드 광고 계획/결재/실행 미리보기/모의 반영/성과 추적 MVP, Phase 2는 실제 API write executor, Phase 3은 owner command와 고위험 승인 정책으로 확장. |

---

## 1. Overview

### 1.1 Purpose

`marketcrew2`의 첫 제품 골격은 하위 캐릭터가 먼저 안건을 만들어 위로 올리고, 대표 승인 후 실제 업무 채널에 반영하며, 성과까지 다시 보고하는 AI 마케팅 업무시스템이다. 핵심은 대표가 매번 먼저 지시하는 흐름이 아니라, 스마트스토어/검색광고/자체 쇼핑몰 데이터를 맡은 캐릭터들이 스스로 이상 징후와 기회를 발견하고, 근거와 실행안을 붙여 결재 요청으로 보고하는 구조다.

### 1.2 Background

초기 대상 채널은 다음 세 가지다.

- 스마트스토어: 주문, 상품, 매출, 고객 반응, 판매 추세.
- 네이버 키워드광고: 캠페인, 광고그룹, 키워드, 노출/클릭/전환/비용.
- 자체 쇼핑몰: 주문, 재구매, 객단가, 회원/VIP, 상품별 매출.
- 마케팅 캘린더: 설날, 추석, 부처님오신날처럼 음력 기준으로 매년 양력 날짜가 바뀌는 이벤트와 크리스마스/어버이날처럼 양력 고정 이벤트.
- 키워드 수요/시즌 데이터: 네이버 검색광고 키워드 도구, 네이버 데이터랩, 내부 광고 성과, 자체 `MarketingCalendar`를 조합한 시즌 키워드 후보와 검색 수요 스냅샷.

이 세 채널은 한 화면에서 비교되어야 하지만, 첫 MVP의 시작점은 통합 대시보드가 아니다. 시작점은 “하위 캐릭터가 데이터에서 안건을 발견하고 상위 보고자에게 올리며, 대표가 승인하면 정해진 변경안이 반영되는 업무방”이다.

### 1.3 Related Documents

- Requirements: 현재 사용자 요청, `docs/01-plan/features/ai-marketing-character-ops.plan.md`
- Future Design: `docs/02-design/features/ai-marketing-character-ops.design.md`
- Existing placeholder: `design.md`

---

## 2. Scope

### 2.1 In Scope

- [ ] 스마트스토어, 네이버 키워드광고, 자체 쇼핑몰 샘플 데이터를 read-only `Signal`로 수집한다.
- [ ] 설날, 추석, 부처님오신날 등 음력 이벤트와 양력 이벤트를 `MarketingCalendar`로 정규화한다.
- [ ] 하위 캐릭터가 담당 채널/업무영역의 `Signal`을 읽고 `AgendaCandidate`를 생성한다.
- [ ] 상품별로 관련 이벤트, 키워드 후보, 마케팅 제안, 신상품/묶음상품 기회를 생성한다.
- [ ] 예: 선물카드 판매 데이터가 있고 부처님오신날 이벤트 윈도우가 다가오면 `부처님오신날 선물카드`, `사찰 선물`, `감사 선물` 키워드/문구/상품 안건을 만든다.
- [ ] 키워드 광고는 일반 운영 키워드와 시즌 키워드를 분리하고, 시즌 키워드는 탐색/테스트/증액/축소/회고 생애주기를 가진다.
- [ ] 시즌 키워드 광고 안건은 검색수, 경쟁도, 현재 광고 성과, 예산 상한, 입찰가 상한, 재고/마진, 랜딩 준비 상태를 함께 근거로 가져야 한다.
- [ ] 안건 후보는 중요도, 근거 충분성, 중복 여부, 외부 실행 위험으로 triage된다.
- [ ] triage를 통과한 안건만 `CharacterReport`로 상위 보고자 `모아`에게 올라간다.
- [ ] 모아는 여러 하위 보고를 묶어 대표 결재용 `ApprovalRequest`를 만든다.
- [ ] 대표는 승인, 반려, 수정 요청, 보류, 추가 근거 요청 중 하나를 선택할 수 있다.
- [ ] 모든 결재 요청에는 변경 전/후 diff, 실행 대상, 예상 효과, 위험, 되돌리기 가능 여부가 포함된 `ExecutionPlan`이 붙는다.
- [ ] 대표가 승인하면 위험 등급, 권한, write gate, rollback 조건을 통과한 작업은 즉시 외부 채널 또는 내부 시스템에 반영된다.
- [ ] 실행 결과는 `ExecutionResult`로 기록되고, 실패/부분 성공/재시도 필요 상태를 대표와 모아에게 다시 보고한다.
- [ ] 승인된 작업은 `PerformanceCheckpoint`를 생성해 1일/3일/7일/14일/30일 후 성과를 추적한다.
- [ ] 대표 결정과 실행 결과는 다시 하위 캐릭터의 후속 업무 또는 성과 분석 안건으로 내려간다.
- [ ] 게임형 업무 지휘실 UI는 `오늘 올라온 안건`, `캐릭터별 감지 현황`, `보고 라인`, `결재 대기`를 보여준다.
- [ ] LLM 판단은 구조화된 JSON으로 받고, 원본 근거와 모델 정보를 함께 남긴다.
- [ ] MVP의 기본 구현은 mock/sandbox executor로 시작하되, 실제 connector가 준비된 작업은 승인 후 즉시 반영 가능한 계약으로 설계한다.

### 2.2 Out of Scope

- 초기 MVP에서 대표가 먼저 모아에게 업무를 지시하는 top-down command inbox.
- 대표 승인 없는 광고 입찰가 변경, 예산 변경, 쿠폰 발급, 상품 수정, 고객 메시지 발송 자동 실행.
- 변경 diff와 되돌리기 정보가 없는 외부 write 실행.
- Critical 위험 등급 작업의 단일 클릭 즉시 반영.
- 모든 쇼핑몰 솔루션 통합. 자체 쇼핑몰은 우선 하나의 read-only bridge 계약으로 추상화한다.
- 모바일 게임 수준의 복잡한 애니메이션/전투 시스템.
- 사람 결재 없는 완전 자율 마케팅 집행.

### 2.3 Scope Guard and MVP Cutline

현재 플랜은 제품 비전까지 포함하므로 넓다. 구현이 흔들리지 않도록 MVP는 “대표가 오늘 결재할 수 있는 근거 있는 안건”을 만드는 데만 집중한다.

MVP must include:

- `MarketingCalendar` 기반 음력/양력 이벤트 윈도우.
- 하위 캐릭터의 bottom-up 안건 상신.
- 상품/키워드/캠페인/상품발굴 후보의 근거 표시.
- 시즌 키워드 광고 계획의 예산/입찰/중지 조건.
- 모아의 결재 요청과 변경 diff.
- mock/sandbox executor와 성과 체크포인트.

MVP must not include yet:

- 모든 광고 자동 최적화.
- 모든 상품의 실시간 키워드 채굴.
- 대표 직접 지시형 command center.
- 실제 외부 write executor 기본 활성화.
- 복잡한 게임 진행/레벨/보상 시스템.

Rule of thumb:

- 대표가 “이 자료만 보고 승인할 수 있는가?”에 직접 기여하면 MVP에 둔다.
- 단순히 나중에 있으면 좋은 분석, 자동화, 장식이면 후속 slice로 미룬다.

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 시스템은 샘플 또는 실제 read-only 데이터를 공통 `Signal` 형식으로 수집해야 한다. | High | Pending |
| FR-02 | 하위 캐릭터는 담당 데이터에서 위험/기회/이상 징후를 감지해 `AgendaCandidate`를 생성해야 한다. | High | Pending |
| FR-03 | 안건 후보는 중요도, 근거 수, 중복 여부, 외부 실행 위험을 기준으로 triage되어야 한다. | High | Pending |
| FR-04 | 통과한 안건은 하위 캐릭터의 `CharacterReport`로 상위 보고자 모아에게 보고되어야 한다. | High | Pending |
| FR-05 | 모아는 하위 보고를 종합해 대표 결재용 `ApprovalRequest`를 생성해야 한다. | High | Pending |
| FR-06 | 대표는 승인, 반려, 수정 요청, 보류, 추가 근거 요청 중 하나를 선택할 수 있어야 한다. | High | Pending |
| FR-07 | 대표 결정은 후속 내부 업무로 하위 캐릭터에게 다시 내려가야 한다. | High | Pending |
| FR-08 | 각 안건/보고/판단에는 데이터 출처, 수집 시각, LLM 모델, 토큰/비용, 판단 근거가 남아야 한다. | Medium | Pending |
| FR-09 | 게임형 UI는 캐릭터별 감지 상태, 보고 단계, 모아 검토, 대표 결재 대기를 시각적으로 보여줘야 한다. | Medium | Pending |
| FR-10 | API 키가 없어도 샘플 데이터로 bottom-up 안건 상신 루프를 시연할 수 있어야 한다. | High | Pending |
| FR-11 | 모든 결재 요청은 변경 전/후 diff와 승인 시 실행될 작업 목록을 보여줘야 한다. | High | Pending |
| FR-12 | 승인된 안건은 위험 등급/권한/write gate를 통과하면 즉시 `ExecutionResult`까지 생성해야 한다. | High | Pending |
| FR-13 | 실행 실패 또는 부분 성공 시 실패 사유, 재시도 가능 여부, 수동 처리 안내를 보여줘야 한다. | High | Pending |
| FR-14 | 승인/실행된 작업은 성과 측정 계약에 따라 체크포인트와 결과 보고서를 생성해야 한다. | High | Pending |
| FR-15 | 승인 전 자료에는 데이터 신뢰도, 표본 부족, 전년도 데이터 부족, API 실패 여부가 표시되어야 한다. | High | Pending |
| FR-16 | 오늘 꼭 볼 안건, 성과 추적 중, 추가 근거 대기, 자동 보류를 우선순위 inbox로 나눠야 한다. | Medium | Pending |
| FR-17 | 음력 이벤트는 매년 해당 음력 날짜가 매핑된 양력 날짜 기준으로 전년도/올해 성과를 비교해야 한다. | High | Pending |
| FR-18 | 상품별로 이벤트 연관 키워드, 광고 키워드, 문구/콘텐츠, 상품/묶음상품/프로모션 제안을 생성해야 한다. | High | Pending |
| FR-19 | 상품 발굴 안건은 기존 상품, 시즌 이벤트, 검색/광고 성과, 쇼핑몰 판매 데이터를 함께 근거로 가져야 한다. | Medium | Pending |
| FR-20 | 키워드 광고는 일반 운영 키워드와 시즌 키워드를 구분하고 시즌 키워드별 생애주기 상태를 가져야 한다. | High | Pending |
| FR-21 | 시즌 키워드 광고 안건은 예산 상한, 입찰가 상한, 중지 조건, 제외 키워드 후보, 재고/마진 조건을 포함해야 한다. | High | Pending |
| FR-22 | 키워드 수요 조회 결과는 `KeywordDemandSnapshot`으로 캐시하고, LLM에는 상위 후보 요약과 근거 ID만 전달해야 한다. | High | Pending |
| FR-23 | 데이터 연동 화면은 PC/모바일 광고 설정, 시간대 성과, 스마트스토어 순매출/클레임, 데이터랩 세그먼트, 판매 분석 확장을 어떤 순서로 반영할지 보여줘야 한다. | Medium | Pending |
| FR-24 | LLM 캐릭터는 정해진 이상신호 밖의 상품/키워드/기기/시간대/고객군 가설을 자유 탐색할 수 있어야 하며, 확인 전에는 결재가 아니라 근거 요청으로 남겨야 한다. | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Safety | 수집은 read-only가 기본이고, 외부 쓰기는 대표 승인, 위험 등급, provider write gate, rollback snapshot이 모두 있어야 실행된다. | 테스트, 환경값 검증, 코드 리뷰 |
| Traceability | 모든 안건과 AI 판단은 입력 근거, 출력 JSON, 모델명, 실행 상태를 추적 가능해야 한다. | DB 레코드/API 응답/UI 확인 |
| Noise Control | 하위 캐릭터가 너무 많은 안건을 만들지 않도록 중복/빈도/근거 부족 필터가 있어야 한다. | triage 테스트 |
| UX | 대표가 먼저 지시하지 않아도 오늘 올라온 안건과 결재 우선순위를 바로 볼 수 있어야 한다. | 브라우저 시나리오 테스트 |
| Reliability | API 장애나 인증 미설정 시에도 샘플 데이터와 준비 상태 카드로 흐름이 끊기지 않아야 한다. | 어댑터 실패 테스트 |
| Localization | 운영자 화면의 라벨은 한국어를 기본으로 한다. 내부 ID와 provider payload key는 영어 유지. | UI 스냅샷/문구 테스트 |
| Performance | 초기 지휘실 화면은 로컬 샘플 데이터 기준 2초 안에 렌더링된다. | 브라우저 smoke, Lighthouse 또는 Playwright 측정 |
| LLM Cost Control | 원본 일자별 데이터를 LLM에 직접 넣지 않는다. 코드가 집계/비교/필터링한 `SignalSummary`와 상위 후보만 LLM으로 보낸다. | token usage 기록, LLM input snapshot 테스트 |
| Exploration Safety | LLM의 자유 탐색 결과는 `가설`, `확인된 사실`, `필요한 근거`를 분리하고, 데이 검증 전에는 실행 가능한 결재 안건으로 승격하지 않는다. | 인사과 롤모델 테스트, 안건 승격 테스트 |
| Execution Audit | 승인, 실행, 실패, 재시도, 되돌리기, 성과 체크포인트를 모두 감사 로그로 남긴다. | DB 레코드/API 응답/UI 확인 |
| Calendar Accuracy | 음력 이벤트는 날짜명만 저장하지 않고 매년 계산/검증된 양력 날짜와 이벤트 윈도우를 저장한다. | calendar fixture 테스트, 이벤트 윈도우 테스트 |
| Keyword API Cost Control | 키워드 도구/데이터랩 호출은 캐시, rate limit, backoff를 거치며 LLM 호출과 분리된다. | cache hit 테스트, 429 backoff 테스트 |
| Ad Spend Safety | 시즌 키워드 광고 변경은 예산/입찰 상한, 중지 조건, 추적 상태가 없으면 즉시 반영할 수 없다. | preflight 테스트, approval preview 확인 |

### 3.3 Signal Detection Policy

`Signal`은 하루치 원본 데이터가 아니라 기간 비교로 만들어진 관찰값이다. 단, 시즌성 상품이 있으므로 전기간 비교만 사용하지 않고 전년도 같은 기간 비교를 함께 둔다. 특히 설날, 추석, 부처님오신날처럼 음력 기준인 이벤트는 같은 양력 날짜가 아니라 같은 음력 이벤트가 해당 연도에 환산된 양력 날짜를 기준으로 비교한다.

| Signal Type | Default Window | Comparison Baseline | Use Case |
|-------------|----------------|---------------------|----------|
| `daily_spike` | 어제 | 최근 7일 평균, 같은 요일 4주 평균 | 광고비 급증, 주문 급감, API 실패 같은 빠른 운영 이슈 |
| `weekly_trend` | 최근 7일 | 이전 7일 | 광고 성과, 상품 판매, 채널별 매출의 단기 변화 |
| `monthly_trend` | 최근 30일 | 이전 30일 | 재구매/CRM, 상품군 흐름, 큰 캠페인 성과 |
| `seasonal_yoy` | 최근 7일 또는 30일 | 전년도 같은 기간, 가능하면 같은 요일 정렬 | 시즌성 상품, 명절/행사/계절 상품의 정상/비정상 판단 |
| `lunar_event_yoy` | 이벤트 D-45 ~ D+7 기본 | 전년도 같은 음력 이벤트의 D-45 ~ D+7 | 설날, 추석, 부처님오신날처럼 음력일이 기준인 상품/키워드/캠페인 판단 |
| `event_opportunity` | 이벤트 D-60 ~ D+14 | 최근 성과, 전년도 이벤트, 관련 상품군 | 상품별 키워드/마케팅/상품 발굴 안건 생성 |
| `seasonal_keyword_demand` | 이벤트 D-60 ~ D+14 또는 월별 시즌 | 키워드 도구/데이터랩/전년도 광고 성과 | 시즌 키워드 광고 탐색, 테스트, 예산/입찰 조정 후보 생성 |
| `target_gap` | 설정된 운영 기간 | 목표값, 예산, 재고 기준, 마진 기준 | 목표 미달/초과, 예산 소진, 재고 위험 |

MVP 기본값:

- 매일 오전 9시에 전일 데이터까지 집계한다.
- 상품/키워드/고객군별 raw rows는 DB 또는 local cache에 저장하지만 LLM에는 보내지 않는다.
- 코드가 먼저 `current`, `previous`, `yoy`, `lunarEventYoY`, `target` 비교값을 계산한다.
- 변화율 20% 이상, 금액 영향 기준 초과, 2회 이상 반복, 또는 두 개 이상의 지표가 같은 방향일 때만 `AgendaCandidate` 후보로 올린다.
- 시즌성 태그가 있는 상품은 `weekly_trend`보다 `seasonal_yoy`를 우선 적용한다.
- 음력 이벤트 태그가 있는 상품은 `seasonal_yoy`보다 `lunar_event_yoy`를 우선 적용한다.
- 전년도 데이터가 없으면 `seasonal_yoy`와 `lunar_event_yoy`는 `insufficient_history`로 표시하고, 같은 요일 4주 평균을 보조 기준으로 사용한다.
- 이벤트 기회 탐지는 상품명/카테고리/구매 용도/검색어/광고 키워드/매출 데이터를 함께 보고 `event_opportunity`를 생성한다.
- 시즌 키워드 광고 탐지는 키워드 도구, 데이터랩, 내부 광고 성과, 상품 재고/마진을 함께 보고 `seasonal_keyword_demand`를 생성한다.
- LLM은 전체 30일 데이터를 보지 않고, 상위 N개 후보의 요약값과 근거 행 ID만 본다.

Example:

```text
Raw rows:
  30일치 상품별 주문/매출/광고비 데이터

Deterministic signal:
  "A 시즌상품 최근 7일 매출이 전년도 같은 기간 대비 34% 낮고,
   광고비는 전년도 같은 기간 대비 18% 높음"

SignalSummary sent to LLM:
  entity=A 시즌상품
  signalType=seasonal_yoy
  currentSales=1,320,000
  lastYearSales=2,010,000
  deltaYoY=-34.3%
  currentAdSpend=210,000
  lastYearAdSpend=178,000
  evidenceRows=[...ids]
```

Lunar event comparison example:

```text
Event:
  부처님오신날 = 음력 4월 8일

Product:
  선물카드

Deterministic signal:
  "올해 부처님오신날 D-30 ~ D-7 선물카드 매출이
   전년도 부처님오신날 D-30 ~ D-7 대비 18% 낮고,
   관련 검색/광고 키워드 노출 기회가 증가"

Opportunity candidates:
  KeywordOpportunity: "부처님오신날 선물카드", "사찰 선물", "감사 선물"
  MarketingProposal: "부처님오신날 감사 선물 기획전"
  ProductOpportunity: "선물카드 + 메시지 카드 묶음"
```

### 3.4 Product, Keyword, and Campaign Opportunity Policy

상품별 기회 탐지는 기존 성과 이상 감지와 별개로, “앞으로 다가오는 이벤트에 맞춰 무엇을 팔고 어떻게 노출할지”를 안건으로 만든다.

Opportunity types:

| Type | Owner | Output |
|------|-------|--------|
| `KeywordOpportunity` | `gro` | 네이버 키워드광고 신규/확장 키워드, 제외 키워드, 랜딩 연결 제안 |
| `MarketingProposal` | `copy` + `moa` | 광고문구, 배너/상세/콘텐츠 문안, 기획전 메시지 |
| `ProductOpportunity` | `pro` + `maru` | 신상품, 묶음상품, 가격/프로모션, 재고/운영 준비 제안 |
| `SegmentOpportunity` | `ripi` | 이벤트별 고객군, 재구매/선물/휴면 고객 캠페인 제안 |

Inputs:

- 상품명, 카테고리, 태그, 가격, 마진, 재고.
- 스마트스토어/자체몰 매출과 주문 추세.
- 네이버 키워드광고 성과와 검색어/키워드 후보.
- 마케팅 캘린더의 이벤트명, 음력/양력 여부, 이벤트 윈도우.
- 전년도 같은 이벤트 윈도우의 상품/키워드/매출 성과.

Rules:

- LLM은 전체 상품 목록을 보지 않고, deterministic scorer가 뽑은 상위 상품/이벤트 후보만 본다.
- 상품 기회는 최소 하나 이상의 근거를 가져야 한다: 판매 데이터, 광고 데이터, 이벤트 캘린더, 재고/마진 정보, 전년도 성과.
- 새 키워드나 상품 제안은 바로 외부 반영하지 않고 `ExecutionPlan`에 keyword add, campaign draft, product draft 같은 작업 단위로 들어간다.
- `day`는 기회 제안의 근거 부족, 전년도 데이터 부족, 이벤트 날짜 불확실성을 표시한다.

### 3.5 Seasonal Keyword Ad Policy

키워드 광고는 상품 시즌성과 연결되지만 별도 운영 정책을 가진다. 시즌 키워드는 검색량이 짧은 기간에 급등하고 예산 소진 속도가 빠르기 때문에 “새 키워드 제안”이 아니라 “시즌 광고 운영안”으로 결재되어야 한다.

Seasonal keyword lifecycle:

| Stage | Default Timing | Owner | Output |
|-------|----------------|-------|--------|
| `DISCOVER` | D-60 ~ D-45 | `gro` + `pro` | 상품/이벤트 조합별 키워드 후보와 적합도 점수 |
| `VALIDATE` | D-45 ~ D-30 | `day` + `gro` | 검색수, 경쟁도, 전년도 성과, 데이터 신뢰도 |
| `TEST` | D-30 ~ D-14 | `gro` + `copy` | 낮은 예산의 테스트 키워드/광고문구/랜딩 연결 초안 |
| `SCALE` | D-14 ~ D-3 | `gro` + `moa` | 예산/입찰 증액 또는 유지 결재안 |
| `PEAK_GUARD` | D-3 ~ D+1 | `gro` + `day` | 일 예산 소진, CPA/ROAS, 재고/마진 중지 조건 감시 |
| `TAPER` | D+1 ~ D+7 | `gro` | 축소/중지/제외 키워드 반영안 |
| `REVIEW` | D+7 ~ D+14 | `gro` + `moa` | 성과 회고, 내년 시즌 기준값, 후속 상품/콘텐츠 안건 |

Required evidence:

- `KeywordDemandSnapshot`: 키워드 도구의 검색수/경쟁도/CTR류 지표, 조회 시각, 캐시 상태.
- `SearchTrendSnapshot`: 데이터랩 또는 내부 trend source의 기간별 상대 추이. 상대값이므로 절대 검색량으로 오해하지 않는다.
- 기존 광고 성과: 노출, 클릭, CTR, CPC, 전환, CPA, ROAS, 광고비.
- 상품 조건: 재고, 마진, 가격, 배송/제작 리드타임, 랜딩/상세페이지 준비 상태.
- 이벤트 조건: `MarketingCalendar`의 이벤트 윈도우, 음력/양력 여부, 전년도 같은 이벤트 기간.

Approval payload for seasonal keyword ads:

| Field | Required Meaning |
|-------|------------------|
| `keywordSet` | 추가/확장/유지/중지/제외 키워드 목록 |
| `seasonStage` | `DISCOVER`부터 `REVIEW`까지 현재 단계 |
| `eventWindow` | 어떤 이벤트와 D-n 기간에 해당하는지 |
| `dailyBudgetCap` | 일 예산 상한 |
| `bidCap` | 키워드 또는 광고그룹 입찰가 상한 |
| `stopConditions` | CPA, ROAS, 광고비, 재고, 마진 기준 중지 조건 |
| `negativeKeywordCandidates` | 제외 키워드 후보와 근거 |
| `landingReadiness` | 연결 상품/기획전/상세페이지 준비 상태 |
| `measurementPlan` | D-14/D-7/D+3/D+7 등 성과 확인 일정 |

Rules:

- 시즌 키워드 광고는 `dailyBudgetCap`, `bidCap`, `stopConditions` 없이는 `APPROVE_AND_APPLY` 대상이 될 수 없다.
- `KeywordDemandSnapshot`은 캐시를 기본으로 하며, LLM은 원본 키워드 전체 목록이 아니라 상위 후보와 근거 ID만 본다.
- 키워드 도구 호출은 rate limit/backoff를 가진다. 429가 발생하면 해당 안건은 `WAITING_EVIDENCE` 또는 `API_PARTIAL_FAILURE`로 이동한다.
- 공식 시즌 코드에 있는 이벤트는 provider code와 `MarketingCalendar`를 연결한다. 공식 코드에 없는 이벤트, 예: 부처님오신날은 자체 `MarketingCalendar`가 기준이다.
- 제외 키워드 후보는 신규 키워드 후보와 같은 수준의 안건으로 취급한다. 시즌에는 의도 불일치 검색 유입도 늘어나기 때문이다.
- 전환 추적, 주문 매칭, UTM/NaPm 상태가 불확실하면 광고 성과 안건은 `INCONCLUSIVE` 또는 `REQUEST_MORE_EVIDENCE`로 처리한다.

Example:

```text
Product: 선물카드
Event: 부처님오신날
Stage: TEST

Keyword candidates:
  add: "부처님오신날 선물카드", "사찰 선물", "감사 선물"
  negative candidates: "무료 이미지", "문구 예시", "불교 행사 일정"

Approval constraints:
  dailyBudgetCap=30,000 KRW
  bidCap=500 KRW
  stopConditions:
    - CPA > targetCPA * 1.3 for 2 consecutive days
    - ROAS < targetROAS * 0.7
    - stock < 20
```

### 3.6 Approval-to-Execution Contract

대표가 올라온 자료만 보고 승인하면 바로 반영되는 것이 이 제품의 핵심 계약이다. 따라서 `ApprovalRequest`는 단순 보고서가 아니라 실행 가능한 결재 문서여야 한다.

Required fields:

| Field | Meaning |
|-------|---------|
| `why` | 왜 이 변경이 필요한지 |
| `evidenceSummary` | 어떤 시그널과 데이터가 근거인지 |
| `dataConfidence` | 결재해도 될 만큼 근거가 충분한지 |
| `executionPreview` | 승인하면 정확히 무엇이 바뀌는지 |
| `beforeState` | 변경 전 값 |
| `afterState` | 변경 후 값 |
| `expectedImpact` | 예상 효과 |
| `riskLevel` | 실행 위험 등급 |
| `rollbackPlan` | 되돌리기 가능 여부와 방법 |
| `measurementPlan` | 성과를 언제 어떤 지표로 볼지 |
| `executor` | 승인 후 호출될 내부/외부 실행기 |

Approval buttons:

| Action | Effect |
|--------|--------|
| `APPROVE_AND_APPLY` | 승인 후 즉시 실행한다. 단, risk/write gate/rollback 조건을 통과해야 한다. |
| `APPROVE_DRAFT_ONLY` | 초안/내부 작업만 생성하고 외부 채널에는 반영하지 않는다. |
| `REQUEST_REVISION` | 모아와 담당 캐릭터에게 수정 후 재상신을 요청한다. |
| `REQUEST_MORE_EVIDENCE` | 데이 또는 담당 캐릭터에게 추가 근거를 요청한다. |
| `HOLD` | 일정 기간 보류하고 재검토 날짜를 둔다. |
| `REJECT` | 안건을 종료하고 반려 사유를 기록한다. |

Risk levels:

| Level | Example | Execution Rule |
|-------|---------|----------------|
| `LOW` | 내부 할 일 생성, 보고서 보관, 초안 저장 | 승인 즉시 반영 가능 |
| `MEDIUM` | 광고문구 초안, 쿠폰 초안, 캠페인 초안 예약 | 승인 즉시 반영 가능하되 외부 공개/발송 전 상태 표시 |
| `HIGH` | 광고 입찰가, 예산, 상품 가격, 프로모션 조건 변경 | 변경 diff와 rollback snapshot이 있어야 승인 즉시 반영 가능 |
| `CRITICAL` | 큰 예산 증액, 대량 메시지 발송, 대량 가격 변경, 복구 어려운 상품 변경 | 단일 클릭 즉시 반영 금지. 2차 확인 또는 별도 승인 정책 필요 |

Execution state flow:

```text
ApprovalRequest
  -> ExecutionPlan
  -> OwnerDecision(APPROVE_AND_APPLY)
  -> PreflightCheck
  -> ExecutionResult
  -> PerformanceCheckpoint[]
  -> OutcomeReport
  -> FollowUpAgendaCandidate
```

Execution result states:

| State | Meaning |
|-------|---------|
| `APPLIED` | 모든 작업이 정상 반영됨 |
| `PARTIALLY_APPLIED` | 일부 작업만 반영됨. 실패 항목과 재시도 항목을 분리해야 함 |
| `FAILED` | 반영 실패. 외부 상태가 바뀌지 않았거나 rollback 완료 |
| `NEEDS_MANUAL_ACTION` | API 권한/정책/데이터 문제로 사람이 직접 처리해야 함 |
| `ROLLED_BACK` | 반영 후 되돌리기 완료 |

### 3.7 Performance Measurement Contract

승인된 안건은 반드시 성과 측정 계약을 가진다. 성과 분석은 원본 데이터를 LLM에 보내는 방식이 아니라, 코드가 전후 비교를 계산하고 캐릭터가 해석하는 방식으로 처리한다.

| Work Type | Baseline | Checkpoints | Success Metrics |
|-----------|----------|-------------|-----------------|
| Search ad bid/budget | 승인 전 7일, 시즌성/음력 이벤트 있으면 해당 이벤트 윈도우 | 1일, 3일, 7일, 14일 | CPA, ROAS, 전환수, 매출, 광고비 |
| Seasonal keyword ad plan | D-30/D-14 기준선 + 전년도 같은 이벤트 광고 성과 + 키워드 수요 스냅샷 | D-14, D-7, D+3, D+7, D+14 | 신규 키워드별 CTR/CPC/CPA/ROAS, 예산 소진률, 제외 키워드 효과, 재고/마진 영향 |
| Creative/message draft | 승인 전 7일 또는 캠페인 전 기간, 이벤트 캠페인은 D-n 기준 | 3일, 7일, 14일 | CTR, CVR, 매출, 반응률 |
| Product/price/promotion | 승인 전 7일/30일 + 전년도 같은 이벤트 윈도우 | 3일, 7일, 14일, 30일 | 매출, 주문수, 마진, 재고, 환불률 |
| CRM/customer segment | 승인 전 30일 + 전년도 같은 이벤트 윈도우 | 7일, 14일, 30일 | 재구매율, 객단가, 쿠폰 사용, 메시지 반응 |
| Product/keyword discovery | 제안 전 이벤트 윈도우 + 전년도 같은 이벤트 | 이벤트 전 D-30/D-14/D-7, 이벤트 후 D+7 | 신규 키워드 성과, 상품 조회/장바구니/주문, 캠페인 기여 |

Outcome states:

| State | Meaning |
|-------|---------|
| `SUCCESS` | 목표 지표가 개선되고 주요 부작용이 없다. |
| `PARTIAL_SUCCESS` | 핵심 지표 일부는 개선됐지만 다른 지표가 악화됐다. |
| `FAILED` | 목표 미달 또는 위험 지표 악화. 후속 안건 또는 rollback 검토가 필요하다. |
| `INCONCLUSIVE` | 표본 부족, 기간 부족, 시즌성 영향, 데이터 누락으로 판단 보류. |

### 3.8 Data Confidence and Priority Inbox

대표가 올라온 자료만 보고 승인하려면 안건에는 데이터 신뢰도와 우선순위가 명확해야 한다.

Data confidence labels:

| Label | Meaning |
|-------|---------|
| `READY_TO_APPROVE` | 근거 충분, 실행 미리보기와 rollback 정보 있음 |
| `EVIDENCE_WEAK` | 표본 부족, 지표 불충분, 추정 영향 큼 |
| `SEASONAL_CONTEXT_REQUIRED` | 시즌성 판단에 전년도/행사/요일 보정이 더 필요함 |
| `LUNAR_EVENT_CONTEXT_REQUIRED` | 음력 이벤트 날짜 매핑 또는 전년도 음력 이벤트 데이터가 부족함 |
| `KEYWORD_DEMAND_STALE` | 키워드 수요 스냅샷이 오래됐거나 캐시/호출 제한으로 최신성이 부족함 |
| `AD_TRACKING_UNVERIFIED` | 전환 추적, 주문 매칭, UTM/NaPm 상태가 불확실함 |
| `BUDGET_GUARD_MISSING` | 시즌 키워드 광고의 예산/입찰/중지 조건이 부족함 |
| `API_PARTIAL_FAILURE` | 일부 채널 데이터 수집 실패 |
| `INSUFFICIENT_HISTORY` | 전년도 또는 기준 기간 데이터 부족 |

Priority inbox buckets:

| Bucket | Meaning |
|--------|---------|
| `TODAY_APPROVAL` | 오늘 결재해야 하는 고우선 안건 |
| `SEASONAL_KEYWORD_REVIEW` | 이벤트 전후로 확인해야 하는 시즌 키워드 광고 안건 |
| `TRACKING_OUTCOME` | 승인 후 성과 추적 중인 작업 |
| `WAITING_EVIDENCE` | 추가 근거를 기다리는 안건 |
| `AUTO_HOLD` | 중요도/근거 부족으로 자동 보류된 후보 |
| `FAILED_EXECUTION` | 승인됐지만 반영 실패 또는 부분 실패한 작업 |

### 3.9 공급자 판단 근거 확장 순서

API로 더 가져올 수 있는 모든 항목을 한 번에 LLM 판단에 넣지 않는다. 먼저 결재 품질을 크게 올리는 근거부터 코드가 수집/요약하고, LLM은 그 요약과 근거 ID만 읽는다.

| 순서 | 모듈 목표 | 공급자 | 추가할 근거 | 판단 영향 |
|------|-----------|--------|---------------|-----------|
| 1 | 광고그룹 실제 설정 | 네이버 키워드광고 | PC/모바일 집행 여부, 기기별 입찰 가중치, 일예산, 기본 입찰가, ON/OFF 상태, 요일/시간/지역/연령/성별 타겟 | 검색 수요가 있는데 광고가 꺼져 있거나 모바일만 비싸게 태우는 문제를 먼저 잡는다. |
| 2 | 기기·시간대·요일 성과 | 네이버 키워드광고 | PC/모바일별 노출·클릭·광고비, 시간대별 성과, 요일별 성과, 구매 전환수/전환액, 광고수익률 | 입찰 조정, 시간대 제외, 예산 배분 안건의 근거를 만든다. |
| 3 | 스마트스토어 순매출과 클레임 | 스마트스토어(스티커씨) | 상품/옵션별 주문수, 할인액/배송비 반영 순매출 후보, 취소/반품/교환, 구매확정일, 상품 코드 매핑 | 광고 성과가 주문 품질과 실제 매출로 이어지는지 판단한다. |
| 4 | 데이터랩 세그먼트 | 네이버 데이터랩 | 성별, 연령, 기기, 기간 단위별 상대 검색 추이 | 시즌 키워드가 어느 고객군에서 움직이는지 보조 근거로 쓴다. |
| 5 | 스마트스토어 데이터솔루션 | 네이버 커머스 API | 판매 분석, 고객 분석, 결제 고객, 유입/전환 분석 가능 범위 | API 권한이 열리는 경우 상품 발굴과 채널별 수요 판단을 확장한다. |

이 순서는 `/data` 화면에도 그대로 보여준다. 단, 실제 수집 구현은 각 항목의 공식 API 권한, 조회 가능 기간, 호출 제한, 개인정보 저장 금지 조건을 통과한 뒤 별도 iteration으로 진행한다.

### 3.10 자유 탐색과 근거 요청 정책

정해진 `Signal` 기준은 누락을 막기 위한 기본 안전망이다. LLM 캐릭터의 역할은 여기서 멈추지 않고, 대표가 미처 생각하지 못한 상품/키워드/기기/시간대/고객군 조합을 가설로 제안하는 데 있다. 다만 가설은 곧바로 결재 안건이 아니며, 실제 원천 필드와 집계 근거가 확인될 때만 모아가 대표 결재 안건으로 승격한다.

| 단계 | 책임 | 처리 기준 |
|------|------|-----------|
| 정형 감지 | deterministic engine + 담당 캐릭터 | 기존 신호 기준으로 기본 위험과 기회를 놓치지 않는다. |
| 자유 탐색 | 담당 캐릭터 | 정해진 기준 밖의 조합, 낯선 시즌성, 숨은 고객 동기, 예상 못 한 손익 위험을 `Hypothesis`로 제안한다. |
| 근거 요청 | 담당 캐릭터 + 데이 | 확정 판단에 필요한 원천 필드, 비교 기간, 세그먼트, 광고 설정, 시간대/기기 근거를 요청한다. |
| 검증 후 안건화 | 데이 + 모아 | 실제 데이터로 확인된 가설만 `AgendaCandidate`와 `ApprovalRequest`로 승격한다. |

운영 원칙:

- 없는 데이터를 근거처럼 말하지 않는다.
- 가설과 확인된 사실을 화면과 저장 데이터에서 분리한다.
- 확인 전에는 외부 광고/상품/CRM에 반영하지 않는다.
- 자유 탐색 결과가 반복적으로 반려되면 캐릭터별 월간 평가에서 탐색 범위를 조정한다.

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `/operations` 또는 첫 화면에 `오늘 올라온 안건` 중심의 업무 지휘실이 있다.
- [ ] 샘플 데이터가 스마트스토어/네이버 키워드광고/자체 쇼핑몰 `Signal`로 수집된다.
- [ ] 각 하위 캐릭터가 최소 한 개 이상의 안건 후보를 생성하거나 “안건 없음” 판단을 남긴다.
- [ ] 안건 후보가 triage를 통과하거나 탈락한 이유가 기록된다.
- [ ] 통과한 안건은 캐릭터 보고서와 모아 종합 보고서로 UI에서 구분되어 보인다.
- [ ] 대표 결재 요청에는 변경 전/후 diff, 실행 작업 목록, 위험 등급, 되돌리기 가능 여부가 포함된다.
- [ ] 대표는 `승인 후 바로 반영`, `초안만 승인`, `반려`, `수정 요청`, `보류`, `추가 근거 요청`을 선택할 수 있다.
- [ ] 승인 후 바로 반영을 선택하면 preflight를 통과한 작업이 executor를 통해 실행되고 `ExecutionResult`가 기록된다.
- [ ] 승인된 작업은 성과 체크포인트와 결과 보고서로 이어진다.
- [ ] 대표 결정, 실행 결과, 성과 분석이 하위 캐릭터 후속 업무로 기록된다.
- [ ] 시즌 키워드 광고 안건은 생애주기 단계, 예산/입찰 상한, 중지 조건, 제외 키워드 후보를 포함한다.
- [ ] 키워드 수요 조회 결과는 캐시와 조회 시각을 포함한 `KeywordDemandSnapshot`으로 기록된다.
- [ ] 승인 없는 외부 쓰기는 차단되고, 승인된 외부 쓰기는 실행 로그와 rollback snapshot을 남긴다.
- [ ] 최소 단위 테스트와 브라우저 smoke 테스트가 통과한다.

### 4.2 Quality Criteria

- [ ] TypeScript strict 기준으로 핵심 도메인 타입이 정의된다.
- [ ] LLM 출력은 스키마 검증을 통과하지 않으면 안건/보고로 승격하지 않는다.
- [ ] 데이터 어댑터 실패가 전체 화면을 깨뜨리지 않고 준비 상태/오류 상태로 표시된다.
- [ ] 운영자 화면 주요 문구는 한국어다.
- [ ] 캐릭터 역할 추가가 UI 전체를 수정하지 않고 설정/프로필 확장으로 가능하다.
- [ ] 안건 생성은 재현 가능한 deterministic fallback을 가져야 한다.
- [ ] 실행 가능한 결재 요청은 preflight, write gate, rollback snapshot 검증을 통과해야 한다.
- [ ] 성과 분석은 baseline, checkpoint, outcome state를 포함해야 한다.

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 하위 캐릭터가 사소하거나 중복된 안건을 과다 생성할 수 있음 | High | High | `AgendaTriage`에서 중요도, 중복 키, 최근 생성 빈도, evidence count, 대표 결재 필요성을 필수 점검한다. |
| 네이버 키워드광고 API 인증/서명/권한 정책을 잘못 이해할 수 있음 | High | Medium | 구현 전 공식 문서와 공식 샘플로 endpoint, signature, headers, rate limit, read/write scope를 확인한다. 초기 구현은 read-only만 허용한다. |
| 스마트스토어/커머스 API 권한 승인 전 개발이 막힐 수 있음 | Medium | High | 샘플 데이터 어댑터와 readiness status를 먼저 구현하고 실제 API는 준비 상태가 충족될 때 연결한다. |
| 자체 쇼핑몰 DB 직접 접근이 어렵거나 위험할 수 있음 | High | Medium | 직접 DB 연결보다 token-protected read-only bridge 또는 export endpoint를 우선 고려한다. PII 최소화 필드를 계약에 포함한다. |
| LLM이 근거 부족한 판단을 그럴듯하게 생성할 수 있음 | High | Medium | 구조화 출력, evidence count, confidence, missing data list를 필수화하고 근거 없는 결론은 결재 요청이 아니라 추가 근거 요청으로 보낸다. |
| 시즌성 상품을 단기 전기간 비교만으로 오판할 수 있음 | High | High | 상품/카테고리에 seasonality tag를 두고 `seasonal_yoy` 비교를 우선한다. 전년도 데이터가 없으면 안건이 아니라 관찰/추가근거 요청으로 보낸다. |
| 30일 이상 데이터를 LLM에 직접 넣어 비용이 커질 수 있음 | High | High | raw daily rows는 deterministic pipeline에서 집계하고, LLM에는 `SignalSummary`, 상위 후보, 근거 row ID만 전달한다. |
| 음력 명절을 양력 날짜 기준으로 잘못 비교할 수 있음 | High | High | `MarketingCalendar`에 lunar/solar event type, lunar month/day, yearly solar date, event window를 저장하고 `lunar_event_yoy` 비교를 우선한다. |
| 상품/키워드 제안이 근거 없는 아이디어 나열로 흐를 수 있음 | Medium | High | `KeywordOpportunity`, `MarketingProposal`, `ProductOpportunity`는 판매/광고/이벤트/재고/마진 중 최소 하나 이상의 구조화 근거와 confidence label을 요구한다. |
| 시즌 키워드 광고가 검색량 급등기에 예산을 과소/과대 소진할 수 있음 | High | High | `SeasonalKeywordAdPlan`에 `dailyBudgetCap`, `bidCap`, `stopConditions`, `negativeKeywordCandidates`, `landingReadiness`를 필수화한다. |
| 키워드 도구/API 호출 제한으로 후보 생성이 불안정할 수 있음 | Medium | High | `KeywordDemandSnapshot` 캐시, rate limit, backoff, 429 처리, stale label을 둔다. 최신 데이터가 없으면 결재가 아니라 추가 근거 대기로 보낸다. |
| 데이터랩 상대 지표를 절대 검색량처럼 오해할 수 있음 | Medium | Medium | 데이터랩은 `SearchTrendSnapshot` 보조 근거로만 쓰고, 절대 수요는 키워드 도구/내부 광고 성과와 구분해 표시한다. |
| 광고 전환 추적이 깨진 상태에서 성과를 잘못 판단할 수 있음 | High | Medium | 전환 스크립트/주문 매칭/UTM/NaPm 상태를 preflight와 outcome 분석에 포함하고 미검증이면 `AD_TRACKING_UNVERIFIED`로 보류한다. |
| 승인 후 즉시 반영이 잘못된 외부 변경으로 이어질 수 있음 | High | Medium | `ExecutionPlan`, 변경 diff, risk level, preflight, provider write gate, rollback snapshot을 필수화한다. Critical 작업은 단일 클릭 즉시 반영을 금지한다. |
| 승인은 됐지만 API 오류로 일부만 반영될 수 있음 | High | Medium | `ExecutionResult`를 `APPLIED`, `PARTIALLY_APPLIED`, `FAILED`, `NEEDS_MANUAL_ACTION`, `ROLLED_BACK`으로 기록하고 재시도/수동 처리 경로를 제공한다. |
| 성과 측정 없이 자동 실행만 누적될 수 있음 | High | Medium | 모든 승인 작업은 `PerformanceCheckpoint`와 `OutcomeReport`를 생성하고 성공/부분성공/실패/판단보류를 보고한다. |
| 게임형 UI가 장식으로 흐르고 업무 속도를 해칠 수 있음 | Medium | Medium | 첫 화면은 캐릭터화하되 핵심 조작은 안건, 보고서, 결재, 타임라인에 집중한다. |
| 대표 결재와 외부 실행 사이 경계가 모호해질 수 있음 | High | Medium | 결재 버튼을 `APPROVE_AND_APPLY`와 `APPROVE_DRAFT_ONLY`로 분리하고, 승인 전 실행 대상과 반영 범위를 명확히 보여준다. |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `Character` / `AgentProfile` | Domain Model | 캐릭터 역할, 상하 보고 관계, 담당 채널/능력을 정의한다. |
| `Signal` | Data Contract | 스마트스토어/광고/쇼핑몰 데이터를 공통 분석 입력으로 정규화한다. |
| `MarketingCalendar` | Data Contract | 양력/음력 이벤트, 이벤트 윈도우, 연도별 양력 환산 날짜를 저장한다. |
| `KeywordDemandSnapshot` | Data Contract | 키워드 도구/검색 수요 조회 결과, 캐시 상태, 조회 시각, rate limit 상태를 저장한다. |
| `SearchTrendSnapshot` | Data Contract | 데이터랩 또는 내부 trend source의 기간별 상대 추이 데이터를 저장한다. |
| `AgendaCandidate` | Domain Model | 하위 캐릭터가 데이터에서 발굴한 초기 안건 후보. |
| `KeywordOpportunity` | Domain Model | 상품/이벤트 기반 신규/확장/제외 키워드 제안. |
| `SeasonalKeywordAdPlan` | Domain Model | 시즌 키워드 광고의 생애주기 단계, 예산/입찰 상한, 중지 조건, 제외 키워드 후보를 가진 실행 계획. |
| `MarketingProposal` | Domain Model | 이벤트/상품/고객군 기반 캠페인 문구, 배너, 기획전 제안. |
| `ProductOpportunity` | Domain Model | 시즌/이벤트/성과 기반 신상품, 묶음상품, 프로모션 발굴 제안. |
| `AgendaTriage` | Domain Service | 안건 후보의 중요도, 중복, 근거 충분성, 결재 필요성을 판정한다. |
| `CharacterReport` | Domain Model | 담당 캐릭터가 상위 보고자에게 제출한 근거 기반 보고. |
| `MoaSynthesisReport` | Domain Model | 모아가 하위 보고를 종합한 대표 결재 전 보고. |
| `ApprovalRequest` | Domain Model | 모아가 대표에게 올리는 결재 요청. |
| `ExecutionPlan` | Domain Model | 대표가 승인하면 실행될 변경 diff, 위험 등급, preflight, rollback 계획. |
| `OwnerDecision` | Domain Model | 대표의 승인/반려/수정/보류/추가근거 요청 결정. |
| `ExecutionResult` | Domain Model | 승인 후 즉시 반영 시도 결과와 실패/부분성공/재시도 정보. |
| `RollbackSnapshot` | Domain Model | 변경 전 상태와 되돌리기 가능 정보. |
| `PerformanceCheckpoint` | Domain Model | 승인된 작업의 1일/3일/7일/14일/30일 성과 확인 일정. |
| `OutcomeReport` | Domain Model | 실행 후 성과 분석 결과와 후속 안건 생성 여부. |
| `FollowUpInternalTask` | Domain Model | 대표 결정 이후 하위 캐릭터에게 내려가는 내부 후속 업무. |
| `ProviderAdapter` | Integration Interface | 외부 채널의 read-only 수집 계약을 정의한다. |
| `ProviderExecutor` | Integration Interface | 승인된 write 작업을 외부 채널 또는 내부 시스템에 반영하는 실행 계약. |
| Operations Room UI | Frontend Route | bottom-up 안건 상신형 캐릭터 업무 지휘실을 제공한다. |

### 6.2 Current Consumers

현재 `marketcrew2` 저장소는 초기 상태이며 기존 코드 소비자는 없다. 단, 앞으로 다음 소비자를 기준으로 영향 분석을 유지한다.

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `Signal` | CREATE/READ | provider adapters, signal collector | 신규 구현 |
| `MarketingCalendar` | CREATE/READ | event calendar provider, signal engine, opportunity scorer | 신규 구현 |
| `KeywordDemandSnapshot` | CREATE/READ | search-ad keyword demand collector, seasonal keyword scorer | 신규 구현 |
| `SearchTrendSnapshot` | CREATE/READ | datalab trend collector, seasonal keyword scorer | 신규 구현 |
| `AgendaCandidate` | CREATE/READ | character watchers, agenda triage | 신규 구현 |
| `KeywordOpportunity` | CREATE/READ | gro keyword scout, approval preview | 신규 구현 |
| `SeasonalKeywordAdPlan` | CREATE/READ | gro seasonal keyword planner, approval preview, preflight | 신규 구현 |
| `MarketingProposal` | CREATE/READ | copy campaign scout, Moa synthesis | 신규 구현 |
| `ProductOpportunity` | CREATE/READ | pro/maru product scout, approval preview | 신규 구현 |
| `AgendaTriage` | READ/EVALUATE | agenda workflow engine, tests | 신규 구현 |
| `CharacterReport` | CREATE/READ | specialist character runners, report UI | 신규 구현 |
| `MoaSynthesisReport` | CREATE/READ | Moa review engine, operations UI | 신규 구현 |
| `ApprovalRequest` | CREATE/READ/UPDATE | approvals UI, owner decision action | 신규 구현 |
| `ExecutionPlan` | CREATE/READ | Moa review engine, approval preview UI, preflight | 신규 구현 |
| `OwnerDecision` | CREATE/READ | approval actions, follow-up planner | 신규 구현 |
| `ExecutionResult` | CREATE/READ | provider executors, execution status UI | 신규 구현 |
| `RollbackSnapshot` | CREATE/READ | preflight, executor, rollback UI | 신규 구현 |
| `PerformanceCheckpoint` | CREATE/READ/UPDATE | outcome tracker, character reports | 신규 구현 |
| `OutcomeReport` | CREATE/READ | performance analyzer, operations UI | 신규 구현 |
| `FollowUpInternalTask` | CREATE/READ | downward dispatch UI, character task queue | 신규 구현 |
| `ProviderAdapter` | READ | smartstore/search-ad/shop adapters | 신규 구현 |
| `ProviderExecutor` | WRITE | approved search-ad/smartstore/shop/crm executors | 신규 구현 |

### 6.3 Verification

- [ ] 모든 도메인 모델이 최소 한 개의 생성/조회 테스트를 가진다.
- [ ] bottom-up 안건 상신 루프는 샘플 데이터로 end-to-end 테스트한다.
- [ ] 안건 후보 triage의 통과/탈락 사유를 테스트한다.
- [ ] 설날/추석/부처님오신날 같은 음력 이벤트가 연도별 양력 날짜로 환산되고 같은 음력 이벤트 윈도우로 비교되는지 테스트한다.
- [ ] 상품 기반 키워드/마케팅/상품 발굴 후보가 근거 없이 생성되지 않는지 테스트한다.
- [ ] 시즌 키워드 광고 계획이 예산/입찰/중지 조건 없이 즉시 실행될 수 없는지 테스트한다.
- [ ] 키워드 수요 캐시, stale 상태, 429 backoff 처리, 데이터랩 상대 지표 표시를 테스트한다.
- [ ] 전환 추적/주문 매칭/UTM/NaPm 미검증 상태에서는 광고 성과 결론이 보류되는지 테스트한다.
- [ ] 승인 전 변경 diff와 risk level이 없는 안건은 실행 불가인지 테스트한다.
- [ ] 승인 후 즉시 반영 success/partial/fail 상태를 mock executor로 테스트한다.
- [ ] 성과 체크포인트 생성과 outcome state 계산을 테스트한다.
- [ ] 어댑터 인증 미설정 상태에서 UI가 실패하지 않는지 확인한다.
- [ ] 승인 없는 외부 write 함수가 호출 불가능한지 확인한다.

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure (`components/`, `lib/`, `types/`) | Static demos, landing pages | ☐ |
| **Dynamic** | Feature-based modules, backend/API integration, DB-backed workflow | Fullstack MVP, AI operations room | ☑ |
| **Enterprise** | Strict layer separation, DI, microservices | Multi-tenant high-scale platform after MVP | ☐ |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js / React / Vue | Next.js + TypeScript | 서버 액션/API, React UI, 빠른 MVP 구현에 적합하다. |
| State Management | React state / Zustand / Redux | React server data + local state | 초기에는 서버 상태 중심이며 클라이언트 전역 상태를 최소화한다. |
| API Client | fetch / axios / react-query | fetch/server actions | Next.js 기본 패턴으로 단순하게 시작한다. |
| Form Handling | react-hook-form / native | native first | 대표 결재 입력은 초기 폼이 단순하다. |
| Styling | Tailwind / CSS Modules | Tailwind 또는 CSS Modules | 실제 scaffold 시 선택하되, 게임형 UI라도 업무 화면의 밀도와 가독성을 우선한다. |
| Testing | Vitest / Playwright | Vitest + Playwright | 도메인 루프는 단위 테스트, 화면 흐름은 브라우저 smoke로 검증한다. |
| Backend | Serverless / Custom Server / BaaS | Next.js server + Postgres/Prisma 후보 | 안건, 보고, 결재, 감사 로그, LLM 실행 기록을 저장해야 한다. |
| LLM Provider | OpenAI / Gemini / pluggable | Pluggable `LlmPlanner` | 모델 교체와 비용/실패 대응을 위해 provider 경계를 둔다. |

### 7.3 Clean Architecture Approach

Selected Level: Dynamic

```text
src/
  app/
    operations/
    approvals/
  features/
    agenda-room/
    approvals/
    execution/
    outcomes/
  lib/
    domain/
      characters/
      agenda/
      approvals/
      execution/
      opportunities/
      outcomes/
      workflow/
      signals/
    integrations/
      calendar/
      smartstore/
      search-ad/
      datalab/
      shop/
      executors/
    llm/
    persistence/
  components/
    character-room/
    agenda/
    approval/
    execution/
    opportunity/
    outcome/
  tests/
```

Core runtime flow:

```text
SignalCollector(read-only adapters)
  + MarketingCalendar
  + KeywordDemandSnapshot
  -> CharacterWatcher[]
  -> AgendaCandidate[]
  -> OpportunityCandidate[]
  -> SeasonalKeywordAdPlan[]
  -> AgendaTriage
  -> CharacterReport[]
  -> MoaSynthesisReport
  -> ApprovalRequest
  -> ExecutionPlan
  -> OwnerDecision
  -> PreflightCheck
  -> ProviderExecutor
  -> ExecutionResult
  -> PerformanceCheckpoint[]
  -> OutcomeReport
  -> FollowUpInternalTask[]
```

Deferred top-down flow:

```text
OwnerCommand
  -> MoaCommandPlanner
  -> CharacterAssignment[]
```

The top-down command flow remains a later extension. It must not drive Slice 1.

Initial character map:

| Character | Korean Role | Role Model | Primary Responsibility | Agenda Creation Criteria | Not Responsible For |
|-----------|-------------|------------|------------------------|--------------------------|---------------------|
| `moa` | 모아 | 대표 비서실장형 AI 업무실장 | 하위 보고 검토, 자유 탐색 가설 정리, 안건 묶음, 대표 결재 요청, 후속 업무 배분 | 여러 캐릭터 보고가 같은 문제를 가리키거나 검증된 근거가 대표 결재에 충분할 때 `ApprovalRequest`로 승격한다. | 검증 전 가설을 결재 안건으로 승격하지 않는다. 하위 보고 없는 결재 요청을 만들지 않는다. |
| `gro` | 그로 | 광고 성과 분석가형 성장 담당자 | 네이버 키워드광고 성과 하락, 성장 기회, 예산 낭비, 상품별 키워드 기회, 기기/시간대 조합 가설, 시즌 키워드 광고 생애주기 안건 발굴 | 캠페인/광고그룹/키워드 단위 지표가 기준선을 벗어나거나 정해진 지표 밖의 키워드·기기·시간대 조합에 새 기회가 있을 때 근거를 요청하고 안건을 만든다. | 승인 전에는 광고 입찰가, 예산, 키워드를 직접 변경하지 않는다. 승인 후에는 executor와 write gate를 통해서만 반영한다. |
| `maru` | 마루 | 손익 관리자형 비용 감시자 | 광고비, 할인, 마진, 실행 비용, 기회비용의 예상 못 한 위험 발굴 | 비용은 늘지만 매출/마진 근거가 약하거나, 가설 실행 시 손익 악화 가능성이 있으면 중단 기준과 추가 근거를 요구한다. | 상품 구색과 고객 메시지를 최종 판단하지 않는다. 확인 전 지출 확대를 승인하지 않는다. |
| `day` | 데이 | 데이터 감사 담당자형 근거 검증자 | 데이터 정합성, 이상치, 근거 후보 검증, 모든 안건의 신뢰도 보조 평가 | LLM이 제안한 근거 후보를 실제 원천 필드와 집계 기준으로 검증하고, 데이터 누락/표본 부족/비교 기간 오류가 있으면 근거 요청으로 돌린다. | 사업 액션을 직접 추천하지 않는다. 안건 승인권자가 아니라 검증자다. |
| `copy` | 카피 | 콘텐츠 전략가형 문구 실험 담당자 | 광고문구, 상품 메시지, 상세페이지/콘텐츠 개선, 이벤트 캠페인 초안, 숨은 구매 이유 가설 생성 | 성과가 낮은 키워드/상품/고객군에 대해 문구 개선 여지가 있거나 고객 언어/구매 이유 가설이 있으면 초안과 확인할 근거를 함께 올린다. | 매체 예산이나 상품 가격을 판단하지 않는다. 카피는 실행 초안이며 발송/게시 전 결재가 필요하다. |
| `ripi` | 리피 | 고객 관리 담당자형 재구매 탐색자 | 재구매, 휴면 고객, VIP, 고객군 변화, 이벤트별 고객군 안건과 이탈 조짐 발굴 | 재구매율 하락, VIP 반응 변화, 휴면 고객 증가, 특정 세그먼트 매출 변화, 이벤트 선물 수요가 감지되면 개인정보 없이 집계 근거를 요청한다. | 신규 유입 광고 최적화나 상품 마진 판단을 맡지 않는다. 메시지/쿠폰 발송은 승인, 세그먼트 diff, 발송 수량, rollback/중지 조건이 있어야만 executor로 넘긴다. |
| `pro` | 프로 | 상품 기획자형 시즌 발굴 담당자 | 상품, 가격, 마진, 프로모션, 신상품/묶음상품, 상품·시즌·채널 조합 가설 발굴 | 판매량은 좋지만 마진이 낮거나, 가격/할인/묶음상품/프로모션 조정 여지가 있거나 이벤트에 맞는 상품 발굴 기회가 있을 때 필요한 근거를 요청한다. | 채널 운영 장애나 CRM 세그먼트 운영을 맡지 않는다. 가격/프로모션 변경은 승인, 마진 검증, rollback snapshot이 있어야만 executor로 넘긴다. |

표시명, 문서명, 코드 내부 키는 `모아` / `moa` 기준으로 통일한다. 모아 관련 실행 타입은 `moa_planner`, 도메인 타입은 `MoaSynthesisReport`를 사용한다.

Execution and outcome responsibilities:

| Character | Execution Role | Outcome Role |
|-----------|----------------|--------------|
| `moa` | 승인된 `ExecutionPlan`을 preflight에 넘기고 실행 결과를 대표에게 요약한다. | 하위 캐릭터 성과 보고를 묶어 성공/부분성공/실패/판단보류 결론을 낸다. |
| `gro` | 승인된 검색광고 변경의 실행값과 제한 조건을 검토한다. | CPA, ROAS, 전환수, 광고비 변화의 성과 보고를 올린다. |
| `maru` | 승인된 쇼핑몰 운영 변경의 대상 상품/채널을 검토한다. | 주문, 매출, 재고, 운영 이슈 변화의 성과 보고를 올린다. |
| `day` | preflight, data confidence, rollback snapshot 존재 여부를 검수한다. | 성과 분석의 표본 부족, 시즌성, API 실패 여부를 검수한다. |
| `copy` | 승인된 문구/콘텐츠 초안의 반영 또는 예약 상태를 확인한다. | CTR, CVR, 메시지 반응 변화의 성과 보고를 올린다. |
| `ripi` | 승인된 CRM 초안/세그먼트 작업의 실행 조건을 확인한다. | 재구매율, 고객군 반응, 쿠폰 사용 변화의 성과 보고를 올린다. |
| `pro` | 승인된 가격/프로모션 변경의 마진/되돌리기 조건을 확인한다. | 매출, 마진, 재고, 할인 효과의 성과 보고를 올린다. |

Opportunity example:

```text
Product: 선물카드
Event: 부처님오신날(음력 4월 8일)

gro -> KeywordOpportunity:
  "부처님오신날 선물카드", "사찰 선물", "감사 선물"

copy -> MarketingProposal:
  "마음을 전하는 부처님오신날 감사 선물카드"

pro + maru -> ProductOpportunity:
  "선물카드 + 메시지 카드 묶음", 이벤트 전 D-21 노출 준비

ripi -> SegmentOpportunity:
  전년도 명절/기념일 선물 구매 고객, VIP, 법인/단체 구매 후보
```

External role model benchmarks:

| Reference Product | What to Borrow | Character Impact |
|-------------------|----------------|------------------|
| Shopify Sidekick | Store-context assistant that can analyze, create, and prepare changes for merchant review. | `moa`는 승인 전에는 대표 검토 가능한 변경안/결재 요청으로 정리하고, 승인 후에는 preflight와 executor 상태를 대표에게 보고한다. `maru`는 store operations signal을 읽는 캐릭터로 둔다. |
| Triple Whale Moby | Ecommerce-specific AI operator that connects multiple commerce/advertising data sources into actionable recommendations. | `moa`, `gro`, `maru`, `pro`는 채널별 숫자를 따로 보지 않고 cross-channel 안건으로 묶을 수 있어야 한다. |
| Northbeam | Attribution and marketing measurement across touchpoints. | `gro`는 단순 클릭/비용 감시가 아니라 어떤 광고 접점이 매출에 기여했는지 보는 성과 분석가로 둔다. `day`는 측정 신뢰도 검증을 맡는다. |
| Klaviyo K:AI | Campaign/flow creation, customer agent, personalization, and predictive/generative CRM features. | `ripi`는 재구매/세그먼트/개인화 안건을 만들고, `copy`는 캠페인 메시지 초안을 만든다. |
| HubSpot Breeze | Assistant, agents, and data enrichment for go-to-market workflows. | 캐릭터는 고정된 메뉴가 아니라 업무별 agent profile로 확장 가능해야 한다. |
| Optimizely Opal | Marketing agent orchestration with access controls, permissions, observability, and audit trails. | `moa`는 상위 orchestrator, `day`는 audit/evidence 품질 보증 역할로 둔다. |

Decision: keep the visible character count at 7 for MVP. Add modes/skills under each character instead of adding more visible characters until a repeated agenda type cannot be owned cleanly by the current seven.

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [ ] `CLAUDE.md` has coding conventions section
- [ ] `docs/01-plan/conventions.md` exists
- [ ] `CONVENTIONS.md` exists at project root
- [ ] ESLint configuration
- [ ] Prettier configuration
- [ ] TypeScript configuration

현재 저장소는 초기 상태이므로 scaffold 시 위 항목을 함께 만든다.

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | Missing | 내부 ID는 영어 소문자, UI 라벨은 한국어 | High |
| **Folder structure** | Missing | Dynamic feature/domain/integration 구조 | High |
| **Import order** | Missing | framework -> external -> internal -> relative | Medium |
| **Environment variables** | Missing | LLM, DB, provider readiness/write gate env | High |
| **Error handling** | Missing | provider failure -> readiness/report card, no silent fail | High |
| **Agenda noise policy** | Missing | duplicate key, cooldown, evidence threshold, severity threshold | High |
| **Calendar policy** | Missing | solar/lunar event source, event window, yearly mapped date, fixture tests | High |
| **Opportunity policy** | Missing | product-event fit, keyword proposal, campaign proposal, product discovery evidence | High |
| **Seasonal keyword ad policy** | Missing | keyword lifecycle, demand snapshot cache, budget/bid caps, stop conditions, negative keywords | High |
| **Execution policy** | Missing | risk level, write gate, rollback, preflight, partial failure handling | High |
| **Outcome policy** | Missing | baseline, checkpoints, outcome states, follow-up agenda rules | High |

### 8.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `DATABASE_URL` | 안건/보고/결재/감사 로그 저장 DB | Server | ☐ |
| `AI_LLM_PROVIDER` | LLM provider 선택 | Server | ☐ |
| `AI_LLM_MODEL_PLANNER` 또는 `AI_LLM_MODEL_STRATEGIC` / `AI_LLM_MODEL_DEFAULT` | 안건 triage/모아 종합 planner 모델 | Server | ☐ |
| `GEMINI_API_KEY` 또는 `OPENAI_API_KEY` | LLM 호출 | Server | ☐ |
| `MARKETING_CALENDAR_SOURCE` | 양력/음력 마케팅 이벤트 캘린더 source | Server | ☐ |
| `LUNAR_CALENDAR_PROVIDER` | 음력-양력 변환 provider 또는 local table | Server | ☐ |
| `NAVER_SEARCH_AD_CUSTOMER_ID` | 네이버 키워드광고 read-only 조회 | Server | ☐ |
| `NAVER_SEARCH_AD_ACCESS_LICENSE` | 네이버 키워드광고 인증. 기존 `NAVER_SEARCH_AD_API_KEY`도 alias로 허용 | Server | ☐ |
| `NAVER_SEARCH_AD_SECRET_KEY` | 네이버 키워드광고 signature | Server | ☐ |
| `NAVER_SEARCH_AD_KEYWORD_REQUEST_DELAY_MS` | 네이버 키워드 도구 read-only 호출 간 지연 | Server | ☐ |
| `NAVER_DATALAB_CLIENT_ID` | 네이버 데이터랩 검색어 트렌드 보조 조회 | Server | ☐ |
| `NAVER_DATALAB_CLIENT_SECRET` | 네이버 데이터랩 인증 | Server | ☐ |
| `MARKETCREW_PROVIDER_SYNC_HINT_KEYWORDS` | Search Ad/DataLab 기본 조회 키워드 override | Server | ☐ |
| `KEYWORD_DEMAND_CACHE_TTL_HOURS` | 키워드 수요 스냅샷 캐시 유지 시간 | Server | ☐ |
| `KEYWORD_TOOL_BACKOFF_SECONDS` | 키워드 도구 429/backoff 기본 대기 시간 | Server | ☐ |
| `NAVER_COMMERCE_CLIENT_ID` 또는 `NAVER_SMARTSTORE_CLIENT_ID` | 스마트스토어/커머스 API 조회 | Server | ☐ |
| `NAVER_COMMERCE_CLIENT_SECRET` 또는 `NAVER_SMARTSTORE_CLIENT_SECRET` | 스마트스토어/커머스 API 인증 | Server | ☐ |
| `NAVER_COMMERCE_API_BASE_URL` | 네이버 커머스 API base URL | Server | ☐ |
| `NAVER_COMMERCE_TARGET_BRANDS` | 커머스 집계 brand key 매핑 | Server | ☐ |
| `NAVER_COMMERCE_AGGREGATE_WINDOW_DAYS` | 커머스 주문 집계 기간 | Server | ☐ |
| `NAVER_COMMERCE_AGGREGATE_ORDER_LIMIT` | 커머스 주문 상세 조회 최대 건수 | Server | ☐ |
| `MARKETCREW_COMMERCE_READ_ONLY_CONFIRMED` | 스마트스토어/커머스 read-only 승인 플래그 | Server | ☐ |
| `MARKETCREW_COMMERCE_SIGNATURE_DRIVER_READY` | bcrypt 기반 커머스 서명 런타임 확인 | Server | ☐ |
| `MARKETCREW_COMMERCE_TOKEN_PROBE_APPROVED` | 커머스 token probe/read-only 호출 승인 | Server | ☐ |
| `YOUNGCART_BRIDGE_URL` 또는 `SHOP_READONLY_BRIDGE_URL` | 자체 쇼핑몰 read-only bridge endpoint | Server | ☐ |
| `YOUNGCART_BRIDGE_TOKEN` 또는 `SHOP_READONLY_BRIDGE_TOKEN` | 자체 쇼핑몰 bridge token | Server | ☐ |
| `MARKETCREW_YOUNGCART_BRIDGE_APPROVED` 또는 `MARKETCREW_YOUNGCART_READ_ONLY_USER_CONFIRMED` | 자체 쇼핑몰 read-only bridge 승인 플래그 | Server | ☐ |
| `MARKETCREW_YOUNGCART_PII_MINIMIZATION_CONFIRMED` | 영카트 bridge aggregate-only/PII 최소화 확인 | Server | ☐ |
| `YOUNGCART_BRIDGE_WINDOW_DAYS` 또는 `SHOP_READONLY_WINDOW_DAYS` | 자체 쇼핑몰 집계 기간 | Server | ☐ |
| `EXTERNAL_WRITE_ENABLED` | 외부 쓰기 전역 게이트, 실제 실행 전까지 기본 `false` | Server | ☐ |
| `SEARCH_AD_WRITE_ENABLED` | 네이버 키워드광고 write executor 개별 게이트 | Server | ☐ |
| `SMARTSTORE_WRITE_ENABLED` | 스마트스토어 write executor 개별 게이트 | Server | ☐ |
| `SHOP_WRITE_ENABLED` | 자체 쇼핑몰 write executor 개별 게이트 | Server | ☐ |
| `CRM_WRITE_ENABLED` | 메시지/쿠폰/CRM executor 개별 게이트 | Server | ☐ |
| `CRITICAL_ACTION_SECOND_CONFIRMATION` | Critical 작업 2차 확인 강제 | Server | ☐ |

### 8.4 Pipeline Integration

| Phase | Status | Document Location | Command |
|-------|:------:|-------------------|---------|
| Phase 1 (Schema) | ☐ | `docs/01-plan/schema.md` | `$pdca design ai-marketing-character-ops` 이후 |
| Phase 2 (Convention) | ☐ | `docs/01-plan/conventions.md` | scaffold 직후 |

---

## 9. Implementation Slices

### Slice 1: Static Bottom-Up Agenda Room

- Next.js 앱 scaffold.
- 캐릭터 프로필/역할 정의.
- `오늘 올라온 안건`, `승인하면 바로 반영될 작업`, `성과 추적 중`, `추가 근거 대기` 중심 UI.
- 샘플 데이터 기반 캐릭터별 안건 후보/보고/모아 종합/대표 결재 미리보기.
- 브라우저 smoke로 첫 화면 검증.

### Slice 2: Signal, Agenda, and Guardrail Domain Engine

- `Signal`, `MarketingCalendar`, `KeywordDemandSnapshot`, `SearchTrendSnapshot`, `AgendaCandidate`, `KeywordOpportunity`, `SeasonalKeywordAdPlan`, `MarketingProposal`, `ProductOpportunity`, `AgendaTriage`, `CharacterReport`, `MoaSynthesisReport`, `ApprovalRequest`, `ExecutionPlan`, `OwnerDecision`, `ExecutionResult`, `PerformanceCheckpoint`, `OutcomeReport`, `FollowUpInternalTask` 타입/저장소.
- `daily_spike`, `weekly_trend`, `monthly_trend`, `seasonal_yoy`, `lunar_event_yoy`, `event_opportunity`, `seasonal_keyword_demand`, `target_gap` signal type과 deterministic comparison engine 구현.
- deterministic character watcher와 triage 우선 구현.
- LLM planner는 interface 뒤에 붙인다.

### Slice 3: Approval Preview and Execution Contract

- 변경 전/후 diff, risk level, data confidence, rollback plan, measurement plan이 포함된 approval preview.
- `APPROVE_AND_APPLY`, `APPROVE_DRAFT_ONLY`, `REQUEST_REVISION`, `REQUEST_MORE_EVIDENCE`, `HOLD`, `REJECT` owner decision action.
- mock/sandbox `ProviderExecutor`로 `APPLIED`, `PARTIALLY_APPLIED`, `FAILED`, `NEEDS_MANUAL_ACTION`, `ROLLED_BACK` 상태 검증.

### Slice 4: Calendar, Seasonal Keyword, Opportunity Engine, and History Cache

- 스마트스토어/검색광고/자체 쇼핑몰 샘플 어댑터.
- 설날/추석/부처님오신날 등 음력 이벤트를 연도별 양력 날짜와 이벤트 윈도우로 저장.
- 전년도 같은 기간 비교를 위한 history cache/rollup 저장 구조.
- 키워드 도구/데이터랩/내부 광고 성과를 `KeywordDemandSnapshot`과 `SearchTrendSnapshot`으로 캐시한다.
- 시즌 키워드 광고의 `DISCOVER -> VALIDATE -> TEST -> SCALE -> PEAK_GUARD -> TAPER -> REVIEW` 생애주기 안건을 만든다.
- 예산 상한, 입찰가 상한, 중지 조건, 제외 키워드 후보, 랜딩 준비 상태가 없는 시즌 광고 안건은 결재 가능 상태로 승격하지 않는다.
- 상품별 이벤트 적합도, 키워드 후보, 마케팅 제안, 상품 발굴 후보 생성.
- 실제 API readiness probe.
- provider failure를 UI에 표시.

### Slice 5: LLM Agenda Triage and Reports

- 캐릭터별 structured output schema.
- agenda title, evidence, confidence, missing data, severity, recommended owner decision 필수화.
- LLM input은 raw rows가 아니라 deterministic `SignalSummary`와 상위 후보로 제한.
- 모델/토큰/비용 기록.

### Slice 5A: 자유 탐색과 근거 요청 루프

- 담당 캐릭터는 정해진 `Signal` 후보 외에도 상품/키워드/기기/시간대/고객군 조합 가설을 생성한다.
- 모든 가설은 `Hypothesis` 상태로 시작하며, 필요한 원천 필드와 비교 기준을 함께 남긴다.
- 데이는 근거 후보를 검증하고 `확인됨`, `근거 부족`, `수집 필요`, `판단 보류`로 표시한다.
- 모아는 확인된 가설만 대표 결재 안건으로 승격하고, 미확인 가설은 추가 근거 대기 또는 월간 학습 대상으로 남긴다.
- `/people` 인사과 화면은 캐릭터별 롤모델에 자유 탐색과 검증 책임을 보여주고 수정 가능해야 한다.

### Slice 6: Real Provider Executors

- 네이버 키워드광고, 스마트스토어, 자체 쇼핑몰, CRM executor를 provider별 gate 뒤에 구현한다.
- 공식 API 문서와 샘플로 endpoint, auth, write scope, rate limit, rollback 가능성을 확인한다.
- Critical 작업은 단일 클릭 반영 금지.

### Slice 6A: 공급자 판단 근거 확장

- 완료 목표: `/data`에서 판단 근거 확장 순서를 보여주고, 다음 구현이 어느 provider 근거를 먼저 보강해야 하는지 명확히 한다.
- 1순위는 검색광고 광고그룹 실제 설정이다. PC/모바일 집행 설정, 입찰 가중치, 예산, ON/OFF 상태, 요일/시간/지역/연령/성별 타겟을 우선 확인한다.
- 2순위는 기기·시간대·요일 성과다. 광고 판단은 키워드 단위 평균만으로 끝내지 않고 실제 집행 설정과 성과 분해를 함께 본다.
- 3순위는 스마트스토어 순매출과 클레임이다. 광고 효율이 주문 품질, 취소/반품/교환, 구매확정까지 이어지는지 본다.
- 4순위는 데이터랩 세그먼트다. 상대 지표이므로 절대 수요가 아니라 시즌 고객군 보조 근거로 표시한다.
- 5순위는 스마트스토어 데이터솔루션이다. 판매/고객/유입 분석 권한이 열리면 상품 발굴과 채널 판단을 확장한다.

### Slice 7: Outcome Tracking and Performance Reports

- 승인 전 baseline 저장.
- 1일/3일/7일/14일/30일 `PerformanceCheckpoint`.
- 시즌성/음력 이벤트 상품은 전년도 같은 이벤트 윈도우로 보정.
- `SUCCESS`, `PARTIAL_SUCCESS`, `FAILED`, `INCONCLUSIVE` outcome report.
- 결과에 따라 follow-up agenda candidate 생성.

### Slice 8: Owner Command Extension

- 대표가 모아에게 직접 지시하는 top-down command inbox.
- 이 slice는 bottom-up 안건 상신, 승인 즉시 반영, 성과 보고 루프가 동작한 뒤 추가한다.

---

## 10. Open Questions Captured, Not Blocking

질문 답변을 기다리지 않고 MVP 플랜을 시작하기 위해 아래는 가정으로 둔다.

| Question | Current Assumption |
|----------|--------------------|
| 자체 쇼핑몰 솔루션은 무엇인가? | 우선 `SHOP_READONLY_BRIDGE_*` 계약으로 추상화한다. |
| 첫 LLM provider는 무엇인가? | pluggable 구조로 두고 scaffold 후 사용 가능한 키 기준으로 연결한다. |
| 게임형 UI 강도는 어느 정도인가? | 업무 속도를 해치지 않는 캐릭터 지휘실 수준으로 시작한다. |
| 외부 실행 자동화는 언제 허용하는가? | MVP 이후 별도 phase에서 명시 승인 후 구현한다. |
| 캐릭터명은 확정인가? | 모아 중심 7개 역할을 초안으로 사용하고 UI에서 교체 가능하게 둔다. |
| 실제 외부 반영은 언제 허용하는가? | mock/sandbox executor로 계약을 먼저 검증하고, provider별 write gate와 rollback 검증 후 실제 executor를 켠다. |
| Critical 작업도 즉시 반영하는가? | 아니다. Critical은 2차 확인 또는 별도 승인 정책이 필요하다. |
| 음력 이벤트 날짜는 어떻게 잡는가? | `MarketingCalendar`가 이벤트별 lunar/solar type, lunar month/day, 연도별 양력 환산일, D-n 이벤트 윈도우를 저장한다. |
| 상품/키워드 기회는 누가 올리는가? | `gro`는 키워드, `copy`는 캠페인 문구, `pro`/`maru`는 상품/묶음/운영, `ripi`는 고객군 기회를 올리고 모아가 결재 안건으로 묶는다. |
| 시즌 키워드 광고는 상품 시즌성과 같은가? | 아니다. 같은 `MarketingCalendar`를 참조하지만 `SeasonalKeywordAdPlan`으로 별도 생애주기, 예산/입찰 상한, 중지 조건, 제외 키워드 후보를 관리한다. |
| 플랜이 너무 방대한가? | 비전 문서로는 적정하지만 구현 플랜으로는 넓다. MVP는 “대표가 오늘 결재할 수 있는 근거 있는 안건”에 직접 필요한 것만 포함하고 나머지는 후속 slice로 미룬다. |
| 대표 직접 지시는 언제 구현하는가? | bottom-up 안건 상신, 승인 즉시 반영, 성과 보고 루프 이후 Slice 8로 구현한다. |

---

## 11. Next Steps

1. [ ] Design 문서 작성: `docs/02-design/features/ai-marketing-character-ops.design.md`
2. [ ] 앱 scaffold 결정: Next.js + TypeScript + 테스트 도구
3. [ ] Slice 1 구현: `오늘 올라온 안건` / `승인하면 바로 반영될 작업` / `성과 추적 중` 중심 Operations Room
4. [ ] Slice 2 구현: `Signal -> AgendaCandidate -> CharacterReport -> MoaSynthesisReport -> ApprovalRequest -> ExecutionPlan` 도메인 타입과 테스트
5. [ ] Slice 3 구현: approval preview, owner decision, mock/sandbox executor
6. [ ] Slice 4 구현: 음력/양력 `MarketingCalendar`, 이벤트 윈도우, 키워드 수요 캐시, 시즌 키워드 광고 생애주기, 상품별 키워드/마케팅/상품 발굴 후보 생성
7. [ ] Slice 6 이후 실제 provider executor 전 공식 API 문서 확인: 네이버 키워드광고, 스마트스토어/커머스, 자체 쇼핑몰 bridge

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-22 | Initial top-down command oriented PDCA plan draft | Codex |
| 0.2 | 2026-05-22 | Reframed first MVP around bottom-up agenda creation and upward reporting | Codex |
| 0.3 | 2026-05-22 | Added approval-to-execution, risk gates, rollback, priority inbox, and performance outcome loop | Codex |
| 0.4 | 2026-05-22 | Added lunar event comparison, marketing calendar, and product-keyword-campaign opportunity generation | Codex |
| 0.5 | 2026-05-22 | Added seasonal keyword ad lifecycle, keyword demand snapshots, ad budget/bid guardrails, API cache/backoff policy, and MVP cutline | Codex |
| 0.6 | 2026-05-23 | Added provider evidence expansion order for ad settings, device/time performance, Smartstore net sales and claims, DataLab segments, and sales analytics expansion | Codex |
| 0.7 | 2026-05-23 | Added LLM free exploration, evidence request, and verified-agenda promotion policy with updated character role models | Codex |
