---
feature: marketcrew-reboot-preserve-connections
project: marketcrew2
version: 0.1.0
author: Codex
date: 2026-05-26
status: Draft
---

# marketcrew-reboot-preserve-connections Planning Document

> **Summary**: MarketCrew를 새로 만들기 위해 코드, 운영 DB 데이터, API/Web 구현 기준선을 초기화하되, 도메인, Vercel/Railway 연결, GitHub 저장소 연결, provider/API env 설정은 보존한다.
>
> **Project**: marketcrew2
> **Version**: 0.1.0
> **Author**: Codex
> **Date**: 2026-05-26
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 기존 MarketCrew MVP에 실험 코드, workflow 데이터, 오래된 문서와 UI 방향이 많이 쌓여 새 제품 방향으로 빠르게 다시 만들기 어렵다. |
| **Solution** | GitHub/Vercel/Railway/도메인/provider env 연결은 보존하고, main 코드 기준선과 운영 DB workflow 데이터만 명시 확인 후 초기화한다. |
| **Function/UX Effect** | 대표 로그인과 `marketcrew.app` / `api.marketcrew.app` 연결은 유지하면서 빈 제품 골격부터 다시 만들 수 있다. |
| **Core Value** | 다시 연결하느라 시간을 쓰지 않고, 안전하게 깨끗한 MarketCrew 2차 설계를 시작한다. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 기존 구현과 데이터가 새 방향 판단을 방해하므로, 연결 자산은 살리고 제품 구현만 깨끗하게 다시 시작한다. |
| **WHO** | 대표 1인 운영자와 이후 MarketCrew를 이어서 개발할 에이전트. |
| **RISK** | Git history force push, DB wipe, 배포 설정 변경은 되돌리기 어렵다. 실행 전 백업 branch/tag와 env key inventory가 필요하다. |
| **SUCCESS** | `marketcrew.app`과 `api.marketcrew.app`이 새 빈 기준선으로 정상 응답하고, Vercel/Railway/GitHub/domain/provider env 연결은 유지된다. |
| **SCOPE** | 1) 현 상태 백업 2) 보존/초기화 대상 확정 3) DB workflow wipe 4) Web/API 새 기준선 5) GitHub main 초기화 6) 배포 smoke. |

---

## 1. Overview

### 1.1 Purpose

MarketCrew를 다시 만들기 위한 안전한 초기화 절차를 정의한다. 목적은 프로젝트를 지우는 것이 아니라, 연결과 credential을 유지한 채 제품 구현과 운영 데이터만 새 기준선으로 되돌리는 것이다.

### 1.2 Background

현재 운영 연결은 이미 구성되어 있다.

- GitHub: `https://github.com/cesign7/marketcrew`
- Vercel project: `aipressos-projects/marketcrew`
- Web domain: `https://marketcrew.app`, `https://www.marketcrew.app`
- Railway project/service: `marketcrew` / `marketcrew-api`
- API domain: `https://api.marketcrew.app`
- Railway Postgres: 같은 service 연결 유지

현재 production DB reset preview 기준으로 workflow 초기화 대상은 432건, 보존 대상으로 잡혀 있는 `aiOperationsSettings`는 1건이다. 이번 reboot에서는 사용자의 확인 후 `aiOperationsSettings`까지 비울지, 기존 안전 reset API처럼 보존할지 결정한다.

### 1.3 Related Documents

- Cloud setup: `docs/06-deploy/marketcrew-cloud-setup.md`
- Current PDCA memory: `.bkit-memory.json`
- DB schema: `db/workflow-store.sql`
- Reset policy: `src/lib/application/workflow-reset-policy.ts`

---

## 2. Scope

### 2.1 In Scope

- [ ] 현재 Git 상태, uncommitted 변경, 운영 env key 목록, Vercel env key 목록, Railway env key 목록을 값 없이 inventory로 남긴다.
- [ ] 실행 직전 `backup/pre-reboot-YYYYMMDD-HHMM` branch와 tag를 만들어 현재 main을 복구 가능하게 한다.
- [ ] GitHub 저장소 URL과 Vercel/Railway Git 연결은 유지하고, `main` 기준선만 새 커밋으로 재작성한다.
- [ ] Web은 대표 로그인, 기본 레이아웃, 상태 확인 화면만 남긴 최소 골격으로 초기화한다.
- [ ] API는 `/api/backend/health`, 인증, Vercel -> Railway bridge, provider readiness skeleton만 남긴다.
- [ ] Railway Postgres service와 `DATABASE_URL`/`MARKETCREW_DATABASE_URL` env는 유지하고, MarketCrew 내부 workflow records는 비운다.
- [ ] Vercel/Railway env key는 삭제하지 않는다. 값은 출력하거나 문서에 적지 않는다.
- [ ] 배포 후 `npm run smoke:prod`와 `marketcrew.app` / `api.marketcrew.app` health 확인을 실행한다.

### 2.2 Out of Scope

- GitHub repository 자체 삭제.
- Vercel project 삭제 또는 custom domain 제거.
- Railway project/service/Postgres service 삭제.
- Cloudflare DNS record 변경.
- 네이버 광고, 스마트스토어, Youngcart, DataLab 같은 외부 provider 원장 데이터 삭제.
- provider write 활성화.
- 새 제품 기능의 상세 구현. 초기화 이후 별도 PDCA에서 다시 설계한다.

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 초기화 전 현재 main을 백업 branch/tag로 보존한다. | High | Pending |
| FR-02 | Vercel production env 5개와 Railway provider/API env key는 유지한다. | High | Pending |
| FR-03 | GitHub 저장소 연결은 유지하면서 main 기준선을 새 제품 골격으로 재작성한다. | High | Pending |
| FR-04 | Railway Postgres 연결은 유지하고 MarketCrew 내부 workflow 데이터만 초기화한다. | High | Pending |
| FR-05 | Web/API는 health와 로그인/bridge 확인이 가능한 최소 기준선으로 배포된다. | High | Pending |
| FR-06 | 초기화 후 `marketcrew.app`, `api.marketcrew.app`가 정상 smoke를 통과한다. | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Safety | secret 값은 출력, 커밋, 문서화하지 않는다. | env inventory는 key name만 표시 |
| Recovery | 초기화 전 branch/tag로 복구 가능해야 한다. | `git branch --list backup/pre-reboot-*`, `git tag --list pre-reboot-*` |
| Deployment | Vercel/Railway/domain 연결이 유지되어야 한다. | `vercel inspect`, `railway status`, `npm run smoke:prod` |
| Data Boundary | 외부 provider 데이터는 삭제하지 않는다. | DB reset은 MarketCrew Postgres workflow table에 한정 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 백업 branch/tag가 생성되어 현재 상태로 돌아갈 수 있다.
- [ ] `.env`와 Vercel/Railway env key가 삭제되지 않았다.
- [ ] GitHub `main`이 새 초기 기준선으로 push됐다.
- [ ] Vercel production deploy가 Ready다.
- [ ] Railway `marketcrew-api`가 Online이다.
- [ ] Railway Postgres에는 새 기준선에 필요한 schema만 남아 있다.
- [ ] `npm run smoke:prod`가 통과한다.

### 4.2 Quality Criteria

- [ ] `npm run typecheck` 통과.
- [ ] `npm run build` 통과.
- [ ] 최소 smoke test 통과.
- [ ] 외부 write gate는 기본 false 유지.

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| GitHub main history rewrite로 이전 작업 접근이 어려워짐 | High | Medium | force push 전 backup branch/tag 생성, remote push 확인 |
| Railway DB 데이터 삭제 후 복구 불가 | High | Medium | reset preview와 가능하면 `workflow_records` JSON/SQL dump 생성 |
| Vercel/Railway env 손실 | High | Low | env 값은 건드리지 않고 key inventory만 확인 |
| 도메인 연결 끊김 | High | Low | Vercel project와 Railway service 삭제 금지 |
| 현재 uncommitted 변경 유실 | Medium | High | `DESIGN.md`, `src/app/characters`, `CharacterDesk.tsx` 변경을 백업 branch에 포함 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| GitHub `main` | Git history | 새 초기 기준선으로 재작성 |
| `src/app`, `src/components`, `src/features`, `src/lib` | Web/API code | 기존 MVP 구현 제거 후 최소 skeleton |
| `workflow_records` | DB table | MarketCrew 내부 workflow 데이터 삭제 |
| Vercel deployment | Production web | 같은 project/domain으로 새 기준선 배포 |
| Railway deployment | Production API | 같은 service/API domain으로 새 기준선 배포 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `marketcrew.app` | READ | 대표 로그인 후 Web UI | 새 빈 화면으로 변경 |
| `api.marketcrew.app` | READ | Vercel bridge, production smoke | health 중심으로 축소 |
| `workflow_records` | READ/WRITE | Railway backend repository | 기존 업무/결재/수집/AI 판단 기록 삭제 |
| Vercel env | READ | login + backend bridge | 보존 필요 |
| Railway env | READ | DB/provider/API/LLM readiness | 보존 필요 |

### 6.3 Verification

- [ ] `vercel env ls`에서 기존 5개 key 유지 확인.
- [ ] `railway variable list --service marketcrew-api`에서 기존 provider/API key name 유지 확인.
- [ ] `railway status`에서 `marketcrew-api`와 Postgres Online 확인.
- [ ] `npm run smoke:prod` 통과.

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | 단순 화면과 최소 API | 임시 랜딩/정적 페이지 | ☐ |
| **Dynamic** | Next.js app + Railway API + Postgres | MarketCrew reboot MVP | ☑ |
| **Enterprise** | 계층/서비스 분리 강화 | 운영 확장 이후 | ☐ |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| GitHub 초기화 방식 | repo 삭제 / orphan main 재작성 / 폴더만 삭제 | orphan main 재작성 | Vercel/Railway Git 연결을 유지한다. |
| DB 초기화 방식 | service 삭제 / schema drop / workflow table wipe | workflow table wipe 또는 schema reset | Railway Postgres URL과 env를 유지한다. |
| Web 초기 기준선 | 빈 페이지 / 로그인+health / 전체 재설계 | 로그인+health | 공개 사이트 보호와 연결 확인을 유지한다. |
| API 초기 기준선 | 전체 삭제 / health만 / health+bridge+readiness | health+bridge+readiness | 운영 연결을 바로 검증할 수 있다. |
| Env 관리 | 재등록 / 값 dump / key 보존 | key 보존, 값 미출력 | secret 유출을 막는다. |

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `AGENTS.md`에 한국어 UI, web-first verification, destructive reset 경계가 있다.
- [x] TypeScript/Next.js 기준이 있다.
- [x] Vercel/Railway 배포 문서가 있다.
- [ ] reboot 이후 새 `DESIGN.md`를 기준 문서로 다시 정리해야 한다.

### 8.2 Environment Variables Needed

초기화 후에도 아래 key들은 삭제하지 않는다. 값은 문서화하지 않는다.

| Variable Group | Scope | Preserve |
|----------------|-------|:--------:|
| `MARKETCREW_AUTH_SECRET`, `MARKETCREW_OWNER_PASSWORD_HASH` | Vercel/Railway | ☑ |
| `MARKETCREW_BACKEND_API_URL`, `MARKETCREW_BACKEND_API_TOKEN`, `MARKETCREW_BACKEND_API_TIMEOUT_MS` | Vercel | ☑ |
| `MARKETCREW_API_TOKEN`, `DATABASE_URL`, `MARKETCREW_DATABASE_URL` | Railway | ☑ |
| `NAVER_SEARCH_AD_*`, `NAVER_COMMERCE_*`, `NAVER_DATALAB_*` | Railway | ☑ |
| `YOUNGCART_*` | Railway | ☑ |
| `AI_*`, `GEMINI_API_KEY`, `OPENAI_API_KEY` | Railway/local where present | ☑ |
| `*_WRITE_ENABLED`, `EXTERNAL_WRITE_ENABLED` | Railway | Preserve as disabled |

---

## 9. Execution Gate

실제 초기화는 아래 조건이 모두 충족될 때만 진행한다.

1. 사용자가 아래 확인 문구를 그대로 보낸다.

```text
마켓크루 전체 초기화 승인
```

2. 실행 직전 백업 branch/tag를 만든다.
3. env key inventory를 값 없이 다시 확인한다.
4. production DB reset preview를 다시 확인한다.

확인 문구 없이 실행 가능한 것은 inventory, 플랜 작성, 백업 전략 수립, smoke 확인뿐이다.

