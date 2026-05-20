# Approval KeywordRule Materialization Completion Note

**Goal:** When a user approves a keyword-related `ActionProposal`, reflect the decision in the internal `KeywordRule` board without calling Naver Search Ad write APIs.

**Status (2026-05-20 KST):** Completed and locally verified.

## Completed

- [x] Added `buildKeywordRuleMaterialization` as a pure domain mapper for approved `KEYWORD_RULE_CHANGE` and `NEGATIVE_KEYWORD` proposals.
- [x] Added tests for rule-change, negative keyword, unsupported action, and missing-brand cases.
- [x] Added DB materialization that resolves brand context from explicit proposal JSON or the latest keyword/adgroup/campaign Search Ad snapshots.
- [x] Updated approval server action to create or update an internal active `KeywordRule` on approval.
- [x] Kept external Search Ad write execution blocked by recording the execution as provider `INTERNAL`.
- [x] Revalidated `/approvals`, `/operations`, and `/keywords` after approval decisions.

## Verification

- [x] `pnpm vitest run lib/domain/proposal-rule-materialization.test.ts lib/domain/keyword-diagnostics.test.ts`
- [x] `pnpm test`
- [x] `pnpm lint`
- [x] `pnpm build`
- [x] `curl -I http://localhost:3000/approvals`
- [x] `curl -I http://localhost:3000/keywords`

## Notes

- `pnpm exec tsc --noEmit` still reports existing unrelated issues in generated `.next` duplicate type files and `lib/integrations/naver-search-ad/client.test.ts`; the new approval materialization files were not among the remaining TypeScript errors.
- The first sandboxed `pnpm build` failed because Turbopack could not bind a port inside the sandbox; the same build passed after rerunning with approved escalation.
