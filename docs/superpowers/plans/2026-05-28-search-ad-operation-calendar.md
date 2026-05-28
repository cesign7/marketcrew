# Search Ad Operation Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 커피프린트는 일요일/공휴일/대체공휴일 자동 OFF 기준으로 운영하고, 스티커씨는 365일 24시간 운영에서 성과 기반 축소 후보만 만들 수 있는 안전한 운영 캘린더 기반을 만든다.

**Architecture:** 운영 캘린더 정책은 순수 도메인 함수로 계산하고, 기존 광고그룹 상태와 기존 action preview/apply 게이트에 연결한다. 화면은 성과 기준 페이지에서 정책과 모의 실행을 보여주며, 크론은 별도 자동운영 gate가 닫혀 있으면 실제 네이버 변경 없이 결과만 반환한다.

**Tech Stack:** Next.js App Router, TypeScript, PostgreSQL persistence fallback, Vitest, Vercel Cron.

**운영 env:** `MARKETCREW_OPERATION_AUTOMATION_ENABLED=1` 또는 `SEARCH_AD_OPERATION_AUTOMATION_ENABLED=1`일 때만 캘린더 자동 실행을 만들고, 실제 네이버 변경은 기존 `SEARCH_AD_WRITE_ENABLED=1` 또는 `NAVER_SEARCH_AD_WRITE_ENABLED=1`까지 함께 열려야 한다. 공휴일 조회는 `KOREA_PUBLIC_HOLIDAY_SERVICE_KEY`, `KOREA_HOLIDAY_API_KEY`, `DATA_GO_KR_SERVICE_KEY` 중 하나가 있을 때 공공데이터 특일 API를 사용한다.

---

### Task 1: 운영 캘린더 도메인

**Files:**
- Create: `src/features/search-ad/domain/operationCalendar.ts`
- Test: `tests/search-ad/operationCalendar.test.ts`

- [x] 커피프린트는 일요일과 공휴일에 꺼야 하는 결정을 만들고, 스티커씨는 24시간 운영이라 자동 OFF 결정을 만들지 않는 테스트를 작성한다.
- [x] `buildSearchAdOperationCalendarPreview`를 구현해 브랜드 정책, 날짜, 공휴일, 광고그룹 상태를 입력받아 결정 목록을 반환한다.
- [x] `npm test -- --run tests/search-ad/operationCalendar.test.ts`로 통과시킨다.

### Task 2: 저장소/API 연결

**Files:**
- Modify: `src/lib/persistence/searchAdRepository.ts`
- Create: `src/app/api/search-ad/operation-calendar/preview/route.ts`
- Create: `src/app/api/cron/search-ad-operation-calendar/route.ts`
- Modify: `vercel.json`

- [x] 최신 광고그룹 상태로 운영 캘린더 모의 실행을 만드는 저장소 함수를 추가한다.
- [x] POST/GET preview API는 실제 네이버 변경 없이 계산 결과만 반환한다.
- [x] Cron route는 `MARKETCREW_OPERATION_AUTOMATION_ENABLED=1`이 아니면 dry-run으로만 반환한다.
- [x] 실제 적용은 기존 `createSearchAdActionPreview`/`applySearchAdActionPreview`를 사용하고, 기존 `SEARCH_AD_WRITE_ENABLED`가 닫히면 차단 로그만 남긴다.

### Task 3: 성과 기준 화면 표시

**Files:**
- Create: `src/components/search-ad/OperationCalendarPanel.tsx`
- Modify: `src/app/rules/page.tsx`
- Modify: `src/app/globals.css`

- [x] 커피프린트/스티커씨 정책 카드를 표시한다.
- [x] 오늘 기준 모의 실행에서 꺼야 할 광고그룹과 그대로 둘 광고그룹을 표시한다.
- [x] 실제 자동반영은 별도 gate가 닫혀 있음을 명확히 표시한다.

### Task 4: 검증/배포

**Files:**
- Test: `tests/search-ad/operationCalendar.test.ts`
- Existing tests: full suite

- [x] `npm run typecheck`, `npm test -- --run`, `npm run build`를 실행한다.
- [x] 로컬 화면 `/rules?brand=coffeeprint`에서 운영 캘린더 패널을 확인한다.
- [x] 커밋/푸시 후 운영 배포와 `npm run smoke:prod`를 확인한다.
