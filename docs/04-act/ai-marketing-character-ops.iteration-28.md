# Iteration 28 - 검색광고 성과 규칙 엔진과 담당자 지정

## 완료한 목표

LLM이 검색광고 성과를 먼저 추측하지 않도록, 공식 API에서 가져올 수 있는 집계 근거를 코드 규칙 엔진이 먼저 판정하고 담당 캐릭터를 배정하는 구조를 추가했다.

## 공식 API 검토 요약

| 공급자 | 확인한 근거 | 반영한 판단 |
|---|---|---|
| 네이버 검색광고 | `/stats`는 `id/ids`, `fields`, `timeRange`, `timeIncrement`, `breakdown` 기준으로 성과 집계를 조회한다. | `pcMblTp`, `dayw`, `hh24` 같은 breakdown은 기기/요일/시간대 차이 판단 후보가 된다. |
| 네이버 커머스 | 변경 주문 조회는 변경 일시 기준이다. | 주문·클레임 상태를 주문 품질/전환 확인 보조 근거로 본다. |
| 네이버 데이터랩 | `device`, `ages`, `gender`, `timeUnit` 세그먼트와 ratio를 제공한다. | 절대 검색량이나 전환 증거가 아니라 시즌/고객군 보조 근거로만 쓴다. |

## 반영 내역

| 영역 | 변경 |
|---|---|
| 도메인 | `SearchAdPerformanceSnapshot`을 추가해 브랜드, 캠페인, 광고그룹, 키워드, 기기, 시간대, 클릭, 비용, 전환, 매출, 추적 확인 상태를 집계 스냅샷으로 저장한다. |
| 규칙 엔진 | `buildAdPerformanceDiagnoses`가 주문 없는 클릭, 낮은 전환율, 높은 CPA, 기기 차이, 시간대 차이, 전환 추적 미확인을 LLM 전 단계에서 계산한다. |
| 담당자 지정 | 데이터 추적 미확인은 `데이`, 조정 가능한 광고 성과 이상은 `그로`에게 배정한다. |
| 안건 생성 | 검색광고 성과 이상이 있으면 `저성과 검색광고 키워드 조정 안건`을 만들고, 결재 실행 범위 선택과 성과 체크포인트에 연결한다. |
| AI 입력 | Gemini 파일럿에는 원천 행이 아니라 성과 스냅샷 요약과 근거 ID만 전달한다. |
| 감사/성과 | provider sync AgentRun, AI 판독 근거, Outcome 기준선에 `SearchAdPerformanceSnapshot` 근거 ID를 포함한다. |
| 데이터 화면 | `/data` 명세에 `GET /stats`, `pcMblTp`, `hh24`, 저장되는 성과 스냅샷 칼럼을 추가했다. |
| 인사과 | 그로와 데이의 기본 롤모델에 규칙 엔진 판정과 전환 추적 검증 책임을 반영했다. |

## 담당 기준

| 규칙 결과 | 담당 | 대표 화면 상태 |
|---|---|---|
| 클릭은 있는데 주문이 없음 | 그로 | 입찰 하향, 일시중지, 제외 키워드, 랜딩 점검 안건 |
| CPA가 목표보다 높음 | 그로 | 예산 축소 또는 전환 좋은 키워드로 이동 안건 |
| PC/모바일 성과 차이 | 그로 | 기기별 가중치 또는 분리 집행 안건 |
| 시간대 성과 차이 | 그로 | 저성과 시간대 제외 또는 집중 시간대 조정 안건 |
| 전환 추적 미확인 | 데이 | 주문 연결, UTM/NaPm, 전환 스크립트 확인 요청 |

## 안전 경계

- 실제 검색광고 입찰가, 예산, 키워드는 이번 iteration에서 변경하지 않는다.
- 규칙 엔진 결과가 있어도 외부 반영은 대표 승인, 실행 전 점검, provider write gate를 통과해야 한다.
- LLM은 규칙 결과를 해석하고 실행안 초안을 보완하지만, 원천 행 전체를 읽지 않는다.

## 검증

- `npm test -- --run tests/application/ad-performance-diagnostics.test.ts tests/application/provider-signal-agenda.test.ts tests/application/agent-run-recorder.test.ts tests/llm/gemini-planner.test.ts tests/application/ai-evidence-briefs.test.ts tests/application/provider-outcome-analysis.test.ts tests/components/provider-data-contract-panel.test.ts` - 7 files / 15 tests
- `npm run typecheck` - passed
- `npm test -- --run` - 52 files / 141 tests
- `npm run build` - passed
- `npm audit --omit=dev` - 0 vulnerabilities
- `npm run test:e2e` - 11 tests
