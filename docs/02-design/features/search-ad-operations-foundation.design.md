---
feature: search-ad-operations-foundation
project: marketcrew
version: 0.0.0-reboot
author: Codex
date: 2026-05-26
status: Draft
planningDoc: docs/01-plan/features/search-ad-operations-foundation.plan.md
selectedArchitecture: "Option C - Pragmatic Balance"
---

# search-ad-operations-foundation Design Document

> **Summary**: 커피프린트와 스티커씨의 네이버 파워링크·쇼핑검색광고를 보고서 기반으로 수집, 보관, 분류하고 안전하게 ON/OFF 운영할 수 있는 SaaS형 검색광고 운영 기반 설계다.
>
> **Project**: marketcrew
> **Version**: 0.0.0-reboot
> **Author**: Codex
> **Date**: 2026-05-26
> **Status**: Draft
> **Planning Doc**: [search-ad-operations-foundation.plan.md](../../01-plan/features/search-ad-operations-foundation.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema Definition | N/A |
| Phase 2 | Coding Conventions | N/A |
| Phase 3 | Mockup | N/A |
| Phase 4 | API Spec | This document | Draft |

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

## Design Anchor

이번 단계에서는 별도 Pencil 디자인 앵커를 잠그지 않는다. `DESIGN.md`의 reboot 방향과 이 문서의 Page UI Checklist를 기준으로 구현하고, 실제 화면을 만든 뒤 필요하면 `docs/02-design/styles/search-ad-operations-foundation.design-anchor.md`를 추가한다.

| Category | Tokens |
|----------|--------|
| **Colors** | 기존 `globals.css`의 밝은 업무형 팔레트 유지. 강조색은 `--brand`, 위험/주의는 분리 색상 추가. |
| **Typography** | 한국어 운영 화면 기준. 큰 히어로형 글자 대신 표, 카드, 필터에 맞는 작은 계층 사용. |
| **Spacing** | 8px 계열 간격, 카드 radius 8px 이하. |
| **Tone** | 광고 운영자가 빠르게 스캔하는 조용한 SaaS 화면. |
| **Layout** | 왼쪽 메뉴, 상단 필터, 본문 표/카드/상세 패널. |

---

## 1. Overview

### 1.1 Design Goals

- 네이버 Search Ad 보고서를 원본 그대로 저장하고, 화면/규칙 엔진용 정규화 데이터를 별도로 만든다.
- 커피프린트와 스티커씨를 최상위 운영 단위로 유지하고, 두 브랜드의 판단을 섞지 않는다.
- 파워링크와 쇼핑검색광고를 서로 다른 광고 유형으로 분리한다.
- LLM 호출 없이 규칙 엔진으로 저효율, 무클릭, 우수 후보를 먼저 추출한다.
- 캠페인/광고그룹 ON/OFF는 미리보기와 write gate를 통과한 뒤에만 실행한다.
- Vercel 화면은 브라우저용 앱과 로그인 게이트를 담당하고, Railway API가 DB, Search Ad API, 보고서 다운로드, 규칙 계산을 담당한다.

### 1.2 Design Principles

- **보고서 우선**: 전일 확정 성과, 검색어, 전환 상세는 `stat-reports` 다운로드를 기준으로 삼는다.
- **API 보조**: `/stats`와 관리 API는 현재 상태, 실행 전 영향 범위, ON/OFF 처리에 사용한다.
- **원본 보존**: 헤더 없는 탭 구분 원문을 Postgres에 보관하고, 파서 버전과 checksum을 같이 남긴다.
- **실행 분리**: 조회, 미리보기, 실제 실행 API를 분리한다.
- **한국어 화면**: 대표가 이해할 수 있는 화면 문구와 컬럼 설명을 제공한다.
- **나중에 LLM 연결 가능**: 규칙 결과를 `evidencePacket`으로 남겨 추후 LLM 설명/예외 검토에 연결한다.

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | 기존 `/operations`와 route handler 중심으로 빠르게 붙임 | domain/application/infrastructure를 엄격 분리하고 큐/스토리지 어댑터까지 선반영 | 도메인 규칙, 수집기, 저장소, 화면을 나누되 첫 구현 파일 수를 통제 |
| **New Files** | 약 12개 | 약 40개 | 약 27개 |
| **Modified Files** | 약 5개 | 약 10개 | 약 8개 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Medium | High | High |
| **Effort** | Low | High | Medium |
| **Risk** | 빠르지만 파서/규칙/실행 게이트 결합 위험 | 구조는 좋지만 첫 MVP 속도 저하 | 현재 reboot 기준선에 맞는 균형 |
| **Recommendation** | 임시 확인용 | 장기 플랫폼 재설계 | **선택** |

**Selected**: Option C - Pragmatic Balance

**Rationale**: 현재 저장소는 로그인, health, Railway bridge, Postgres 연결만 있는 얇은 기준선이다. 검색광고 운영은 보고서 다운로드, 파서, 정규화, 규칙 엔진, 실행 게이트가 서로 영향을 주므로 Minimal 방식은 금방 엉킬 가능성이 높다. 반대로 큐/스토리지/다계정 구조까지 먼저 분리하는 Clean Architecture는 첫 SaaS 화면을 늦춘다. 따라서 첫 구현은 명확한 경계를 갖되, Railway API 안의 동기식 수집과 Postgres 저장을 기본으로 두는 균형형 설계를 선택한다.

### 2.1 Component Diagram

```text
┌──────────────────────────────────────────────────────────┐
│ Browser                                                  │
│ - 대표 로그인                                            │
│ - /operations /reports /reports/[id] /rules              │
│ - 캠페인/광고그룹/검색어/실행 이력 화면                  │
└───────────────────────────────┬──────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────┐
│ Vercel Web                                                │
│ - 로그인 보호                                             │
│ - 같은 경로의 API 요청을 Railway API로 bridge              │
│ - 브라우저에는 DB/Search Ad secret 노출 금지               │
└───────────────────────────────┬──────────────────────────┘
                                │ MARKETCREW_BACKEND_API_TOKEN
                                ▼
┌──────────────────────────────────────────────────────────┐
│ Railway marketcrew-api                                    │
│ - Search Ad API client                                    │
│ - report sync / parser / normalizer                       │
│ - rules engine                                            │
│ - toggle preview / guarded apply                          │
│ - Postgres repository                                     │
└───────────────┬──────────────────────────────┬───────────┘
                │                              │
                ▼                              ▼
┌─────────────────────────────┐      ┌─────────────────────┐
│ Naver Search Ad API          │      │ Railway Postgres     │
│ /stat-reports                │      │ raw report text       │
│ /report-download             │      │ raw rows / normalized │
│ /master-reports              │      │ snapshots / logs      │
│ /ncc/campaigns/adgroups/...  │      │ rule results          │
│ /stats                       │      │ action previews/logs  │
└─────────────────────────────┘      └─────────────────────┘
```

### 2.2 Data Flow

```text
전일 보고서 수집
  -> GET /stat-reports 또는 POST /stat-reports
  -> BUILT 상태 확인
  -> downloadUrl path-only 서명으로 다운로드
  -> rawText/checksum 저장
  -> reportTp별 컬럼 순서표로 raw row 파싱
  -> 브랜드/광고유형 매핑
  -> normalized row 생성
  -> rules engine 실행
  -> 보고서/규칙 화면 read model 생성

현재 상태 수집
  -> /ncc/campaigns, /ncc/adgroups, /ncc/keywords
  -> userLock/status/statusReason 저장
  -> master report 또는 관리 API로 구조 보완
  -> 캠페인/광고그룹 화면 read model 생성

ON/OFF 실행
  -> 대표가 대상 선택
  -> toggle preview 생성
  -> before/after diff와 영향 범위 확인
  -> write gate 확인
  -> gate closed: 차단 로그만 저장
  -> gate open + 대표 확인: Search Ad update 호출
  -> action log와 provider response 저장
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|------------|---------|
| Vercel Web | `src/lib/backend/proxy.ts` | Railway API로 안전하게 위임 |
| Railway API routes | Auth/session, repository, Search Ad client | 수집/조회/실행 API |
| Search Ad client | HMAC signer, env vars | 네이버 API 인증 요청 |
| Report parser | report type schema | 헤더 없는 TSV 원문 파싱 |
| Normalizer | raw row, brand mapping | 화면/규칙 공통 형태 생성 |
| Rule engine | normalized rows, criteria | 성과 분류 |
| Toggle service | snapshots, env write gate | 미리보기와 실행 |
| UI pages | API read model | SaaS 화면 표시 |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
type BrandKey = "coffeeprint" | "stickersee";
type AdProductType = "powerlink" | "shopping_search";

interface SearchAdReportJob {
  id: string;
  providerReportJobId: string;
  reportType: SearchAdReportType;
  statDate: string;
  status: "REGIST" | "RUNNING" | "BUILT" | "NONE" | "ERROR" | "WAITING" | "AGGREGATING";
  downloadUrl?: string;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface SearchAdReportFile {
  id: string;
  reportJobId: string;
  storageBackend: "postgres";
  rawText: string;
  checksum: string;
  contentType: string;
  parserVersion: string;
  rowCount: number;
  createdAt: string;
}

interface SearchAdReportRow {
  id: string;
  reportFileId: string;
  rowNumber: number;
  rawRow: Record<string, string | number | null>;
  brandKey?: BrandKey;
  adProductType?: AdProductType;
  mappingStatus: "mapped" | "unmapped" | "ambiguous";
}

interface SearchAdNormalizedRow {
  id: string;
  reportRowId: string;
  reportType: SearchAdReportType;
  brandKey: BrandKey;
  adProductType: AdProductType;
  campaignId?: string;
  adgroupId?: string;
  keywordId?: string;
  searchTerm?: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  salesAmount: number;
  sourceDate: string;
}

interface SearchAdRuleResult {
  id: string;
  brandKey: BrandKey;
  adProductType: AdProductType;
  category: "low_efficiency" | "high_cpa" | "low_roas" | "no_click" | "good_performance" | "needs_review";
  targetType: "campaign" | "adgroup" | "keyword" | "search_term";
  targetId?: string;
  targetLabel: string;
  severity: "low" | "medium" | "high";
  periodDays: number;
  reason: string;
  metrics: Record<string, number | string | null>;
  evidencePacket: Record<string, unknown>;
  createdAt: string;
}
```

### 3.2 Entity Relationships

```text
ad_brand_mappings
  └── maps campaign/adgroup/keyword/provider labels to brand + ad product

search_ad_report_jobs 1 ──── 1 search_ad_report_files
search_ad_report_files 1 ── N search_ad_report_rows
search_ad_report_rows 1 ── 0..1 search_ad_report_normalized_rows
search_ad_report_normalized_rows N ── N search_ad_rule_results through evidence references

search_ad_campaign_snapshots 1 ── N search_ad_adgroup_snapshots
search_ad_adgroup_snapshots 1 ── N search_ad_keyword_snapshots

search_ad_action_previews 1 ── 0..1 search_ad_action_logs
```

### 3.3 Database Schema

첫 구현은 `db/workflow-store.sql`에 검색광고 전용 테이블을 추가한다. `workflow_records`는 reboot health와 임시 기록용으로 유지하지만, 검색광고 운영 데이터는 전용 테이블에 저장한다.

```sql
CREATE TABLE IF NOT EXISTS ad_brand_mappings (
  id TEXT PRIMARY KEY,
  brand_key TEXT NOT NULL CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT NOT NULL CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  provider_level TEXT NOT NULL CHECK (provider_level IN ('campaign', 'adgroup', 'keyword')),
  provider_id TEXT,
  match_type TEXT NOT NULL CHECK (match_type IN ('provider_id', 'name_prefix', 'name_contains', 'manual')),
  match_value TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'manual',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_ad_report_jobs (
  id TEXT PRIMARY KEY,
  provider_report_job_id TEXT NOT NULL UNIQUE,
  report_type TEXT NOT NULL,
  stat_date DATE NOT NULL,
  status TEXT NOT NULL,
  download_url TEXT,
  status_message TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_ad_report_files (
  id TEXT PRIMARY KEY,
  report_job_id TEXT NOT NULL REFERENCES search_ad_report_jobs(id) ON DELETE CASCADE,
  storage_backend TEXT NOT NULL DEFAULT 'postgres',
  raw_text TEXT NOT NULL,
  checksum TEXT NOT NULL,
  content_type TEXT,
  parser_version TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_job_id, checksum)
);

CREATE TABLE IF NOT EXISTS search_ad_report_rows (
  id TEXT PRIMARY KEY,
  report_file_id TEXT NOT NULL REFERENCES search_ad_report_files(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_row JSONB NOT NULL,
  brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  mapping_status TEXT NOT NULL DEFAULT 'unmapped',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_file_id, row_number)
);

CREATE TABLE IF NOT EXISTS search_ad_report_normalized_rows (
  id TEXT PRIMARY KEY,
  report_row_id TEXT NOT NULL REFERENCES search_ad_report_rows(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  brand_key TEXT NOT NULL CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT NOT NULL CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  campaign_id TEXT,
  campaign_name TEXT,
  adgroup_id TEXT,
  adgroup_name TEXT,
  keyword_id TEXT,
  keyword_text TEXT,
  search_term TEXT,
  impressions NUMERIC NOT NULL DEFAULT 0,
  clicks NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  conversions NUMERIC NOT NULL DEFAULT 0,
  sales_amount NUMERIC NOT NULL DEFAULT 0,
  source_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_ad_campaign_snapshots (
  id TEXT PRIMARY KEY,
  provider_campaign_id TEXT NOT NULL,
  brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  name TEXT NOT NULL,
  campaign_type TEXT,
  user_lock BOOLEAN,
  status TEXT,
  status_reason TEXT,
  raw_payload JSONB NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_campaign_id, collected_at)
);

CREATE TABLE IF NOT EXISTS search_ad_adgroup_snapshots (
  id TEXT PRIMARY KEY,
  provider_adgroup_id TEXT NOT NULL,
  provider_campaign_id TEXT,
  brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  name TEXT NOT NULL,
  adgroup_type TEXT,
  user_lock BOOLEAN,
  status TEXT,
  status_reason TEXT,
  bid_amount NUMERIC,
  daily_budget NUMERIC,
  raw_payload JSONB NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_adgroup_id, collected_at)
);

CREATE TABLE IF NOT EXISTS search_ad_keyword_snapshots (
  id TEXT PRIMARY KEY,
  provider_keyword_id TEXT NOT NULL,
  provider_adgroup_id TEXT,
  brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  keyword_text TEXT NOT NULL,
  user_lock BOOLEAN,
  status TEXT,
  status_reason TEXT,
  bid_amount NUMERIC,
  raw_payload JSONB NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_keyword_id, collected_at)
);

CREATE TABLE IF NOT EXISTS search_ad_rule_criteria (
  id TEXT PRIMARY KEY,
  brand_key TEXT NOT NULL CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT NOT NULL CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  period_days INTEGER NOT NULL,
  min_impressions NUMERIC NOT NULL DEFAULT 100,
  min_clicks NUMERIC NOT NULL DEFAULT 10,
  min_cost NUMERIC NOT NULL DEFAULT 10000,
  target_cpa NUMERIC,
  target_roas NUMERIC,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_ad_rule_results (
  id TEXT PRIMARY KEY,
  brand_key TEXT NOT NULL CHECK (brand_key IN ('coffeeprint', 'stickersee')),
  ad_product_type TEXT NOT NULL CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
  category TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  target_label TEXT NOT NULL,
  severity TEXT NOT NULL,
  period_days INTEGER NOT NULL,
  reason TEXT NOT NULL,
  metrics JSONB NOT NULL,
  evidence_packet JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_ad_action_previews (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('campaign', 'adgroup')),
  target_id TEXT NOT NULL,
  requested_action TEXT NOT NULL CHECK (requested_action IN ('turn_on', 'turn_off')),
  before_state JSONB NOT NULL,
  after_state JSONB NOT NULL,
  impact_summary JSONB NOT NULL,
  write_gate_open BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_ad_action_logs (
  id TEXT PRIMARY KEY,
  preview_id TEXT NOT NULL REFERENCES search_ad_action_previews(id),
  status TEXT NOT NULL CHECK (status IN ('blocked', 'applied', 'failed')),
  provider_request JSONB,
  provider_response JSONB,
  error_message TEXT,
  actor TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

주요 인덱스:

```sql
CREATE INDEX IF NOT EXISTS search_ad_report_jobs_stat_date_idx
  ON search_ad_report_jobs (stat_date DESC, report_type);

CREATE INDEX IF NOT EXISTS search_ad_normalized_brand_type_date_idx
  ON search_ad_report_normalized_rows (brand_key, ad_product_type, source_date DESC);

CREATE INDEX IF NOT EXISTS search_ad_rule_results_brand_category_idx
  ON search_ad_rule_results (brand_key, ad_product_type, category, created_at DESC);

CREATE INDEX IF NOT EXISTS search_ad_campaign_latest_idx
  ON search_ad_campaign_snapshots (provider_campaign_id, collected_at DESC);

CREATE INDEX IF NOT EXISTS search_ad_adgroup_latest_idx
  ON search_ad_adgroup_snapshots (provider_adgroup_id, collected_at DESC);
```

---

## 4. API Specification

### 4.1 Endpoint List

모든 엔드포인트는 대표 로그인 보호를 받는다. Vercel에서는 같은 path로 들어온 요청을 `proxyRequestToBackend`가 Railway API로 전달한다. Railway API runtime에서는 직접 처리한다.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/search-ad/overview` | 운영 홈 read model | Required |
| POST | `/api/search-ad/sync` | 캠페인/광고그룹/키워드 read-only 상태 수집 | Required |
| GET | `/api/search-ad/reports` | 보고서 보관함 목록 | Required |
| POST | `/api/search-ad/reports/sync` | 보고서 작업 조회/생성/다운로드/파싱 | Required |
| GET | `/api/search-ad/reports/[id]` | 보고서 상세 read model | Required |
| GET | `/api/search-ad/rule-criteria` | 성과 기준 조회 | Required |
| POST | `/api/search-ad/rules/run` | 저장된 보고서 기준 규칙 엔진 실행 | Required |
| GET | `/api/search-ad/rule-results` | 규칙 결과 목록 | Required |
| POST | `/api/search-ad/toggle-preview` | 캠페인/광고그룹 ON/OFF 미리보기 생성 | Required |
| POST | `/api/search-ad/toggle-apply` | write gate 통과 시 실제 ON/OFF 실행 | Required |
| GET | `/api/search-ad/action-logs` | 실행/차단/실패 이력 | Required |

### 4.2 Detailed Specification

#### `GET /api/search-ad/overview`

Query:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `brand` | `all` \| `coffeeprint` \| `stickersee` | No | 브랜드 필터. `all`은 합산 현황만 표시한다. |
| `adProduct` | `all` \| `powerlink` \| `shopping_search` | No | 광고 유형 필터 |

Response:

```json
{
  "ok": true,
  "data": {
    "filters": {
      "brand": "all",
      "adProduct": "all"
    },
    "syncStatus": {
      "lastReportSyncAt": "2026-05-26T07:05:00+09:00",
      "lastStateSyncAt": "2026-05-26T07:10:00+09:00",
      "hasSearchAdCredentials": true,
      "searchAdWriteEnabled": false
    },
    "summaryCards": [
      {
        "key": "low_efficiency",
        "label": "저효율 후보",
        "count": 12
      }
    ],
    "brandSummaries": [],
    "recentRuleResults": [],
    "recentReports": [],
    "pendingActions": []
  }
}
```

#### `POST /api/search-ad/reports/sync`

Request:

```json
{
  "statDate": "2026-05-25",
  "reportTypes": ["AD", "EXPKEYWORD", "SHOPPINGKEYWORD_DETAIL"],
  "mode": "list-and-download-built"
}
```

Rules:

- `GET /stat-reports`에서 이미 생성된 `BUILT` 작업을 우선 가져온다.
- 필요한 보고서가 없으면 `POST /stat-reports`로 생성한다.
- 다운로드는 API 응답의 `downloadUrl`을 그대로 사용하고, 서명 URI는 query string 없는 `/report-download`로 만든다.
- 다운로드 파일은 headerless TSV로 처리한다.

Response:

```json
{
  "ok": true,
  "data": {
    "statDate": "2026-05-25",
    "jobsSeen": 10,
    "downloaded": 8,
    "parsed": 8,
    "failed": []
  }
}
```

#### `GET /api/search-ad/reports/[id]`

Response:

```json
{
  "ok": true,
  "data": {
    "report": {
      "id": "report-177442248",
      "providerReportJobId": "177442248",
      "reportType": "EXPKEYWORD",
      "displayName": "파워링크 검색어 보고서",
      "statDate": "2026-05-25",
      "rowCount": 321
    },
    "summary": {
      "totalCost": 120000,
      "clicks": 320,
      "conversions": 7,
      "salesAmount": 450000
    },
    "easyRows": [],
    "rawPreviewRows": [],
    "columnDescriptions": [],
    "problemCandidates": [],
    "goodCandidates": []
  }
}
```

#### `POST /api/search-ad/toggle-preview`

Request:

```json
{
  "targetType": "adgroup",
  "targetId": "grp-a001",
  "action": "turn_off"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "previewId": "preview-001",
    "writeGateOpen": false,
    "beforeState": {
      "userLock": false
    },
    "afterState": {
      "userLock": true
    },
    "impactSummary": {
      "brand": "스티커씨",
      "adProduct": "파워링크",
      "recentCost": 45000,
      "recentClicks": 100,
      "recentConversions": 0
    }
  }
}
```

#### `POST /api/search-ad/toggle-apply`

Request:

```json
{
  "previewId": "preview-001",
  "confirmText": "실행"
}
```

Response when gate closed:

```json
{
  "ok": false,
  "code": "SEARCH_AD_WRITE_GATE_CLOSED",
  "message": "검색광고 실제 변경 권한이 닫혀 있어 실행하지 않았습니다."
}
```

### 4.3 Error Response Format

```json
{
  "ok": false,
  "code": "SEARCH_AD_REPORT_DOWNLOAD_FAILED",
  "message": "네이버 보고서를 다운로드하지 못했습니다.",
  "details": {
    "reportJobId": "177442248"
  }
}
```

---

## 5. UI/UX Design

### 5.1 Screen Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ 상단: 마켓크루 / 현재 브랜드 / 마지막 수집 / 로그아웃       │
├──────────────┬──────────────────────────────────────────────┤
│ 왼쪽 메뉴     │ 상단 필터: 브랜드 / 광고유형 / 수집 버튼     │
│ 운영 홈       ├──────────────────────────────────────────────┤
│ 보고서        │ 본문: 요약 카드, 표, 규칙 결과, 실행 패널     │
│ 캠페인        │                                              │
│ 광고그룹      │                                              │
│ 검색어 성과   │                                              │
│ 규칙 결과     │                                              │
│ 성과 기준     │                                              │
│ 실행 이력     │                                              │
│ 설정          │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### 5.2 User Flow

```text
로그인
  -> 운영 홈에서 수집 상태 확인
  -> 보고서 수집 실행 또는 전일 보고서 확인
  -> 검색어 성과/규칙 결과 확인
  -> 캠페인/광고그룹 목록에서 대상 선택
  -> ON/OFF 미리보기
  -> write gate closed면 차단 이력 확인
  -> write gate open이면 대표 확인 후 실행
  -> 실행 이력과 다음날 보고서로 결과 확인
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `MarketingShell` | `src/components/layout/MarketingShell.tsx` | 왼쪽 메뉴와 상단 필터가 있는 공통 앱 프레임 |
| `SearchAdTopFilters` | `src/components/search-ad/SearchAdTopFilters.tsx` | 브랜드/광고유형 필터 |
| `SyncStatusStrip` | `src/components/search-ad/SyncStatusStrip.tsx` | 보고서/상태 수집 시간과 실패 안내 |
| `SummaryMetricCard` | `src/components/search-ad/SummaryMetricCard.tsx` | 운영 홈 숫자 카드 |
| `ReportArchiveTable` | `src/components/reports/ReportArchiveTable.tsx` | 보고서 보관함 목록 |
| `ReportSummaryPanel` | `src/components/reports/ReportSummaryPanel.tsx` | 보고서 상세 요약 |
| `ReportEasyTable` | `src/components/reports/ReportEasyTable.tsx` | 한국어 컬럼 표 |
| `RawReportPreview` | `src/components/reports/RawReportPreview.tsx` | 원문 행 미리보기 |
| `RuleResultCard` | `src/components/search-ad/RuleResultCard.tsx` | 저효율/무클릭/우수 후보 카드 |
| `CampaignStatusTable` | `src/components/search-ad/CampaignStatusTable.tsx` | 캠페인 상태와 ON/OFF 진입 |
| `AdgroupStatusTable` | `src/components/search-ad/AdgroupStatusTable.tsx` | 광고그룹 상태와 ON/OFF 진입 |
| `TogglePreviewDialog` | `src/components/search-ad/TogglePreviewDialog.tsx` | 변경 전/후와 영향 범위 확인 |
| `RuleCriteriaTable` | `src/components/search-ad/RuleCriteriaTable.tsx` | 성과 기준 화면 |
| `ActionLogTable` | `src/components/search-ad/ActionLogTable.tsx` | 실행/차단/실패 이력 |

### 5.4 Page UI Checklist

#### `/operations` 운영 홈

- [ ] 왼쪽 메뉴: 운영 홈, 보고서, 캠페인, 광고그룹, 검색어 성과, 규칙 결과, 성과 기준, 실행 이력, 설정.
- [ ] 상단 필터: 브랜드 `전체`, `커피프린트`, `스티커씨`.
- [ ] 상단 필터: 광고유형 `전체`, `파워링크`, `쇼핑검색광고`.
- [ ] 버튼: `보고서 수집`, `상태 새로고침`.
- [ ] 상태 띠: 마지막 보고서 수집 시간, 마지막 상태 수집 시간, Search Ad 연결 여부, 실제 변경 권한 상태.
- [ ] 카드: 저효율 후보 수, 클릭 없는 후보 수, 우수 후보 수, 실행 대기/차단 수.
- [ ] 표: 최근 보고서 5건.
- [ ] 표: 최근 규칙 결과 10건.
- [ ] 안내: write gate가 닫힌 경우 “실제 광고 변경은 차단됨” 표시.

#### `/reports` 보고서 보관함

- [ ] 필터: 기준일, 보고서 종류, 브랜드, 광고유형, 파싱 상태.
- [ ] 버튼: `전일 보고서 가져오기`, `선택 보고서 다시 파싱`.
- [ ] 표 컬럼: 기준일, 보고서 종류, 네이버 보고서 ID, 상태, 원본 보관, 파싱 상태, 행 수, 브랜드 매핑 상태, 마지막 수집.
- [ ] 요약 칩: 총 비용, 클릭, 전환, 매출, 저효율 후보 수, 우수 후보 수.
- [ ] 링크: 보고서 상세.
- [ ] 빈 상태: 보고서 없음, API 설정 필요, 파싱 실패를 각각 다르게 표시.

#### `/reports/[id]` 보고서 상세

- [ ] 헤더: 보고서 이름, 기준일, 네이버 보고서 ID, 상태, 행 수.
- [ ] 탭: 요약, 쉽게 보기, 문제 후보, 좋은 후보, 원본 보기, 컬럼 설명.
- [ ] 요약 카드: 비용, 노출, 클릭, 전환, 매출, CPA, ROAS.
- [ ] 쉽게 보기 표: 한국어 컬럼명, 정렬, 브랜드/광고유형 필터.
- [ ] 문제 후보 카드: 분류, 이유, 기준 기간, 주요 지표, 근거 행 링크.
- [ ] 좋은 후보 카드: 확장 이유, 주요 지표, 근거 행 링크.
- [ ] 원본 보기: 원문 필드명과 첫 100행 미리보기.
- [ ] 컬럼 설명: 원문 필드, 한국어 이름, 계산식, 주의사항.

#### `/campaigns` 캠페인

- [ ] 필터: 브랜드, 광고유형, 상태.
- [ ] 표 컬럼: 캠페인명, 브랜드, 광고유형, ON/OFF, 상태 사유, 최근 비용, 최근 클릭, 최근 전환, 마지막 수집.
- [ ] 버튼: 켜기/끄기 미리보기.
- [ ] 배지: 매핑 필요, 수집 오래됨, 실행 차단.

#### `/adgroups` 광고그룹

- [ ] 필터: 브랜드, 광고유형, 캠페인, 상태.
- [ ] 표 컬럼: 광고그룹명, 캠페인명, 브랜드, 광고유형, ON/OFF, 상태 사유, 입찰/예산 요약, 최근 성과.
- [ ] 버튼: 켜기/끄기 미리보기.
- [ ] 배지: 기기/시간대 기준 점검 필요.

#### `/search-terms` 검색어 성과

- [ ] 필터: 브랜드, 광고유형, 보고서 기준일, 분류.
- [ ] 표 컬럼: 검색어, 캠페인, 광고그룹, 비용, 클릭, 전환, 매출, CPA, ROAS, 분류.
- [ ] 안내: 쇼핑검색광고 검색어는 클릭 1회 이상 중심으로 제공되며, 클릭 없음은 키워드/광고그룹 기준에서 판단.
- [ ] 링크: 연결 보고서 상세.

#### `/rule-results` 규칙 결과

- [ ] 탭: 저효율, 높은 CPA, 낮은 ROAS, 클릭 없음, 우수, 점검 필요.
- [ ] 카드: 대상명, 분류 이유, 기준 기간, 주요 지표, 제안 상태.
- [ ] 버튼: 캠페인/광고그룹 대상이면 미리보기 열기.
- [ ] 링크: 근거 보고서와 원문 행.

#### `/rules` 성과 기준

- [ ] 표: 브랜드별 기준, 광고유형, 기간, 최소 노출, 최소 클릭, 최소 비용, 목표 CPA, 목표 ROAS.
- [ ] 설명 카드: 최근 30일 기본 판단, 최근 7일 이상 감지, 시즌 윈도우, 60~90일 보조 기준.
- [ ] 설명 카드: 저효율, 높은 CPA, 낮은 ROAS, 클릭 없음, 우수, 점검 필요 계산식.
- [ ] 안내: 첫 버전은 조회 중심이며 기준 수정은 다음 단계에서 추가.

#### `/action-logs` 실행 이력

- [ ] 필터: 상태 `차단`, `실행`, `실패`, 브랜드, 광고유형.
- [ ] 표 컬럼: 실행 시간, 대상, 요청 작업, 결과, actor, provider 응답 요약.
- [ ] 상세: before/after diff, 영향 범위, 실패 원인.

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| `UNAUTHORIZED` | 로그인이 필요합니다. | 세션 없음 | `/login`으로 이동 |
| `BACKEND_UNAVAILABLE` | Railway 백엔드 API 응답을 받지 못했습니다. | Vercel bridge 실패 | 화면에 재시도 안내 |
| `SEARCH_AD_CREDENTIALS_MISSING` | 네이버 검색광고 API 설정이 필요합니다. | env 누락 | 설정 화면으로 안내 |
| `SEARCH_AD_REQUEST_FAILED` | 네이버 검색광고 API 요청에 실패했습니다. | API 오류, 인증 오류 | provider code와 요청 path를 서버 로그와 수집 상태에 저장 |
| `SEARCH_AD_REPORT_NOT_READY` | 보고서가 아직 생성 중입니다. | status가 `BUILT` 아님 | 다음 poll 또는 수동 재시도 |
| `SEARCH_AD_REPORT_DOWNLOAD_FAILED` | 네이버 보고서를 다운로드하지 못했습니다. | 서명, 권한, URL 문제 | reportJobId와 오류 저장 |
| `SEARCH_AD_REPORT_PARSE_FAILED` | 보고서를 해석하지 못했습니다. | 컬럼 수 불일치, 알 수 없는 reportTp | rawText 보존, 파싱 실패 표시 |
| `BRAND_MAPPING_REQUIRED` | 브랜드 매핑이 필요합니다. | 캠페인/광고그룹이 미분류 | 매핑 화면으로 안내 |
| `SEARCH_AD_WRITE_GATE_CLOSED` | 검색광고 실제 변경 권한이 닫혀 있어 실행하지 않았습니다. | env gate false | 차단 로그 저장 |
| `SEARCH_AD_PROVIDER_WRITE_FAILED` | 네이버 광고 상태 변경에 실패했습니다. | provider update 실패 | 실패 로그와 rollback 안내 |

### 6.2 Error Response Format

```json
{
  "ok": false,
  "code": "SEARCH_AD_REPORT_PARSE_FAILED",
  "message": "보고서를 해석하지 못했습니다.",
  "details": {
    "reportType": "EXPKEYWORD",
    "expectedColumns": 12,
    "actualColumns": 11
  }
}
```

---

## 7. Security Considerations

- [ ] 브라우저에 네이버 API key, secret, customer id, DB URL을 노출하지 않는다.
- [ ] Hosted Vercel은 Railway API token 없이 backend route를 호출할 수 없다.
- [ ] 모든 검색광고 API route는 대표 로그인과 backend token 보호를 통과해야 한다.
- [ ] 실제 ON/OFF는 `SEARCH_AD_WRITE_ENABLED=1` 또는 `NAVER_SEARCH_AD_WRITE_ENABLED=1`일 때만 provider 호출한다.
- [ ] `toggle-apply`는 `previewId`, `confirmText`, 대상 상태 재조회 또는 최신 snapshot 검증을 요구한다.
- [ ] raw report text는 운영 DB에 저장하지만 화면에는 필요한 미리보기만 보여준다.
- [ ] provider 오류 응답은 화면에 필요한 메시지만 노출하고, secret을 포함한 header는 저장하지 않는다.
- [ ] SQL은 parameterized query로 작성한다.
- [ ] 보고서 다운로드 URL은 API 응답값만 사용하고 임의 authtoken을 받지 않는다.
- [ ] destructive reset과 provider write는 일반 sync와 분리된 API로 유지한다.

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L1: API Tests | Search Ad report sync, overview, reports, rules, toggle preview/apply | Vitest + route handler tests + curl smoke | Do |
| L2: UI Action Tests | 운영 홈, 보고서 보관함, 보고서 상세, 성과 기준, 실행 미리보기 | Playwright | Do |
| L3: E2E Scenario Tests | 로그인 후 보고서 확인, 규칙 결과 확인, write gate 차단 확인 | Playwright + production smoke | Do/Check |

### 8.2 L1: API Test Scenarios

| # | Endpoint | Method | Test Description | Expected Status | Expected Response |
|---|----------|--------|------------------|:--------------:|-------------------|
| 1 | `/api/search-ad/overview` | GET | 빈 DB에서도 운영 홈 read model 반환 | 200 | `.ok=true`, `.data.summaryCards` 존재 |
| 2 | `/api/search-ad/reports` | GET | 보고서 보관함 목록 반환 | 200 | `.data.reports` 배열 |
| 3 | `/api/search-ad/reports/sync` | POST | Search Ad env 없음 | 503 | `SEARCH_AD_CREDENTIALS_MISSING` |
| 4 | `/api/search-ad/reports/sync` | POST | fixture TSV 파싱 | 200 | downloaded/parsed count 증가 |
| 5 | `/api/search-ad/reports/[id]` | GET | 보고서 상세 반환 | 200 | summary, easyRows, rawPreviewRows, columnDescriptions |
| 6 | `/api/search-ad/rule-criteria` | GET | 기본 성과 기준 반환 | 200 | coffeeprint/stickersee 기준 존재 |
| 7 | `/api/search-ad/rules/run` | POST | fixture row로 저효율/우수 후보 생성 | 200 | `.data.createdResults > 0` |
| 8 | `/api/search-ad/toggle-preview` | POST | 캠페인 끄기 미리보기 생성 | 200 | beforeState/afterState/impactSummary |
| 9 | `/api/search-ad/toggle-apply` | POST | write gate 닫힘 | 409 | `SEARCH_AD_WRITE_GATE_CLOSED`, action log blocked |
| 10 | `/api/backend/health` | GET | 기존 health 유지 | 200/503 | providerKeys.searchAd 포함 |

### 8.3 L2: UI Action Test Scenarios

| # | Page | Action | Expected Result | Data Verification |
|---|------|--------|----------------|-------------------|
| 1 | `/operations` | 페이지 로드 | 왼쪽 메뉴, 상단 필터, 요약 카드 표시 | empty state도 깨지지 않음 |
| 2 | `/operations` | 브랜드 필터 클릭 | URL query 또는 화면 상태 변경 | 결과 목록이 브랜드 기준으로 바뀜 |
| 3 | `/reports` | 전일 보고서 가져오기 클릭 | 수집 시작 또는 env 필요 메시지 | API 호출 발생 |
| 4 | `/reports/[id]` | 탭 전환 | 요약/쉽게 보기/원본/컬럼 설명 표시 | 같은 보고서 ID 유지 |
| 5 | `/rules` | 페이지 로드 | 기간/표본/CPA/ROAS 기준 표시 | 한국어 문구만 노출 |
| 6 | `/campaigns` | 끄기 미리보기 클릭 | 변경 전/후 dialog 표시 | provider write는 실행되지 않음 |

### 8.4 L3: E2E Scenario Test Scenarios

| # | Scenario | Steps | Success Criteria |
|---|----------|-------|-----------------|
| 1 | 보고서 기반 운영 확인 | 로그인 -> 보고서 -> 상세 -> 규칙 결과 | 보고서 요약과 근거 행이 이어진다 |
| 2 | 브랜드 분리 확인 | 운영 홈 -> 커피프린트 필터 -> 스티커씨 필터 | 두 브랜드 결과가 서로 비교 랭킹으로 표현되지 않는다 |
| 3 | write gate 차단 확인 | 캠페인 -> 끄기 미리보기 -> 실행 | gate closed 상태에서 provider 호출 없이 차단 로그 생성 |
| 4 | production smoke | `npm run smoke:prod` | app/api health와 로그인 보호 확인 |

### 8.5 Seed Data Requirements

| Entity | Minimum Count | Key Fields Required |
|--------|:------------:|---------------------|
| `ad_brand_mappings` | 4 | 브랜드 2개 x 광고유형 2개 기본 prefix/manual 매핑 |
| `search_ad_report_jobs` | 3 | `AD`, `EXPKEYWORD`, `SHOPPINGKEYWORD_DETAIL` |
| `search_ad_report_rows` | 30 | 비용/클릭/전환/매출이 섞인 fixture |
| `search_ad_campaign_snapshots` | 4 | ON/OFF 상태가 다른 캠페인 |
| `search_ad_adgroup_snapshots` | 8 | 브랜드/광고유형 매핑된 광고그룹 |
| `search_ad_rule_criteria` | 4 | 브랜드 2개 x 광고유형 2개 |
| `search_ad_rule_results` | 6 | 저효율/무클릭/우수 각각 포함 |

---

## 9. Clean Architecture

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|----------------|----------|
| Presentation | Next pages, route-local components, forms, tables | `src/app/`, `src/components/` |
| Application | 운영 화면 read model, 수집 orchestration, toggle use case | `src/features/search-ad/`, `src/server/search-ad/` |
| Domain | report type, parser schemas, rule criteria/result, pure rule engine | `src/features/search-ad/domain/` |
| Infrastructure | Naver API client, signer, Postgres repository, backend proxy | `src/lib/integrations/search-ad/`, `src/lib/persistence/` |

### 9.2 Dependency Rules

```text
Presentation -> Application -> Domain
Application -> Infrastructure -> Domain
Domain -> no React, no fetch, no env, no DB
Infrastructure -> provider/DB details, no React page imports
```

### 9.3 File Import Rules

| From | Can Import | Cannot Import |
|------|------------|---------------|
| `src/app/**` | components, feature read models, route handlers | direct `pg`, Search Ad secret client in client components |
| `src/components/**` | display types, small formatters | DB repository, provider client |
| `src/features/search-ad/domain/**` | local pure helpers and types | `next`, `pg`, `fetch`, `process.env` |
| `src/server/search-ad/**` | domain, repository, Search Ad client | React components |
| `src/lib/integrations/search-ad/**` | signer, provider types | presentation/application UI |
| `src/lib/persistence/**` | `pg`, domain records | React components |

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| Report type schemas | Domain | `src/features/search-ad/domain/reportColumnSchemas.ts` |
| Parser | Domain | `src/features/search-ad/domain/parseSearchAdReport.ts` |
| Rule engine | Domain | `src/features/search-ad/domain/searchAdRules.ts` |
| Overview builder | Application | `src/features/search-ad/buildSearchAdOperationsView.ts` |
| Report detail builder | Application | `src/features/search-ad/buildSearchAdReportView.ts` |
| Report sync service | Application | `src/server/search-ad/reportSync.ts` |
| State sync service | Application | `src/server/search-ad/stateSync.ts` |
| Toggle service | Application | `src/server/search-ad/toggleSearchAdState.ts` |
| Search Ad client | Infrastructure | `src/lib/integrations/search-ad/client.ts` |
| Search Ad signer | Infrastructure | `src/lib/integrations/search-ad/signer.ts` |
| Repository | Infrastructure | `src/lib/persistence/searchAdRepository.ts` |
| Shared shell | Presentation | `src/components/layout/MarketingShell.tsx` |
| Report UI | Presentation | `src/components/reports/*` |
| Search Ad UI | Presentation | `src/components/search-ad/*` |

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `ReportArchiveTable` |
| Functions | camelCase | `parseSearchAdReport` |
| Constants | UPPER_SNAKE_CASE | `SEARCH_AD_REPORT_PARSER_VERSION` |
| Types/Interfaces | PascalCase | `SearchAdRuleResult` |
| Component files | PascalCase.tsx | `CampaignStatusTable.tsx` |
| Utility files | camelCase.ts | `buildSearchAdOperationsView.ts` |
| Folders | kebab-case | `search-ad/` |

### 10.2 Import Order

```typescript
// 1. External libraries
import { NextResponse } from "next/server";

// 2. Internal absolute imports
import { buildSearchAdOperationsView } from "@/features/search-ad/buildSearchAdOperationsView";

// 3. Relative imports
import { SEARCH_AD_REPORT_TYPES } from "./reportTypes";

// 4. Type imports
import type { SearchAdReportType } from "./types";
```

### 10.3 Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `MARKETCREW_DATABASE_URL` or `DATABASE_URL` | Railway API only | Postgres connection |
| `MARKETCREW_BACKEND_API_URL` | Vercel only | Railway API base URL |
| `MARKETCREW_BACKEND_API_TOKEN` | Vercel only | Vercel -> Railway bridge token |
| `MARKETCREW_API_TOKEN` | Railway API only | Bridge token validation |
| `NAVER_SEARCH_AD_ACCESS_LICENSE` | Railway API only | Search Ad API key |
| `NAVER_SEARCH_AD_SECRET_KEY` | Railway API only | HMAC signing secret |
| `NAVER_SEARCH_AD_CUSTOMER_ID` | Railway API only | advertiser/customer id |
| `SEARCH_AD_WRITE_ENABLED` | Railway API only | Search Ad provider write gate |
| `NAVER_SEARCH_AD_WRITE_ENABLED` | Railway API only | Search Ad provider write gate alias |

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|--------------------|
| Visible copy | 한국어 우선. provider 고유 reportTp는 설명 문구와 함께 표시 |
| Report type IDs | Naver API 값 유지: `AD`, `EXPKEYWORD`, `SHOPPINGKEYWORD_DETAIL` |
| Brand keys | Internal `coffeeprint`, `stickersee`; UI `커피프린트`, `스티커씨` |
| Write actions | UI `켜기`, `끄기`; internal `turn_on`, `turn_off` |
| Date handling | 보고서 기준일은 `YYYY-MM-DD`, 수집 시각은 ISO string |
| Tests | domain pure test 먼저, route/UI test는 seed fixture 사용 |

---

## 11. Implementation Guide

### 11.1 File Structure

```text
src/
  app/
    operations/page.tsx
    reports/page.tsx
    reports/[id]/page.tsx
    campaigns/page.tsx
    adgroups/page.tsx
    search-terms/page.tsx
    rule-results/page.tsx
    rules/page.tsx
    action-logs/page.tsx
    api/search-ad/
      overview/route.ts
      sync/route.ts
      reports/route.ts
      reports/sync/route.ts
      reports/[id]/route.ts
      rule-criteria/route.ts
      rules/run/route.ts
      rule-results/route.ts
      toggle-preview/route.ts
      toggle-apply/route.ts
      action-logs/route.ts
  components/
    layout/MarketingShell.tsx
    reports/
    search-ad/
  features/
    search-ad/
      buildSearchAdOperationsView.ts
      buildSearchAdReportView.ts
      domain/
        types.ts
        reportTypes.ts
        reportColumnSchemas.ts
        parseSearchAdReport.ts
        normalizeSearchAdReportRows.ts
        searchAdRules.ts
  lib/
    integrations/search-ad/
      signer.ts
      client.ts
      reports.ts
      management.ts
      stats.ts
    persistence/
      postgres.ts
      searchAdRepository.ts
  server/
    search-ad/
      reportSync.ts
      stateSync.ts
      ruleRunner.ts
      toggleSearchAdState.ts
tests/
  search-ad/
    parseSearchAdReport.test.ts
    searchAdRules.test.ts
    reportSync.test.ts
    toggleSearchAdState.test.ts
```

### 11.2 Implementation Order

1. [ ] 공통 앱 셸과 route skeleton 생성.
2. [ ] DB schema와 Postgres helper 추가.
3. [ ] Search Ad signer/client 구현.
4. [ ] report type map, column schemas, parser fixture 테스트 구현.
5. [ ] report sync service와 `/api/search-ad/reports/sync`.
6. [ ] report repository와 `/reports`, `/reports/[id]` 화면.
7. [ ] 캠페인/광고그룹/키워드 상태 sync와 목록 화면.
8. [ ] rule criteria seed와 rule engine.
9. [ ] `/rules`, `/rule-results`, `/search-terms` 화면.
10. [ ] toggle preview API와 dialog.
11. [ ] toggle apply API. gate closed 테스트를 먼저 통과시킨 뒤, provider write path는 env gate 뒤에 둔다.
12. [ ] local test/typecheck/build.
13. [ ] GitHub push, Vercel/Railway deploy 확인, `npm run smoke:prod`.

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| 앱 셸과 기본 화면 | `module-1` | SaaS 좌측 메뉴, 상단 필터, 운영 홈 empty/data state | 1-2 |
| DB와 저장소 | `module-2` | schema, Postgres helper, repository, seed fixture | 1-2 |
| Search Ad 읽기 클라이언트 | `module-3` | HMAC signer, report list/download, management read-only | 2-3 |
| 보고서 파서와 보관함 | `module-4` | reportTp schema, TSV parser, reports API/UI/detail | 2-3 |
| 상태 수집과 캠페인/광고그룹 화면 | `module-5` | campaigns/adgroups/keywords sync, status tables | 2 |
| 규칙 엔진과 성과 기준 | `module-6` | criteria, 저효율/무클릭/우수 분류, `/rules`, `/rule-results` | 2-3 |
| 실행 미리보기와 write gate | `module-7` | toggle preview, gate closed apply, action logs | 2 |
| 운영 검증과 배포 | `module-8` | tests, typecheck, build, prod smoke, live check | 1-2 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Design | 전체 | 현재 |
| Session 2 | Do | `--scope module-1,module-2` | 3-4 |
| Session 3 | Do | `--scope module-3,module-4` | 4-6 |
| Session 4 | Do | `--scope module-5,module-6` | 4-5 |
| Session 5 | Do | `--scope module-7,module-8` | 3-4 |
| Session 6 | Check/QA/Report | 전체 | 2-3 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-26 | Initial design draft from PDCA plan | Codex |
