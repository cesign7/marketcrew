---
feature: search-ad-operations-foundation
project: marketcrew
version: 0.0.0-reboot
author: Codex
date: 2026-05-26
status: Implemented
scope: module-1,module-2,module-3,module-4,module-5,module-6,module-7,module-8
designDoc: docs/02-design/features/search-ad-operations-foundation.design.md
---

# search-ad-operations-foundation Do

> **Summary**: 검색광고 운영 기반의 전체 Do 범위로 SaaS 앱 셸, DB/저장소, Search Ad read-only 클라이언트, 보고서 파서/보관함, 상태 수집, 규칙 엔진, 실행 미리보기/write gate, 운영 배포 검증을 구현했다.

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

## Session Scope

| Module | Scope Key | Status |
|--------|-----------|:------:|
| 앱 셸과 기본 화면 | `module-1` | 완료 |
| DB와 저장소 | `module-2` | 완료 |
| Search Ad 읽기 클라이언트 | `module-3` | 완료 |
| 보고서 파서와 보관함 | `module-4` | 완료 |
| 상태 수집과 캠페인/광고그룹 화면 | `module-5` | 완료 |
| 규칙 엔진과 성과 기준 | `module-6` | 완료 |
| 실행 미리보기와 write gate | `module-7` | 완료 |
| 운영 검증과 배포 | `module-8` | 완료 |

---

## Upstream Context Chain

| Document | Path | Key Context |
|----------|------|-------------|
| PRD | 없음 | 이번 기능은 reboot 이후 Plan에서 직접 시작했다. |
| Plan | `docs/01-plan/features/search-ad-operations-foundation.plan.md` | 보고서 기반 수집, 브랜드 분리, 광고유형 분리, LLM 전 규칙 엔진 우선. |
| Design | `docs/02-design/features/search-ad-operations-foundation.design.md` | Option C - Pragmatic Balance. Next 화면과 Railway API/DB 근접 처리를 나누되 첫 구현은 동기식으로 작게 시작한다. |

### Decision Record Chain

| Source | Decision | Rationale |
|--------|----------|-----------|
| [Plan] | 보고서 기반 성과를 1차 원천으로 둔다. | 전일 확정 성과를 안정적으로 저장하고 API 직접 조회 한도와 복잡도를 줄인다. |
| [Plan] | 커피프린트와 스티커씨는 최상위 브랜드로 분리한다. | 두 사업을 서로 비교하지 않고 각 브랜드 안에서 광고 유형을 운영한다. |
| [Design] | Option C - Pragmatic Balance를 선택했다. | SaaS 화면을 빠르게 만들면서도 domain, persistence, integration 경계를 유지한다. |
| [Design] | 실제 provider write는 module-7 전까지 구현하지 않는다. | ON/OFF는 광고 노출에 직접 영향을 주므로 미리보기, gate, 로그가 먼저 필요하다. |

---

## Implemented Scope

### module-1 앱 셸과 기본 화면

- 왼쪽 메뉴 기반 SaaS 셸을 추가했다.
- 상단 필터는 브랜드 `전체/커피프린트/스티커씨`, 광고유형 `전체/파워링크/쇼핑검색광고`로 구성했다.
- `/operations`는 검색광고 운영 홈으로 바뀌었고, 수집 상태, 요약 카드, 브랜드별 현황, 최근 보고서, 최근 규칙 결과를 표시한다.
- `/campaigns`, `/adgroups`, `/search-terms`, `/rule-results`, `/rules`, `/action-logs`, `/settings`는 다음 모듈을 위한 route skeleton과 한국어 안내 상태를 갖는다.

### module-2 DB와 저장소

- `db/workflow-store.sql`에 검색광고 전용 테이블을 추가했다.
- 보고서 작업, 원문 파일, 원문 행, 정규화 행, 캠페인/광고그룹/키워드 스냅샷, 규칙 기준, 규칙 결과, 실행 미리보기/로그를 분리했다.
- `src/lib/persistence/postgres.ts`와 `src/lib/persistence/searchAdRepository.ts`를 추가했다.
- 로컬 개발 중 DB가 없거나 꺼져 있어도 화면을 확인할 수 있게 sample fallback을 허용했다. production/Railway 백엔드는 계속 fail-closed다.

### module-3 Search Ad 읽기 클라이언트

- Search Ad HMAC signer를 구현했다.
- `/api` prefix와 query string을 제외한 서명 URI 규칙을 테스트로 고정했다.
- 보고서 목록/단건/다운로드 클라이언트와 캠페인/광고그룹/키워드 read-only 관리 클라이언트를 추가했다.
- 실제 provider write 경로는 아직 열지 않았다.

### module-4 보고서 파서와 보관함

- 네이버 headerless TSV 보고서 타입별 컬럼 순서표를 추가했다.
- 보고서 파서는 원문 행과 정규화 행을 나누고 checksum, parserVersion, 브랜드/광고유형 매핑 상태를 남긴다.
- `/reports`에서 보고서 목록, 수집 상태, 파싱 상태, 요약을 볼 수 있다.
- `/reports/[id]`에서 보고서 요약, 쉬운 표, 문제 후보, 좋은 후보, 원본 미리보기, 컬럼 설명을 볼 수 있다.
- `/api/search-ad/overview`, `/api/search-ad/reports`, `/api/search-ad/reports/[id]`, `/api/search-ad/rule-criteria`, `/api/search-ad/reports/sync`를 추가했다.

### module-5 상태 수집과 캠페인/광고그룹 화면

- `/api/search-ad/state`와 `/api/search-ad/state/sync`를 추가했다.
- Search Ad 캠페인, 광고그룹, 키워드를 read-only로 조회해 스냅샷으로 저장하는 `syncSearchAdState`를 추가했다.
- 이름과 provider type에서 `커피프린트`/`스티커씨`, `파워링크`/`쇼핑검색광고` 매핑을 추론한다.
- `/campaigns`, `/adgroups`는 수집된 스냅샷 또는 샘플 스냅샷으로 ON/OFF 상태, 상태 사유, 입찰, 일예산, 수집 시간을 표시한다.

### module-6 규칙 엔진과 성과 기준

- `buildSearchAdRuleResults`를 추가해 정규화 보고서 행을 저효율, 클릭 없음, 높은 CPA, 낮은 ROAS, 우수 후보로 분류한다.
- `/api/search-ad/search-terms`와 `/api/search-ad/rules/rebuild`를 추가했다.
- `/search-terms`는 검색어별 비용, 클릭, 전환, CPA, ROAS와 연결된 규칙 결과를 표시한다.
- `/rules`는 최근 30일 기준, 최근 7일 급등, 시즌 윈도우의 현재 적용 상태와 브랜드/광고유형별 기준값을 표시한다.

### module-7 실행 미리보기와 write gate

- `/api/search-ad/action-preview`, `/api/search-ad/action-apply`, `/api/search-ad/action-logs`를 추가했다.
- 캠페인/광고그룹 끄기·켜기 요청은 먼저 영향 요약, 하위 영향 수, 최근 비용/클릭/전환을 미리보기로 남긴다.
- write gate가 닫혀 있으면 apply API는 `blocked` 로그를 남기고 423으로 응답한다.
- 실제 provider write 경로는 아직 연결하지 않았다.

### module-8 운영 검증

- 로컬 타입 검사, 테스트, 빌드, 보안 감사, route/API smoke를 통과했다.
- GitHub `main`에 커밋을 올렸고 Vercel production alias `marketcrew.app`, Railway `api.marketcrew.app` 배포 상태를 확인했다.
- 운영 보호 라우트는 로그인 전 307로 `/login`에 연결되고, 보호 API는 인증 없이 401을 반환한다.
- 운영 Railway API에서 Search Ad 상태 동기화를 실행해 캠페인 6개, 광고그룹 56개, 키워드 2,879개, 총 2,941개 스냅샷 저장을 확인했다.
- 운영 보고서 동기화 API는 200으로 응답했다.

### follow-up 보고서 백필 작업기

- `/api/search-ad/reports/backfill`을 추가했다.
- `/settings` 안에 보고서 복구 섹션을 추가해 오늘 기준 받을 수 있는 전체 범위에서 남은 보고서만 이어받을 수 있게 했다.
- 화면 기본 동작은 전체 보고서 10종, 최대 과거일~전일, `skipSaved=true`다. 이미 DB에 저장된 날짜/보고서 조합은 다시 다운로드하지 않는다.
- 보관 기간은 네이버 `stat-reports` 기준으로 `AD`/`EXPKEYWORD`/`AD_CONVERSION`/`ADEXTENSION`/`CRITERION`/`CRITERION_CONVERSION` 365일, `AD_DETAIL`/`SHOPPINGKEYWORD_DETAIL` 180일, `AD_CONVERSION_DETAIL`/`SHOPPINGKEYWORD_CONVERSION_DETAIL` 45일이다.
- 남은 보고서 확인 요청:

```json
{
  "dryRun": true,
  "skipSaved": true,
  "maxDates": 92
}
```

- 실제 저장은 화면의 `전체 저장 / 이어받기` 버튼으로 실행한다. 누락 보고서 생성은 `createMissing=true`, 다운로드/저장은 `dryRun=false`일 때만 일어나며, 화면 실행 제한은 `maxDates=92`, `maxCreates=120`, `maxDownloads=60`이다.

---

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | 통과 |
| `npm test -- --run` | 통과, 13 files / 37 tests |
| `npm run build` | 통과 |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `git diff --check` | 통과 |
| `curl http://localhost:3001/operations` | 200 |
| `curl http://localhost:3001/reports` | 200 |
| `curl http://localhost:3001/api/search-ad/overview` | 200, sample mode |
| `curl http://localhost:3001/api/search-ad/reports/report-sample-expkeyword-2026-05-25` | 200 |
| `curl http://localhost:3001/campaigns` | 200 |
| `curl http://localhost:3001/adgroups` | 200 |
| `curl http://localhost:3001/search-terms` | 200 |
| `curl http://localhost:3001/rules` | 200 |
| `curl http://localhost:3001/action-logs` | 200 |
| `curl http://localhost:3001/api/search-ad/state` | 200 |
| `curl http://localhost:3001/api/search-ad/search-terms` | 200 |
| `POST /api/search-ad/action-preview` | 200 |
| `POST /api/search-ad/action-apply` | 423, write gate blocked |
| `POST /api/search-ad/rules/rebuild` | 200 |
| `npm run smoke:prod` | 통과, Railway API 상태/Vercel bridge/대표 로그인 보호 |
| `vercel inspect https://marketcrew-jpwd1xfk0-aipressos-projects.vercel.app` | Ready, `marketcrew.app` alias 연결 |
| `railway status` | `marketcrew-api` Online, `https://api.marketcrew.app` |
| `POST https://api.marketcrew.app/api/search-ad/state/sync` | 200, 캠페인 6개/광고그룹 56개/키워드 2,879개/저장 2,941개 |
| `POST https://api.marketcrew.app/api/search-ad/reports/sync` | 200 |

---

## Remaining Work

1. 다음 PDCA Check에서 설계 대비 누락, 화면 흐름, 운영 API 응답 형태를 점검한다.
2. 운영 데이터가 쌓이면 브랜드/광고유형 매핑 누락 케이스와 규칙 기준값을 보정한다.

## MVP Progress

1차 MVP 대비 진행율은 **100%**다. module-1~8 구현, 로컬 검증, GitHub push, Vercel/Railway 배포, 운영 Search Ad 상태/보고서 동기화 확인까지 완료했다.
