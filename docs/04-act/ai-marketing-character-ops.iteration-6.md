# ai-marketing-character-ops Act Iteration 6

> **PDCA Phase**: Act / Iteration 6
>
> **Date**: 2026-05-22 KST
>
> **Scope**: Provider aggregate signal to character agenda
>
> **Completes**: `module-7` / read-only provider aggregate signal -> character agenda and owner approval queue goal
>
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-5.md`

## Act Target

Iteration 5에서 Search Ad/DataLab/Smartstore/Youngcart가 같은 read-only provider sync 흐름에 들어왔다. 이번 iteration은 그중 스마트스토어/커머스와 영카트 aggregate `Signal`을 실제 담당 캐릭터 안건으로 올린다. 대표 화면은 더 이상 "데이터를 읽었다"에서 멈추지 않고, `프로`, `리피`, `마루`가 하위 안건을 만들어 오피 결재 대기열로 올린 상태를 보여야 한다.

## Implemented Change

| Area | Change |
|------|--------|
| Application | `buildProviderSignalAgendaArtifacts`를 추가해 synced Smartstore/Youngcart aggregate report를 `AgendaCandidate`, `CharacterReport`, `ApprovalRequest`, `PerformanceCheckpoint`로 변환한다. |
| Character mapping | 스마트스토어 상품/매출 aggregate는 `프로`, 영카트 재구매 aggregate는 `리피`, 두 채널 매출 균형 점검은 `마루`가 담당한다. |
| Persistence | `persistProviderSyncReports`가 provider report/signal/snapshot 저장 뒤 provider 기반 안건과 결재 요청도 함께 저장한다. |
| Operations UI | `/operations`가 local workflow repository의 provider aggregate report를 읽어 provider 기반 안건을 샘플 안건과 함께 보여준다. |
| Approval detail | `/approvals/:id` 상세도 local workflow repository를 읽어 provider 기반 결재 요청을 열 수 있다. |
| Safety | provider 기반 안건은 모두 내부 초안/검토 작업으로 생성하며 `requiresWriteGate=false`다. 외부 계정 write는 계속 열지 않는다. |

## Character Agenda Contract

| Character | Input Evidence | Generated Agenda | Approval Work Type |
|-----------|----------------|------------------|--------------------|
| `pro` | `CommerceAggregateSnapshot` | 스마트스토어 상위 상품 키워드/랜딩 초안 | `PRODUCT_DRAFT` |
| `ripi` | `ShopAggregateSnapshot` | 영카트 재구매 고객군 CRM 초안 | `CRM_DRAFT` |
| `maru` | Smartstore + Youngcart aggregate pair | 채널별 매출/손익 균형 점검 | `INTERNAL_TASK` |

## Safety Boundary

이번 iteration은 provider write executor를 열지 않는다. 승인 버튼을 눌러도 내부 초안/검토/성과 체크포인트만 기록한다. 스마트스토어 상품 수정, 광고 키워드 추가, 입찰/예산 변경, 자체몰/CRM 발송은 별도 write-gate iteration 전까지 계속 차단한다.

## Verification

| Check | Result |
|-------|--------|
| `npm test -- --run` | 13 files, 46 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e` | 1 chromium smoke passed |
| `GET /api/operations/provider-sync` | 200, four providers returned; smartstore/shop aggregate signals created provider agenda artifacts |
| `GET /api/operations/workflow-state` | provider sync 후 `approvalRequests=3`, `performanceCheckpoints=15`, provider approval IDs include smartstore/youngcart/channel-balance |
| `GET /operations` | 200, provider 기반 3개 안건과 "실제 read-only provider 집계" 문구 렌더링 확인 |
| `GET /approvals/approval-agenda-provider-smartstore-stickersee-2026-05-22` | 200, provider 기반 결재 상세와 `내부 작업만 실행` 렌더링 확인 |

## Remaining Act Order

1. `/operations`에서 provider sync 성공/실패 report 자체를 더 직접적인 근거 패널로 노출한다.
2. Search Ad 키워드 수요와 커머스/영카트 상품 집계를 합쳐 상품별 키워드/마케팅/상품 발굴 후보를 고도화한다.
3. 승인된 내부 초안의 성과 분석 루프를 실제 provider read-only 데이터와 연결한다.
4. 실제 provider write는 계속 차단하고, 대표 승인 + write gate + preflight + rollback 조건이 모두 갖춰진 뒤 별도 Act로 연다.

## Act Decision

`module-7`은 local MVP 기준으로 완료됐다. read-only aggregate가 저장되면 이제 `프로`, `리피`, `마루`가 담당하는 안건과 결재 요청으로 올라오며, 오피 summary와 planner 후보에도 포함된다. 다음 iteration은 대표가 근거를 더 빠르게 확인할 수 있도록 provider sync report/snapshot을 `/operations` 근거 패널로 노출하는 것이다.
