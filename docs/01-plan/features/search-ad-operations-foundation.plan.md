---
feature: search-ad-operations-foundation
project: marketcrew
version: 0.0.0-reboot
author: Codex
date: 2026-05-26
status: Draft
---

# search-ad-operations-foundation Planning Document

> **Summary**: LLM 연결 전에 커피프린트와 스티커씨의 네이버 파워링크와 쇼핑검색광고를 분리 관리하고, 네이버 보고서를 자동 다운로드해 쉬운 보고서 화면과 검색어·키워드 성과 분류, 캠페인/광고그룹 상태 제어를 SaaS형 운영 화면으로 만든다.
>
> **Project**: marketcrew
> **Version**: 0.0.0-reboot
> **Author**: Codex
> **Date**: 2026-05-26
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 대표가 커피프린트와 스티커씨의 파워링크·쇼핑검색광고를 한 화면에서 보되, 네이버 보고서와 API 데이터를 매번 따로 확인해야 해서 성과 판단과 ON/OFF 운영이 느리다. |
| **Solution** | 네이버 보고서는 자동 다운로드해 원본과 정규화 데이터를 저장하고, API 직접 조회는 캠페인·광고그룹·키워드 상태와 ON/OFF 실행에 사용한다. LLM 없이 규칙 엔진으로 저효율/무클릭/우수 후보를 분류하고, 별도 성과 기준 화면과 안전한 실행 게이트를 붙인다. |
| **Function/UX Effect** | SaaS형 대시보드에서 브랜드, 광고 유형, 보고서 요약, 검색어 성과, 캠페인/광고그룹 상태, 실행 이력을 간결하게 보고 즉시 운영 판단을 할 수 있다. |
| **Core Value** | 전일 확정 성과는 보고서로 안정적으로 쌓고, 현재 상태와 실행은 API로 처리한다. LLM 비용과 환각 없이 숫자 기반 운영을 먼저 자동화하고, 이후 LLM은 제안·설명·예외 검토 층으로 붙일 수 있다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | LLM보다 먼저 네이버 보고서 원천 데이터, API 상태 조회, 규칙 기반 판단을 안정화해야 실제 운영 자동화의 기반이 생긴다. |
| **WHO** | 커피프린트와 스티커씨 광고를 직접 관리하는 대표. |
| **RISK** | 캠페인/광고그룹 ON/OFF는 실제 광고 노출에 영향을 주므로 미리보기, 권한, write gate, 실행 로그가 필수다. |
| **SUCCESS** | 네이버 보고서가 자동 수집되고 쉬운 보고서 화면에서 이해 가능하게 표시된다. 브랜드별 파워링크·쇼핑검색광고 상태와 성과가 분리 표시되고, 규칙 엔진이 저효율/무클릭/우수 후보를 추출하며, 승인된 경우에만 캠페인/광고그룹 상태를 변경한다. |
| **SCOPE** | 1) 보고서 자동 다운로드 2) 원본/정규화 저장 3) 쉬운 보고서 화면 4) API 상태 수집 5) 브랜드/광고유형 매핑 6) 성과 규칙 엔진 7) 성과 기준 확인 화면 8) SaaS UI 9) 안전한 ON/OFF 실행 10) LLM 확장 준비. |

---

## 1. Overview

### 1.1 Purpose

새로운 MarketCrew의 첫 기능은 AI 직원이나 LLM 제안이 아니라, 검색광고 운영을 위한 확실한 데이터 기반 도구다. 커피프린트와 스티커씨를 서로 비교하지 않고 독립 사업 단위로 관리하며, 각 브랜드 안에서 파워링크와 쇼핑검색광고를 구분한다.

성과 판단의 1차 원천은 네이버 보고서 자동 다운로드다. API 직접 조회는 현재 캠페인/광고그룹/키워드 상태 확인과 실행 전 미리보기, 승인 후 ON/OFF 실행에 사용한다.

### 1.2 Background

현재 저장소는 reboot 기준선이며, 연결은 유지되어 있다.

- Web: `https://marketcrew.app`
- API: `https://api.marketcrew.app`
- Railway service: `marketcrew-api`
- DB: Railway Postgres, workflow records 초기화 완료
- Search Ad env: Railway에 key가 남아 있음

네이버 검색광고 API 공식 문서 기준으로 다음 기반이 확인됐다.

- API service URL은 `https://api.searchad.naver.com`.
- API license/secret은 광고주센터 Tools > API Manager에서 발급한다.
- 공식 Swagger JSON에는 `/api/...` 경로로 정의되어 있으나 문서 앱 설정의 `uriReplace`가 `/api`를 제거한다. 실제 호출과 서명 URI는 `/stat-reports`, `/stats`, `/ncc/...`처럼 `/api` 없이 사용한다.
- 보고서 작업 경로는 실제 호출 기준 `GET/POST /stat-reports`, 단건 조회는 `GET /stat-reports/{reportJobId}`다.
- 보고서 작업 응답은 `reportJobId`, `reportTp`, `statDt`, `status`, `downloadUrl`을 제공한다.
- 보고서 상태는 `REGIST`, `RUNNING`, `BUILT`, `NONE`, `ERROR`, `WAITING`, `AGGREGATING` 등이 있다.
- `downloadUrl`은 `/report-download?authtoken=...&fileVersion=...` 형태이며, 익명 다운로드가 아니라 `X-API-KEY`, `X-Customer`, `X-Timestamp`, `X-Signature` 헤더가 필요하다.
- 다운로드 서명 URI는 query string을 제외한 `/report-download`로 생성한다. query를 포함하면 `invalid-signature`가 발생한다.
- 다운로드 파일은 실제 확인 결과 `application/octet-stream; charset=UTF-8`, 탭 구분, 헤더 행 없음이다. 첫 줄도 데이터 행이므로 `reportTp`별 컬럼 순서표로 파싱한다.
- 캠페인 조회/수정 경로: `GET /ncc/campaigns`, `PUT /ncc/campaigns/{campaignId}{?fields}`.
- 광고그룹 조회/수정 경로: `GET /ncc/adgroups`, `PUT /ncc/adgroups/{adgroupId}{?fields}`.
- 키워드 조회/수정 경로: `GET /ncc/keywords`, `PUT /ncc/keywords/{nccKeywordId}{?fields}` 또는 bulk update.
- 마스터 보고서는 `GET/POST /master-reports`로 생성/조회 가능하며 `Campaign`, `Adgroup`, `Keyword`, `Ad`, `AdExtension`, `Criterion`, `ProductGroup` 같은 원천 구조 동기화에 쓸 수 있다.
- `userLock`은 캠페인/광고그룹/키워드 ON/OFF에 쓰이며, `true`는 노출 중지, `false`는 노출 가능이다.
- 캠페인 유형에는 `WEB_SITE`, `SHOPPING`, `BRAND_SEARCH`, `PLACE`, `POWER_CONTENTS`가 있다.
- 광고그룹 유형에는 `WEB_SITE`, `SHOPPING`, `INFORMATION`, `PRODUCT`, `BRAND_SEARCH`, `PLACE`, `CATALOG`가 있다.
- 일반 성과는 `/stats`에서 `impCnt`, `clkCnt`, `ctr`, `cpc`, `ccnt`, `salesAmt`, `drtCrto` 등을 조회한다.
- 쇼핑검색광고 검색어 성과는 `GET /stats?id={id}&statType=NPLA_SCH_KEYWORD`이며, 공식 릴리스 노트상 최근 30일 안에서 클릭 1회 이상인 검색어 데이터만 제공된다.
- 보고서 다운로드 URL은 2025년 공지 기준 `fileVersion` 파라미터가 추가될 수 있으므로 URL을 직접 조립하지 않고 API 응답의 `downloadUrl`을 사용한다.
- 실제 계정 read-only 확인 결과, 사용자가 올린 보고서 ID 10개는 `GET /stat-reports`에서 모두 조회됐고 상태는 `BUILT`, `downloadUrl` 존재로 확인됐다. 그중 `177442248` 파워링크 검색어 보고서는 API에서 `EXPKEYWORD`로 내려왔다.

### 1.3 Related Documents

- Reboot design: `DESIGN.md`
- Connection preservation: `docs/connection-preservation.md`
- Naver Search AD API spec: `https://naver.github.io/searchad-apidoc/`
- Search AD API repository: `https://github.com/naver/searchad-apidoc`
- Shopping search keyword stats release note: `https://naver.github.io/searchad-apidoc/release/2016/10/17/release-note/`
- Shopping campaign search keyword report release note: `https://naver.github.io/searchad-apidoc/release/2018/02/21/release-note/`
- Shopping adgroup automated bidding release note: `https://naver.github.io/searchad-apidoc/release/2025/10/15/release-note/`

---

## 2. Scope

### 2.1 In Scope

- [ ] 커피프린트와 스티커씨를 최상위 운영 단위로 분리한다.
- [ ] 각 브랜드 안에서 파워링크와 쇼핑검색광고를 별도 탭/필터로 관리한다.
- [ ] 네이버 `stat-reports` API로 전일 보고서를 자동 생성/조회/다운로드한다.
- [ ] 이미 생성 완료된 보고서도 목록에서 가져와 원본 파일과 파싱 결과를 저장한다.
- [ ] 보고서 내용을 대표가 쉽게 이해할 수 있는 `보고서 보관함`과 `보고서 상세` 화면으로 제공한다.
- [ ] 캠페인, 광고그룹, 키워드 원천 목록과 상태를 수집한다.
- [ ] 캠페인/광고그룹/키워드 ON/OFF를 미리보기와 실행 로그를 거쳐 처리한다.
- [ ] 키워드 삭제 후보는 실제 삭제 전에 1차로 끄기 처리하고, 삭제/제외어/키워드 추가는 별도 승인 플로우로 분리한다.
- [ ] 저효율 검색어, 클릭 없는 키워드/광고그룹, 우수 검색어/키워드를 보고서 기반 규칙 엔진으로 추출한다.
- [ ] 성과 분류에 쓰는 기간, 최소 표본, 브랜드별 CPA/ROAS 기준, 실행 단계 기준을 별도 `성과 기준` 화면에서 확인하게 한다.
- [ ] 쇼핑검색광고 검색어 성과는 보고서 데이터를 우선 저장하고, `NPLA_SCH_KEYWORD` 직접 조회는 보조 출처로 분리 저장한다.
- [ ] 파워링크는 파워링크 검색어 보고서를 우선 사용하고, 키워드/광고그룹 stats는 상태와 보조 지표로 사용한다.
- [ ] 모든 provider write는 `SEARCH_AD_WRITE_ENABLED`와 대표 확인 UI를 통과해야 한다.
- [ ] LLM은 이번 단계에서 호출하지 않되, 나중에 판단 근거 패킷을 넘길 수 있게 구조를 열어둔다.

### 2.2 Out of Scope

- LLM 모델 호출, AI 제안 자동 생성.
- 자동 입찰 변경.
- 예산 변경.
- 키워드 신규 등록/삭제.
- 쇼핑 상품 수정, 스마트스토어 상품 데이터 쓰기.
- 커피프린트와 스티커씨 성과 비교 랭킹.
- 대행사급 다계정 관리.
- 외부 provider write gate를 기본 활성화하는 것.

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 브랜드는 `커피프린트`, `스티커씨`로 분리하고 모든 캠페인/광고그룹/검색어 성과는 브랜드에 귀속한다. | High | Pending |
| FR-02 | 광고 유형은 `파워링크`, `쇼핑검색광고`로 구분한다. | High | Pending |
| FR-03 | Search Ad API에서 캠페인, 광고그룹, 키워드 목록과 `userLock`, `status`, `statusReason`을 수집한다. | High | Pending |
| FR-04 | `stat-reports` API로 보고서 작업을 생성/조회하고, `BUILT` 상태의 `downloadUrl`을 Search Ad 인증 헤더로 안전하게 다운로드한다. | High | Pending |
| FR-05 | 광고성과, 광고성과 상세, 파워링크 검색어, 쇼핑검색 검색어 상세, 쇼핑검색 검색어 전환 상세, 전환/타게팅/확장소재 보고서를 저장하고 파싱한다. | High | Pending |
| FR-06 | `/stats` 직접 조회는 당일 긴급 확인, 실행 전 영향 범위, 캠페인/광고그룹/키워드 요약 보조에 사용한다. | Medium | Pending |
| FR-07 | 쇼핑검색광고는 보고서와 `NPLA_SCH_KEYWORD` 조회 결과를 분리 저장하고 출처를 표시한다. | High | Pending |
| FR-08 | 규칙 엔진이 저효율 후보를 추출한다: 충분 클릭 후 전환 없음, CPA 초과, ROAS 부족, 비용 과다. | High | Pending |
| FR-09 | 규칙 엔진이 무클릭 후보를 추출한다: 충분 노출이 있으나 클릭 0인 키워드/광고그룹. | High | Pending |
| FR-10 | 규칙 엔진이 우수 후보를 추출한다: 충분 클릭 기준 충족, 전환/매출/ROAS 우수. | Medium | Pending |
| FR-11 | 보고서 보관함에서 보고서 종류, 기준일, 생성/수집 상태, 원본 다운로드, 파싱 상태, 핵심 요약을 확인할 수 있다. | High | Pending |
| FR-12 | 보고서 상세 화면은 어려운 컬럼명을 한국어로 풀어 보여주고, 요약 카드/표/필터/원본 보기로 나눈다. | High | Pending |
| FR-13 | 캠페인/광고그룹/키워드 ON/OFF 실행 전 변경 전/후 diff와 예상 영향 범위를 보여준다. | High | Done |
| FR-14 | ON/OFF 실행은 write gate, 대표 확인, 실행 로그, 실패 로그를 남긴다. | High | Done |
| FR-15 | SaaS형 UI는 좌측 메뉴, 상단 브랜드/광고유형 필터, 표/카드 중심으로 구성한다. | High | Pending |
| FR-16 | LLM 확장용 `evidencePacket`을 만들되 이번 단계에서는 호출하지 않는다. | Medium | Pending |
| FR-17 | `성과 기준` 별도 페이지에서 기간 기준, 최소 표본, 저효율/무클릭/우수 판정식, 브랜드별 목표 CPA/ROAS, 실행 단계 기준을 확인할 수 있다. | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 주요 목록 첫 응답 1초 이내 목표, 보고서 다운로드/파싱은 백그라운드 수집 후 DB 조회 | production smoke + route timing |
| Safety | 실제 ON/OFF는 미리보기, `SEARCH_AD_WRITE_ENABLED`, 대표 확인을 모두 통과 | unit + API test |
| Cost | LLM 호출 0회 | code path audit |
| Reliability | API 실패 시 마지막 성공 스냅샷과 실패 원인을 구분 표시 | integration test |
| Localization | 화면 문구는 자연스러운 한국어 | UI copy review |
| Audit | 모든 ON/OFF 시도는 actor, before/after, request id, provider response 저장 | DB assertion |
| Provenance | 보고서 원본 파일, reportJobId, reportTp, statDt, parser version, normalized row count 추적 | DB assertion |
| Storage | 1차 MVP는 보고서 원본 텍스트와 원본 행을 Postgres에 저장하고, 용량 증가 시 외부 스토리지로 분리 | DB size review + migration plan |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `/operations`가 검색광고 운영 SaaS 대시보드로 바뀐다.
- [ ] `/reports`에서 네이버 보고서 목록, 수집 상태, 원본 보관, 파싱 상태, 요약을 확인할 수 있다.
- [ ] `/reports/[id]`에서 보고서별 핵심 요약, 쉬운 컬럼 설명, 필터 가능한 표, 원본 미리보기를 볼 수 있다.
- [ ] 브랜드 필터 `전체`, `커피프린트`, `스티커씨`가 동작한다. 단, `전체`는 비교가 아니라 운영 현황 합산만 보여준다.
- [ ] 광고 유형 필터 `파워링크`, `쇼핑검색광고`가 동작한다.
- [ ] 캠페인/광고그룹 상태 목록에 ON/OFF 상태, 상태 사유, 최근 수집 시간이 보인다.
- [ ] 저효율, 무클릭, 우수 후보 목록이 보고서 기반 규칙 엔진으로 생성된다.
- [ ] `성과 기준` 페이지에서 “최근 30일 기준”, “최근 7일 급등”, “시즌 윈도우 기준” 등 카드 판정 기준을 확인할 수 있다.
- [ ] 쇼핑검색광고 검색어 성과는 파워링크 키워드 성과와 섞이지 않는다.
- [ ] ON/OFF 미리보기 API와 실행 API가 분리된다.
- [ ] write gate가 닫혀 있으면 실행 API는 실제 provider 호출 없이 차단한다.
- [ ] `npm run typecheck`, `npm test -- --run`, `npm run build`, `npm run smoke:prod` 통과.

### 4.2 Quality Criteria

- [ ] 브랜드/광고유형/캠페인/광고그룹 매핑은 하드코딩이 아니라 설정 테이블로 관리한다.
- [ ] 성과 분류 기준은 별도 `/rules` 화면에서 볼 수 있고 나중에 수정 가능하게 한다.
- [ ] 검색어/키워드 데이터는 최신 스냅샷과 실행 이력을 분리한다.
- [ ] API 원천 payload는 필요한 범위만 저장하되 provider id와 원천 필드는 추적 가능하게 둔다.
- [ ] 보고서 원본은 1차 MVP에서 Postgres에 저장한다. 외부 스토리지는 데이터가 쌓인 뒤 분리한다.

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 브랜드 매핑이 잘못되어 커피프린트/스티커씨 데이터가 섞임 | High | Medium | 첫 sync 후 캠페인/광고그룹 mapping review 화면을 별도 제공 |
| 보고서 생성/다운로드가 지연됨 | Medium | High | job status polling, 재시도, 수동 재수집, 마지막 성공 보고서 표시 |
| 보고서 컬럼이 변경됨 | Medium | Medium | parser version, unknown column 보관, 원본 파일 유지, 파싱 실패 화면 표시 |
| 보고서 파일에 헤더 행이 없음 | Medium | High | `reportTp`별 컬럼 순서표와 column count guard를 코드에 둔다 |
| 다운로드 서명 URI를 잘못 잡아 실패 | Medium | Medium | `/report-download` path-only 서명 테스트를 자동화한다 |
| ON/OFF가 실제 광고 노출에 즉시 영향 | High | Medium | preview-only 기본값, write gate, 대표 확인, rollback action |
| 쇼핑검색광고 검색어는 클릭 1회 이상만 제공되어 무클릭 검색어를 직접 알 수 없음 | Medium | High | 무클릭은 검색어가 아니라 키워드/광고그룹 stats의 `impCnt > 0`, `clkCnt = 0`로 판정 |
| CPA/ROAS 기준이 브랜드마다 다름 | Medium | High | 브랜드별 rule threshold 설정 |
| API rate limit 또는 대량 계정 수집 지연 | Medium | Medium | 증분 수집, pagination, snapshot 캐시, sync job status |
| LLM 없이 놓치는 맥락 | Low | Medium | 규칙 엔진 결과에 메모/예외 플래그를 두고, 2단계 LLM에서 설명·예외 검토 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `/operations` | Page | 광고 운영 SaaS 대시보드로 변경 |
| `/reports` | Page | 보고서 보관함과 쉬운 보고서 목록 |
| `/reports/[id]` | Page | 보고서 상세 요약, 컬럼 설명, 원본/정규화 미리보기 |
| `/api/backend/health` | API | 기존 유지, provider readiness를 health에 계속 표시 |
| `/api/search-ad/reports/sync` | API | 보고서 작업 생성/조회/다운로드/파싱 |
| `/api/search-ad/reports` | API | 보고서 보관함 read model |
| `/api/search-ad/reports/[id]` | API | 보고서 상세 read model |
| `/api/search-ad/sync` | API | Search Ad read-only 수집 시작 |
| `/api/search-ad/overview` | API | 브랜드/광고유형별 운영 화면 read model |
| `/rules` | Page | 성과 분류 기준 확인 화면 |
| `/api/search-ad/rule-criteria` | API | 성과 기준 read model, 추후 수정 API의 기반 |
| `/api/search-ad/toggle-preview` | API | 캠페인/광고그룹 ON/OFF 미리보기 |
| `/api/search-ad/toggle-apply` | API | write gate 통과 시 실제 ON/OFF 실행 |
| Postgres tables | DB | search ad snapshot, rule result, action log 추가 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `/operations` | READ | 대표 업무 화면 | 기존 reboot 상태 화면을 광고 운영 화면으로 대체 |
| `/reports` | READ | 보고서 확인 | 수집된 네이버 보고서를 쉽게 확인 |
| `/reports/[id]` | READ | 보고서 상세 | 원본/정규화/컬럼 설명과 요약 확인 |
| `/rules` | READ | 성과 기준 확인 | 규칙 엔진 기준을 대표가 별도 화면에서 확인 |
| `/api/backend/health` | READ | smoke/proxy | 유지 |
| Railway env | READ | Search Ad API client | 기존 key 보존 사용 |
| Postgres | READ/WRITE | sync, rules, action logs | 새 테이블 추가 |

### 6.3 Verification

- [ ] `GET /api/backend/health` 유지.
- [ ] Search Ad env missing일 때 UI가 설정 필요 상태를 표시.
- [ ] write gate closed일 때 toggle apply가 409 또는 차단 상태 반환.
- [ ] sample fixture로 브랜드별 분리와 규칙 엔진 결과 검증.

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | 단순 정적 화면 | 이번 범위에는 부족 | ☐ |
| **Dynamic** | Next.js + API + Postgres + provider integration | 현재 MarketCrew reboot MVP | ☑ |
| **Enterprise** | 다계정/권한/큐/워크플로우 분리 | SaaS 확장 이후 | ☐ |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 성과 원천 | API 직접 조회 / 보고서 다운로드 / 혼합 | 보고서 우선, API 보조 | 검색어·전환·타게팅 상세는 보고서가 더 풍부하고, API는 현재 상태와 실행 제어에 적합 |
| 성과 분류 | LLM / 규칙 엔진 / 혼합 | 1차 규칙 엔진, 2차 LLM | 숫자 기준은 규칙이 더 싸고 일관적이며, LLM은 설명·예외·제안에 적합 |
| 브랜드 기준 | 캠페인명 prefix / 광고그룹명 prefix / 수동 매핑 / label | 수동 매핑 + 보조 prefix | 잘못 섞이는 위험을 줄인다 |
| 파워링크 구분 | campaignTp/adgroupType raw mapping | provider raw type 우선 | `WEB_SITE`와 `SHOPPING`을 우선 구분하되 실제 계정 데이터를 기준으로 확정 |
| 쇼핑검색어 성과 | 보고서와 일반 stats 통합 / 별도 모델 | 별도 모델 | 쇼핑검색 보고서와 `NPLA_SCH_KEYWORD`는 제공 조건과 필드가 다르다 |
| ON/OFF 실행 | 즉시 실행 / preview 후 실행 | preview 후 실행 | 실제 광고 노출 영향이 있으므로 안전 게이트 필요 |
| LLM 확장 | 지금 연결 / evidence packet만 준비 | packet만 준비 | 첫 버전 비용과 복잡도를 줄인다 |

### 7.3 Clean Architecture Approach

```text
src/
  app/
    operations/
    reports/
      [id]/
    api/search-ad/
  components/
    search-ad/
    reports/
  features/
    search-ad/
      buildSearchAdOperationsView.ts
      search-ad-rules.ts
      search-ad-types.ts
      reports/
        report-type-map.ts
        report-column-schemas.ts
        parse-search-ad-report.ts
        build-report-view.ts
  lib/
    integrations/search-ad/
      client.ts
      signer.ts
      normalize.ts
      reports.ts
    persistence/
      search-ad-repository.ts
  server/
    search-ad/
      report-sync.ts
      sync.ts
      toggle.ts
```

---

## 8. Data Model Draft

| Table | Purpose |
|-------|---------|
| `ad_brand_mappings` | 브랜드별 캠페인/광고그룹 매핑 규칙 |
| `search_ad_report_jobs` | `stat-reports` 보고서 작업 상태, reportJobId, reportTp, statDt, downloadUrl hash |
| `search_ad_report_files` | 원본 보고서 파일 메타데이터, 저장 방식, 원본 텍스트, checksum, parser version |
| `search_ad_report_rows` | 보고서별 원본 행 JSONB, 행 번호, 브랜드/광고유형 매핑 상태 |
| `search_ad_report_normalized_rows` | 검색어/전환/타게팅/소재 공통 정규화 행 |
| `search_ad_master_report_jobs` | `master-reports` 작업 상태, item, fromTime, downloadUrl hash |
| `search_ad_master_rows` | Campaign/Adgroup/Keyword/Ad/ProductGroup/Criterion 등 구조 원본 행 |
| `search_ad_campaign_snapshots` | 캠페인 원천 상태와 `userLock` |
| `search_ad_adgroup_snapshots` | 광고그룹 원천 상태와 입찰/예산/기기 설정 |
| `search_ad_keyword_snapshots` | 키워드 상태, 입찰, `userLock` |
| `search_ad_performance_snapshots` | `/stats` 일반 성과 |
| `shopping_search_term_snapshots` | `NPLA_SCH_KEYWORD` 검색어 성과 |
| `search_ad_rule_criteria` | 브랜드별 기간, 최소 표본, CPA/ROAS, 실행 단계 기준 |
| `search_ad_rule_results` | 저효율/무클릭/우수 후보 판정 결과 |
| `search_ad_action_previews` | 실행 전 diff와 영향 범위 |
| `search_ad_action_logs` | 실제 실행/차단/실패 이력 |

---

### 8.1 Report Storage Policy

1차 MVP에서는 보고서 원본을 Postgres에 보관한다.

- `search_ad_report_files.storageBackend`: `postgres`
- `search_ad_report_files.rawText`: 다운로드한 탭 구분 원본 텍스트
- `search_ad_report_files.checksum`: 중복 다운로드와 파일 변경 감지
- `search_ad_report_rows.rawRow`: 행 단위 원본 JSONB
- `search_ad_report_normalized_rows`: 화면/규칙 엔진용 정규화 행

이 방식은 초기 구현, 파서 검증, 보고서 상세 화면 확인이 빠르다. 하루 보고서 규모가 커지거나 보관 기간이 길어져 DB 용량이 부담될 때는 아래처럼 확장한다.

- `storageBackend`: `railway-volume` 또는 `object-storage`
- DB에는 파일 메타데이터, checksum, storage key만 유지
- 정규화 행과 규칙 결과는 계속 DB에 유지
- 원본 텍스트 이전은 별도 migration으로 처리

첫 구현에서는 외부 스토리지 의존성을 추가하지 않는다.

## 9. Rule Engine Draft

규칙 엔진은 보고서 다운로드 데이터를 우선 사용한다. API 직접 조회 결과는 당일 긴급 점검과 상태 확인 보조로 사용한다.

### 9.1 기본 분류

| 분류 | 기본 기준 | 비고 |
|------|----------|------|
| 저효율 검색어 | 클릭 `>= 10`, 전환 `0`, 비용 `>= 브랜드 기준` | 파워링크/쇼핑검색 검색어 보고서 기준 |
| 높은 CPA | 전환 있음, CPA가 브랜드 목표 CPA 초과 | 브랜드별 기준 필요 |
| 낮은 ROAS | 매출 있음, ROAS가 브랜드 목표 미만 | 부가세 포함 매출 기준 주의 |
| 클릭 없는 키워드 | 노출 `>= 100`, 클릭 `0` | 검색어가 아니라 키워드/광고그룹 stats 기준 |
| 우수 검색어 | 클릭 `>= 10`, 전환 또는 매출 있고 ROAS 기준 충족 | 충분 클릭 기준으로 우연 방지 |
| 점검 필요 | 전환 추적 없음, 데이터 부족, 상태 사유 제한 | 중지보다 점검 우선 |

### 9.2 보고서별 사용 기준

| API reportTp | 화면 표시명 | 실제 확인 컬럼 수 | 주 사용처 | 규칙 엔진 연결 |
|--------------|-------------|------------------|----------|----------------|
| `AD` | 광고성과 보고서 | 14 | 캠페인/광고그룹/광고 단위 요약 | 운영 현황, 실행 전 영향 범위 |
| `AD_DETAIL` | 광고성과 상세 보고서 | 16 | 더 세밀한 성과 분해 | 원인 분석과 드릴다운 |
| `EXPKEYWORD` | 파워링크 검색어 보고서 | 12 | 확장 검색어/키워드플러스 성과 | 저효율/우수 검색어. 계정 UI에서는 파워링크 검색어 보고서로 표시되지만 공식 API 성격은 키워드확장/키워드플러스이므로 설명 문구를 붙인다 |
| `SHOPPINGKEYWORD_DETAIL` | 쇼핑검색 검색어 상세 보고서 | 16 | 쇼핑검색광고 실제 검색어 성과 | 저효율/우수 검색어, 랜딩 점검 후보 |
| `SHOPPINGKEYWORD_CONVERSION_DETAIL` | 쇼핑검색 검색어 전환 상세 보고서 | 15 | 쇼핑검색광고 검색어별 전환/매출 | CPA/ROAS/전환 기준 |
| `AD_CONVERSION` | 전환 보고서 | 13 | 전환 유형별 요약 | 구매/장바구니/기타 전환 검증 |
| `AD_CONVERSION_DETAIL` | 전환 상세 보고서 | 15 | 전환 상세 분해 | 전환 원인 분석 |
| `CRITERION` | 타게팅 성과 보고서 | 7 | 기기, 지역, 시간, 타게팅 성과 | 기기/시간대 조정 후보 |
| `CRITERION_CONVERSION` | 타게팅 전환 보고서 | 8 | 타게팅별 전환 | 기기/시간대 전환 조정 후보 |
| `ADEXTENSION` | 확장소재광고 성과 보고서 | 15 | 확장소재 성과 | 소재 유지/중지/수정 후보 |

### 9.3 기간 기준

모든 성과 분류는 기간을 명시한다. 같은 숫자라도 기간이 없으면 판단 기준으로 쓰지 않는다.

| 용도 | 기준 기간 | 사용 기준 |
|------|----------|----------|
| 기본 성과 분류 | 최근 30일 | 저효율, 무클릭, 우수 후보의 기본 판단 |
| 빠른 이상 감지 | 최근 7일 | 최근 비용 급증, 전환 급락, 변경 직후 이상 확인 |
| 당일 점검 | 오늘 또는 어제 | 캠페인/광고그룹 ON/OFF 직후 확인 |
| 시즌 상품 | 시즌 윈도우 | D-30~D+7 또는 이벤트별 설정 기간, 전년도 같은 시즌과 비교 |
| 저빈도 키워드 보조 | 최근 60~90일 | 30일 표본이 부족한 장기 저빈도 키워드 보조 판단 |

실행 판단은 기본 분류보다 보수적으로 둔다.

| 판단 단계 | 필요한 기간/조건 |
|-----------|----------------|
| 관찰 | 최근 7일 이상 신호만으로 가능 |
| 조정 후보 | 최근 7일과 30일을 함께 확인 |
| 중지 후보 | 최근 30일 기준 충분 클릭/비용이 있고 전환 또는 매출 근거가 부족 |
| 확장 후보 | 최근 30일 성과가 좋고 최근 7일도 악화되지 않음 |

### 9.4 LLM 포함 여부

1차 성과 분류에는 LLM을 넣지 않는다.

- 이유: 숫자로 결정 가능한 분류는 규칙이 빠르고 저렴하며 재현 가능하다.
- LLM 역할: 2차에서 예외 검토, 설명 문구, 대표에게 보여줄 제안문, 랜딩/문안/기기·시간대 개선 아이디어 생성.
- 구조: 규칙 엔진 결과를 `evidencePacket`으로 저장해 LLM이 나중에 읽을 수 있게 한다.

---

## 10. UX Plan

### 10.1 화면 구조

```text
왼쪽 메뉴
  운영 홈
  보고서
  캠페인
  광고그룹
  검색어 성과
  규칙 결과
  성과 기준
  실행 이력
  설정

상단 필터
  브랜드: 전체 / 커피프린트 / 스티커씨
  광고유형: 전체 / 파워링크 / 쇼핑검색광고
  기간: 1일 / 7일 / 30일
```

`전체`는 비교 랭킹이 아니라 운영 현황 합산과 필터 해제 용도다. 브랜드별 판단과 실행은 반드시 브랜드를 가진다.

### 10.2 첫 화면 카드

- 오늘 상태: 수집 성공/실패, 마지막 수집 시간.
- 보고서 수집 상태: 전일 보고서 생성/다운로드/파싱 성공 여부.
- 꺼진 캠페인/광고그룹.
- 저효율 후보.
- 클릭 없는 후보.
- 우수 후보.
- 실행 대기/실패.

### 10.3 실행 UX

1. 목록에서 캠페인/광고그룹 선택.
2. `켜기` 또는 `끄기` 클릭.
3. 변경 전/후 diff 표시.
4. 영향 범위 표시: 브랜드, 광고유형, 캠페인, 광고그룹, 최근 비용/클릭/전환.
5. write gate 닫힘이면 “모의 실행만 가능” 표시.
6. write gate 열림 + 대표 확인 후 실행.
7. 실행 이력에 provider 응답과 실패 원인 저장.

### 10.4 성과 기준 페이지

`/rules`는 대표가 “왜 이 항목이 저효율/무클릭/우수로 분류됐는지” 확인하는 별도 화면이다.

첫 구현은 조회 중심으로 만들고, 수정 기능은 같은 구조 위에 단계적으로 붙인다.

- 브랜드별 기준: 커피프린트, 스티커씨의 목표 CPA, 목표 ROAS, 최소 비용 기준.
- 기간 기준: 최근 7일, 최근 30일, 시즌 윈도우, 60~90일 보조 기준.
- 최소 표본 기준: 최소 노출, 최소 클릭, 최소 비용, 최소 전환.
- 분류 기준: 저효율, 높은 CPA, 낮은 ROAS, 클릭 없음, 우수, 점검 필요.
- 실행 단계 기준: 관찰, 조정 후보, 중지 후보, 확장 후보.
- 데이터 제한 안내: 쇼핑검색광고 검색어 성과는 클릭 1회 이상 검색어 중심이므로, 클릭 없음은 키워드/광고그룹 기준으로 판단한다.

### 10.5 보고서 보관함과 상세 화면

`/reports`는 네이버 보고서를 파일명이나 어려운 컬럼명 대신 대표가 이해하기 쉬운 업무 문서처럼 보여주는 화면이다.

목록 화면:

- 기준일, 보고서 종류, 네이버 reportJobId, 생성 상태, 다운로드 상태, 파싱 상태.
- 브랜드 매핑 상태: 커피프린트/스티커씨/미분류.
- 핵심 요약: 총 비용, 클릭, 전환, 매출, 저효율 후보 수, 우수 후보 수.
- 원본 파일 보관 여부와 마지막 수집 시간.
- 수동 다시 수집 버튼.

상세 화면:

- `요약`: 이 보고서가 무엇을 의미하는지 한 문단 설명과 핵심 숫자.
- `쉽게 보기`: 검색어/캠페인/광고그룹/상품/타게팅별 한국어 컬럼 표.
- `문제 후보`: 이 보고서에서 규칙에 걸린 항목.
- `좋은 후보`: 확장 가능성이 있는 항목.
- `원본 보기`: 네이버 원문 컬럼과 첫 N행, 다운로드 이력.
- `컬럼 설명`: 원문 컬럼명, 한국어 표시명, 계산식, 주의사항.

---

## 11. Implementation Sessions

### Module 1. SaaS Shell and Empty States

- `/operations`를 SaaS형 검색광고 운영 화면으로 재구성.
- 브랜드/광고유형/기간 필터 UI.
- Search Ad 연결 상태 카드.
- 빈 데이터 상태를 깔끔하게 표시.

### Module 2. Search Ad Client and Read-only Sync

- HMAC signature client.
- campaign/adgroup/keyword pagination.
- report job 생성/조회/다운로드.
- generated report 목록 동기화.
- raw report file 저장.
- report parser. 파일에 헤더가 없으므로 `reportTp`별 컬럼 순서표와 컬럼 수 검증을 사용.
- master report 동기화. Campaign, Adgroup, Keyword, Ad, Criterion, ProductGroup은 구조/매핑 보조 데이터로 저장.
- stats 직접 조회는 당일/실행 전 보조로 제한.
- `NPLA_SCH_KEYWORD` 직접 조회는 보고서 보완용으로 제한.
- provider error normalization.

### Module 3. Report Repository and Brand Mapping

- Postgres schema.
- report job/file/raw row/normalized row 저장.
- brand mapping 설정.
- snapshot upsert.
- sync run log.

### Module 4. Rule Engine

- 저효율/무클릭/우수 분류.
- 브랜드별 threshold.
- 충분 클릭/노출 기준.
- 기간 기준: 최근 7일, 최근 30일, 시즌 윈도우, 60~90일 보조.
- `search_ad_rule_criteria` read model.
- rule result 저장.

### Module 5. Dashboard UI

- 보고서 보관함.
- 보고서 상세.
- 캠페인/광고그룹 표.
- 검색어 성과 표.
- 규칙 결과 카드.
- `성과 기준` 별도 페이지.
- 필터와 정렬.

### Module 6. Toggle Preview and Guarded Apply

- ON/OFF preview API.
- write gate closed 모의 실행.
- write gate open 실제 Search Ad update.
- action log.
- rollback helper.

### Module 7. Production Verification

- `marketcrew.app` 로그인 후 주요 화면 확인.
- `api.marketcrew.app` report sync/readiness 확인.
- `npm run smoke:prod`.

---

## 12. Open Questions

1. 커피프린트와 스티커씨 캠페인은 현재 캠페인명/광고그룹명 prefix로 구분 가능한가, 아니면 첫 화면에서 수동 매핑해야 하는가?
2. 브랜드별 목표 CPA/ROAS 기준은 같은가, 다르게 둘 것인가?
3. 첫 실행 범위는 캠페인/광고그룹 ON/OFF만 할 것인가, 키워드 ON/OFF까지 포함할 것인가?
4. `성과 기준` 화면의 첫 버전은 조회만 제공하고, 기준 수정은 다음 단계로 분리할 것인가?
