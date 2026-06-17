---
slug: product-image-saas-ui-rollout
status: approved
approved_by: user
approved_at: 2026-06-16
mode: start-work
tier: HEAVY
source_draft: .omo/drafts/product-image-saas-ui-rollout.md
prototype: docs/02-design/print-product-saas-fullpage-prototype.html
---

# Product Image SaaS UI Rollout

## Objective

Rework the real `/product-image-studio` experience into the compact SaaS workspace approved in the static prototype, while preserving existing project/upload/result/provider safety behavior.

The visible app structure must become:

- Top sidebar: 홈, AI 도구, 일괄처리, 상품템플릿, 업로드, 라이브러리, 결과 보관함
- Bottom sidebar: 사용량, 회원초대, 환경설정
- Page pattern: short header, compact cards, modals or focused panels for actions
- AI tools pattern: choose a tool card, then configure work in a modal or focused tool surface
- New SVG tool: upload a PNG and generate a real vector SVG download, not an SVG wrapper around the PNG

## Product Decisions

1. PNG to SVG means content-derived local vectorization for this pass.
   - Use uploaded PNG bytes as input.
   - Do not embed the PNG in `<image>`, `data:image`, base64, canvas snapshots, or foreign objects.
   - Output must contain vector primitives such as `<path>`, `<rect>`, `<circle>`, `<polygon>`, `<line>`, or grouped equivalents.
   - It is acceptable for photos to become stylized vectors; UI copy should set this expectation.

2. No production provider call is part of this rollout.
   - Do not change provider API keys, provider gate defaults, or image-generation write gate behavior.
   - A deterministic/local converter using existing dependencies such as `sharp` is preferred.
   - If a worker believes a new dependency is required, it must prove the existing stack cannot satisfy the acceptance criteria before adding it.

3. SVG conversion is its own AI tool flow.
   - Use a dedicated API surface such as `/api/product-image-studio/svg-conversions`.
   - Accept multipart PNG upload plus style options.
   - Reject non-PNG, malformed PNG, oversized input, unsafe SVG output, and conversion failures with user-safe Korean errors.
   - The UI should be usable without a reference project being selected.

4. Converted SVG outputs are saved as generated results/artifacts, not as replacements for the original PNG.
   - Result/archive views should show the SVG output after refresh.
   - Existing PNG downloads and old vector export URLs must remain intact.
   - Avoid DB/schema changes if existing repository records can store the generated SVG URL/MIME safely.

5. Compatibility routes remain.
   - Keep `/product-image-studio/designs`, `/projects`, `/projects/[id]`, `/activity`, `/results`, `/specs`, `/templates` renderable.
   - Remove obsolete labels from the visible primary nav only; do not delete data loaders.

## Source Findings

- Prototype source: `docs/02-design/print-product-saas-fullpage-prototype.html`
- Shell/navigation: `src/components/product-image-studio/ProductImageStudioShell.tsx`
- Home: `src/components/product-image-studio/ProductImageStudioHome.tsx`
- AI tools hub: `src/components/product-image-studio/ProductImageStudioAiTools.tsx`
- Support pages: `src/components/product-image-studio/ProductImageStudioWorkspaceSupportPages.tsx`
- Upload page: `src/components/product-image-studio/ProductImageStudioUploadLibrary.tsx`
- Spec/library source: `src/components/product-image-studio/ProductImageStudioSpecLibrary.tsx`
- Archive/results UI: `src/components/product-image-studio/ProductImageStudioArchive.tsx`
- Existing generated-vector helper: `src/features/product-image-studio/server/vectorSvg.ts`
- SVG sanitizer: `src/features/product-image-studio/server/svgAssetSanitizer.ts`
- Upload API: `src/features/product-image-studio/server/assetUploadApi.ts`
- File stores: `src/features/product-image-studio/server/fileStore.ts`, `src/features/product-image-studio/server/blobFileStore.ts`
- Persistence/read models: `src/lib/persistence/productImageStudioRepository.ts`, `src/lib/persistence/productImageStudioArchiveReadModels.ts`
- Current vector download route: `src/app/api/product-image-studio/projects/[id]/results/[resultId]/vector.svg/route.ts`

## Dirty Worktree Boundary

Before editing, every worker must run and capture `git status --short`.

Known pre-existing dirt:

- `package.json` is modified.
- Many `.omo/` files are untracked historical plans/evidence.
- Static prototypes under `docs/02-design/` are untracked.
- `src/components/product-image-studio/ProductImageStudioUploadLibrary.module 2.css` is untracked and must not be overwritten or staged accidentally.

Workers must stage no files unless a later user request explicitly asks for commit/push. If commit is requested later, use exact-path staging only.

## QA Fixture Boundary

Use existing local PNG fixtures for SVG conversion QA:

- Primary: `.omo/fixtures/seal-sticker.png`
- Alternate source-difference fixture: `.omo/fixtures/card-front.png`
- Do not create or overwrite fixture files from the root orchestrator.

## Test And QA Baseline

Targeted suites likely affected:

- `tests/product-image-studio/studioShell.test.ts`
- `tests/product-image-studio/studioHome.test.ts`
- `tests/product-image-studio/aiTools.test.ts`
- `tests/product-image-studio/workspaceSupportPages.test.ts`
- `tests/product-image-studio/uploadArchive.test.ts`
- `tests/product-image-studio/resultArchiveUi.test.ts`
- `tests/product-image-studio/resultArchiveRoutes.test.ts`
- `tests/product-image-studio/productSpecLibraryUi.test.ts`
- `tests/product-image-studio/archivePageData.test.ts`
- `tests/product-image-studio/vectorSvg.test.ts`
- `tests/product-image-studio/svgAssetSanitizer.test.ts`
- `tests/product-image-studio/fileStore.test.ts`
- `tests/product-image-studio/fileStoreGenerated.test.ts`
- `tests/product-image-studio/downloads.test.ts`
- `tests/product-image-studio/smokeContract.test.ts`

Final commands:

- `npm run typecheck`
- `npm test -- --run`
- `npm run build`
- `npm run smoke:prod` only after push/deploy is explicitly requested or a final production check is in scope.

## TODOs

- [x] 1. Shell IA and route compatibility skeleton
  - Tier: HEAVY
  - Dependencies: none
  - Write scope:
    - `src/components/product-image-studio/ProductImageStudioShell.tsx`
    - `src/app/product-image-studio/invite/page.tsx`
    - `src/app/product-image-studio/library/page.tsx`
    - route alias files only if needed for compatibility
    - `tests/product-image-studio/studioShell.test.ts`
    - `tests/product-image-studio/resultArchiveRoutes.test.ts`
  - Failing-first proof:
    - Add or update shell tests first so the current app fails on the new visible menu order:
      `홈`, `AI 도구`, `일괄처리`, `상품템플릿`, `업로드`, `라이브러리`, `결과 보관함`, then bottom links `사용량`, `회원초대`, `환경설정`.
    - Add route render tests for `/product-image-studio/invite` and `/product-image-studio/library`.
    - Add compatibility assertions that `/projects`, `/projects/[id]`, `/results`, `/activity`, `/designs`, `/specs`, and `/templates` remain reachable or aliased.
  - Acceptance criteria:
    - Sidebar visible labels match the approved prototype order.
    - `활동`, `디자인`, `템플릿`, `상품 규격` are not visible primary sidebar labels, while their old URLs still render.
    - `라이브러리` is the visible umbrella route and links to specs/materials/mockups/background assets.
    - `회원초대` exists as a UI-only page route; it does not send email or mutate accounts.
    - Mobile sidebar stays compact and text does not overlap.
  - Automated verification:
    - `npm test -- --run tests/product-image-studio/studioShell.test.ts tests/product-image-studio/resultArchiveRoutes.test.ts --fileParallelism=false`
    - `npm run typecheck`
  - Manual-QA channel:
    - Browser use via agent-browser or Chrome.
    - Exact invocation: `page.goto("http://127.0.0.1:<port>/product-image-studio"); page.getByRole("link", { name: "AI 도구" }).click(); page.getByRole("link", { name: "회원초대" }).click();`
    - PASS if the shell renders the approved menu order, the bottom links are below the main menu, and no visible nav label wraps incoherently at desktop 1440px and mobile 390px.
  - Ultraqa:
    - dirty_worktree: capture pre/post `git status --short` and prove the duplicate CSS file is untouched.
    - stale_state: rerun shell tests after implementation.
    - misleading_success_output: artifact must include rendered nav text, not only test pass output.
    - malformed_input: not applicable unless new parser is added.
    - prompt_injection: not applicable.
    - cancel_resume: not applicable.
    - hung_or_long_commands: record dev-server PID/port and cleanup.
    - flaky_tests: rerun the focused shell test once if it fails intermittently.
    - repeated_interruptions: note if worker resumes from partial route files.
  - Artifacts:
    - `.omo/evidence/product-image-saas-ui-rollout-t1-red.txt`
    - `.omo/evidence/product-image-saas-ui-rollout-t1-green.txt`
    - `.omo/evidence/product-image-saas-ui-rollout-t1-desktop.png`
    - `.omo/evidence/product-image-saas-ui-rollout-t1-mobile.png`
    - `.omo/evidence/product-image-saas-ui-rollout-t1-cleanup.txt`

- [x] 2. Shared compact SaaS UI primitives
  - Tier: HEAVY
  - Dependencies: none
  - Write scope:
    - New or existing shared files under `src/components/product-image-studio/`
    - Component CSS modules under `src/components/product-image-studio/`
    - Tests under `tests/product-image-studio/`
  - Failing-first proof:
    - Add tests for reusable action-card/card-grid/work-modal behavior before implementation.
    - The red test must assert a modal has accessible title/close control, supports Escape/overlay close, and does not require page-specific duplicated markup.
  - Acceptance criteria:
    - Provide reusable primitives for compact page header, card grid, action card, item card, empty state, and work modal.
    - Cards use 8px or smaller radius unless existing local system requires otherwise.
    - Icons use `lucide-react` where a matching icon exists.
    - UI copy is short, natural Korean.
    - No nested card-in-card structures.
  - Automated verification:
    - `npm test -- --run tests/product-image-studio/saasPrimitives.test.ts tests/product-image-studio/aiTools.test.ts --fileParallelism=false`
    - `npm run typecheck`
  - Manual-QA channel:
    - Browser use.
    - Exact invocation: `page.goto("http://127.0.0.1:<port>/product-image-studio/ai-tools"); page.getByRole("button", { name: /상품 설정샷/ }).click(); page.keyboard.press("Escape");`
    - PASS if the modal opens, focus lands inside it, Escape closes it, and the card grid does not shift width.
  - Ultraqa:
    - malformed_input: probe missing modal title/invalid action config in unit tests if config objects are parsed.
    - stale_state: rerun primitive and AI tool tests after pages consume primitives.
    - dirty_worktree: pre/post status capture.
    - misleading_success_output: browser artifact must include DOM/focus observations.
    - hung_or_long_commands: cleanup dev-server port.
    - flaky_tests: rerun modal interaction test once.
    - prompt_injection: not applicable.
    - cancel_resume: not applicable.
    - repeated_interruptions: note partial shared CSS merge handling.
  - Artifacts:
    - `.omo/evidence/product-image-saas-ui-rollout-t2-red.txt`
    - `.omo/evidence/product-image-saas-ui-rollout-t2-green.txt`
    - `.omo/evidence/product-image-saas-ui-rollout-t2-modal.json`
    - `.omo/evidence/product-image-saas-ui-rollout-t2-cleanup.txt`

- [x] 3. Local PNG-to-vector SVG domain, API, and persistence
  - Tier: HEAVY
  - Dependencies: none
  - Write scope:
    - `src/features/product-image-studio/server/vectorSvg.ts`
    - New `src/features/product-image-studio/server/pngToVectorSvg.ts` or equivalent
    - `src/app/api/product-image-studio/svg-conversions/route.ts`
    - `src/features/product-image-studio/server/fileStore.ts`
    - `src/features/product-image-studio/server/blobFileStore.ts`
    - `src/features/product-image-studio/server/downloads.ts`
    - `src/lib/persistence/productImageStudioRepository.ts`
    - `src/lib/persistence/productImageStudioArchiveReadModels.ts`
    - `tests/product-image-studio/vectorSvg.test.ts`
    - `tests/product-image-studio/fileStoreGenerated.test.ts`
    - New route tests under `tests/product-image-studio/`
  - Failing-first proof:
    - Add a unit test that passes two distinct PNG fixtures to the converter and fails until the SVG output differs by source content.
    - Add a route test that fails until multipart PNG upload returns `image/svg+xml` metadata or JSON containing a saved SVG result.
    - Add a negative test proving generated SVG contains no `<image`, no `data:image`, and no `base64`.
  - Acceptance criteria:
    - Route accepts only PNG by MIME and content sniffing.
    - Route rejects non-PNG, malformed PNG, empty file, and oversized file with safe Korean error messages.
    - Converter receives uploaded PNG bytes and uses source pixels or metadata to derive vector primitives.
    - SVG is sanitized through the existing sanitizer before response/storage.
    - Saved result/artifact is visible to archive/read models after refresh without replacing original PNG.
    - Existing vector export route remains backward-compatible.
    - No provider key, provider gate, or external service is called.
  - Automated verification:
    - `npm test -- --run tests/product-image-studio/vectorSvg.test.ts tests/product-image-studio/fileStoreGenerated.test.ts tests/product-image-studio/downloads.test.ts tests/product-image-studio/svgConversionRoute.test.ts --fileParallelism=false`
    - `npm run typecheck`
  - Manual-QA channel:
    - HTTP call.
    - Exact invocation: `curl -i -F "file=@.omo/fixtures/seal-sticker.png;type=image/png" -F "style=icon" http://127.0.0.1:<port>/api/product-image-studio/svg-conversions`
    - PASS if status is 200, response references or returns an `.svg`, content has vector primitives, and content does not contain `<image`, `data:image`, or `base64`.
  - Ultraqa:
    - malformed_input: non-PNG, malformed PNG, empty PNG, oversized input.
    - prompt_injection: title/style text with `ignore previous instructions` remains escaped metadata only or is rejected.
    - stale_state: verify converted SVG appears through a fresh archive/read-model load.
    - dirty_worktree: capture status and do not touch duplicate CSS.
    - hung_or_long_commands: set timeout bounds and capture conversion duration.
    - misleading_success_output: parse actual SVG response/file, do not rely on success JSON alone.
    - flaky_tests: rerun converter fixtures once and compare deterministic output hashes.
    - cancel_resume: not applicable unless the route exposes job polling.
    - repeated_interruptions: record partial file cleanup if route save fails mid-write.
  - Artifacts:
    - `.omo/evidence/product-image-saas-ui-rollout-t3-red.txt`
    - `.omo/evidence/product-image-saas-ui-rollout-t3-green.txt`
    - `.omo/evidence/product-image-saas-ui-rollout-t3.http`
    - `.omo/evidence/product-image-saas-ui-rollout-t3-output.svg`
    - `.omo/evidence/product-image-saas-ui-rollout-t3-cleanup.txt`

- [x] 4. AI tools hub modal-first UI including SVG 변환
  - Tier: HEAVY
  - Dependencies: 2, 3 for final integration; may begin UI tests after 2
  - Write scope:
    - `src/components/product-image-studio/ProductImageStudioAiTools.tsx`
    - Related CSS module(s)
    - Optional client component for SVG conversion
    - `tests/product-image-studio/aiTools.test.ts`
    - New UI tests for SVG conversion
  - Failing-first proof:
    - Update AI tools tests first so current UI fails on eight visible tool cards including `SVG 변환`.
    - Add a failing interaction test requiring card click to open a modal instead of only direct navigation.
    - Add failing tests for model/count/ratio/resolution controls in the modal.
  - Acceptance criteria:
    - AI tools page visually follows the prototype: compact cards, icon + short title, minimal supporting text.
    - Existing `상품 설정샷 생성` and `AI 이미지 생성기` remain reachable from modal actions.
    - Future tools open a configuration/planning modal and are not dead disabled cards.
    - `SVG 변환` card opens a modal with PNG upload, style selector, optional name, generate button, SVG preview/download once ready.
    - The modal handles loading, success, safe error, and reset states.
    - Text is short and natural Korean.
  - Automated verification:
    - `npm test -- --run tests/product-image-studio/aiTools.test.ts tests/product-image-studio/svgConversionUi.test.ts --fileParallelism=false`
    - `npm run typecheck`
  - Manual-QA channel:
    - Browser use.
    - Exact invocation: `page.goto("http://127.0.0.1:<port>/product-image-studio/ai-tools"); page.getByRole("button", { name: /SVG 변환/ }).click(); page.setInputFiles("input[type=file]", ".omo/fixtures/seal-sticker.png"); page.getByRole("button", { name: /생성/ }).click();`
    - PASS if modal produces a downloadable SVG result without navigating away and the button states are clear.
  - Ultraqa:
    - malformed_input: no file, wrong file type, oversized file UI error.
    - prompt_injection: filename/title injection is escaped in UI.
    - stale_state: close/reopen modal and verify old pending state is cleared unless success result is intentionally retained.
    - dirty_worktree: capture pre/post status.
    - hung_or_long_commands: capture API timeout/loading state.
    - misleading_success_output: inspect actual download href/content-type, not only toast text.
    - flaky_tests: rerun UI focused test if file input timing flakes.
    - cancel_resume: close modal during pending request and verify UI recovers.
    - repeated_interruptions: note if route from Todo 3 changed while UI worker ran.
  - Artifacts:
    - `.omo/evidence/product-image-saas-ui-rollout-t4-red.txt`
    - `.omo/evidence/product-image-saas-ui-rollout-t4-green.txt`
    - `.omo/evidence/product-image-saas-ui-rollout-t4-desktop.png`
    - `.omo/evidence/product-image-saas-ui-rollout-t4-svg-modal.png`
    - `.omo/evidence/product-image-saas-ui-rollout-t4-cleanup.txt`

- [x] 5. Compact workspace pages and library structure
  - Tier: HEAVY
  - Dependencies: 1, 2
  - Write scope:
    - `src/components/product-image-studio/ProductImageStudioHome.tsx`
    - `src/components/product-image-studio/ProductImageStudioWorkspaceSupportPages.tsx`
    - `src/components/product-image-studio/ProductImageStudioSpecLibrary.tsx`
    - New or updated library/invite components
    - `tests/product-image-studio/studioHome.test.ts`
    - `tests/product-image-studio/workspaceSupportPages.test.ts`
    - `tests/product-image-studio/productSpecLibraryUi.test.ts`
  - Failing-first proof:
    - Add tests first for compact page titles and reduced support-page copy.
    - Add tests for library cards: 목업, 배경/소품, 용지·재질, 상품 규격.
    - Add tests for invite UI-only fields and no email-send route call.
  - Acceptance criteria:
    - Home is a compact workspace overview, not a marketing page.
    - Batch, 상품템플릿, 라이브러리, 사용량, 회원초대, 환경설정 follow the same short-header/card pattern.
    - `라이브러리` exposes shortcuts for 목업, 배경/소품, 용지·재질, 상품 규격.
    - Existing spec editor remains reachable from library.
    - Invite is UI-only and clearly does not send real invitations.
    - No page section is a floating card inside another card.
  - Automated verification:
    - `npm test -- --run tests/product-image-studio/studioHome.test.ts tests/product-image-studio/workspaceSupportPages.test.ts tests/product-image-studio/productSpecLibraryUi.test.ts --fileParallelism=false`
    - `npm run typecheck`
  - Manual-QA channel:
    - Browser use.
    - Exact invocation: `page.goto("http://127.0.0.1:<port>/product-image-studio/library"); page.getByRole("link", { name: /상품 규격/ }).click(); page.goto("http://127.0.0.1:<port>/product-image-studio/invite");`
    - PASS if library shortcuts are visible, specs are reachable, invite renders UI-only state, and pages stay visually consistent at desktop/mobile.
  - Ultraqa:
    - stale_state: refresh library and specs route after navigation.
    - dirty_worktree: capture status and protect duplicate CSS.
    - misleading_success_output: screenshots plus DOM text audit required.
    - malformed_input: invite email field invalid format if implemented.
    - prompt_injection: invite name/email text escapes if reflected.
    - hung_or_long_commands: dev-server cleanup.
    - flaky_tests: rerun support-page suite if route cache flakes.
    - cancel_resume: not applicable.
    - repeated_interruptions: note cross-worker shared primitive changes.
  - Artifacts:
    - `.omo/evidence/product-image-saas-ui-rollout-t5-red.txt`
    - `.omo/evidence/product-image-saas-ui-rollout-t5-green.txt`
    - `.omo/evidence/product-image-saas-ui-rollout-t5-library-desktop.png`
    - `.omo/evidence/product-image-saas-ui-rollout-t5-invite-mobile.png`
    - `.omo/evidence/product-image-saas-ui-rollout-t5-cleanup.txt`

- [x] 6. Uploads, archive, and SVG result discoverability
  - Tier: HEAVY
  - Dependencies: 1, 2, 3
  - Write scope:
    - `src/components/product-image-studio/ProductImageStudioUploadLibrary.tsx`
    - `src/components/product-image-studio/ProductImageStudioArchive.tsx`
    - `src/features/product-image-studio/server/uploadArchive.ts`
    - `src/features/product-image-studio/server/archivePageData.ts`
    - `src/lib/persistence/productImageStudioArchiveReadModels.ts`
    - `tests/product-image-studio/uploadArchive.test.ts`
    - `tests/product-image-studio/resultArchiveUi.test.ts`
    - `tests/product-image-studio/archivePageData.test.ts`
    - `tests/product-image-studio/downloads.test.ts`
  - Failing-first proof:
    - Add tests first that current archive fails to show a converted SVG result after conversion.
    - Add tests for SVG download action in result/archive cards.
    - Add tests that original PNG upload remains present and is not replaced by the SVG output.
  - Acceptance criteria:
    - Uploads page remains a clean image list.
    - Upload item actions can lead to design/template/SVG conversion paths without extra noisy helper buttons.
    - Result archive has a clear `결과 보관함` label and includes SVG results.
    - SVG result card offers `.svg` download and preview; PNG result card behavior remains unchanged.
    - Download manifests include SVG artifacts where appropriate.
  - Automated verification:
    - `npm test -- --run tests/product-image-studio/uploadArchive.test.ts tests/product-image-studio/resultArchiveUi.test.ts tests/product-image-studio/archivePageData.test.ts tests/product-image-studio/downloads.test.ts --fileParallelism=false`
    - `npm run typecheck`
  - Manual-QA channel:
    - Browser use plus HTTP call.
    - Exact invocation: `page.goto("http://127.0.0.1:<port>/product-image-studio/results"); page.getByRole("link", { name: /SVG/ }).click();`
    - PASS if archive lists the SVG conversion result after a fresh page load and SVG download response is `image/svg+xml`.
  - Ultraqa:
    - stale_state: verify after browser refresh and through API/read-model load.
    - dirty_worktree: capture status, do not touch duplicate CSS.
    - misleading_success_output: inspect downloaded SVG content and headers.
    - malformed_input: archive handles missing/old result metadata without crashing.
    - prompt_injection: result title/filename escapes in archive cards.
    - hung_or_long_commands: cleanup server/browser.
    - flaky_tests: rerun archive tests if fixture ordering flakes.
    - cancel_resume: not applicable unless conversion status is async.
    - repeated_interruptions: note if Todo 3 persistence changed mid-task.
  - Artifacts:
    - `.omo/evidence/product-image-saas-ui-rollout-t6-red.txt`
    - `.omo/evidence/product-image-saas-ui-rollout-t6-green.txt`
    - `.omo/evidence/product-image-saas-ui-rollout-t6-archive.png`
    - `.omo/evidence/product-image-saas-ui-rollout-t6-svg-download.http`
    - `.omo/evidence/product-image-saas-ui-rollout-t6-cleanup.txt`

- [x] 7. Responsive visual polish and copy reduction
  - Tier: HEAVY
  - Dependencies: 1, 2, 4, 5, 6
  - Write scope:
    - Product-image-studio CSS modules and copy in touched components only
    - Tests only where copy/layout contracts need updating
  - Failing-first proof:
    - Capture current desktop/mobile screenshots or DOM width audit showing target pages before final polish.
    - Add or update layout tests for no overflow where a test seam exists.
  - Acceptance criteria:
    - Pages visually align with the prototype and the user-requested Photoroom/Vercel style: light, compact, one blue accent, minimal text.
    - AI tools and support pages use cards that open modals or focused flows.
    - No text overlap or horizontal document overflow at 390px mobile and 1440px desktop.
    - No dark/purple-heavy palette, no decorative gradient orbs.
    - Operator-facing copy is Korean and concise.
  - Automated verification:
    - `npm test -- --run tests/product-image-studio/studioShell.test.ts tests/product-image-studio/aiTools.test.ts tests/product-image-studio/workspaceSupportPages.test.ts tests/product-image-studio/resultArchiveUi.test.ts --fileParallelism=false`
    - `npm run typecheck`
  - Manual-QA channel:
    - Browser use.
    - Exact invocation: `for (const route of ["/product-image-studio","/product-image-studio/ai-tools","/product-image-studio/batch","/product-image-studio/templates","/product-image-studio/uploads","/product-image-studio/library","/product-image-studio/results","/product-image-studio/usage","/product-image-studio/invite","/product-image-studio/settings"]) { await page.setViewportSize({ width: 390, height: 1200 }); await page.goto("http://127.0.0.1:<port>" + route); await page.screenshot({ path: ".omo/evidence/product-image-saas-ui-rollout-t7-" + route.replaceAll("/", "-") + "-mobile.png", fullPage: true }); await page.setViewportSize({ width: 1440, height: 1100 }); await page.screenshot({ path: ".omo/evidence/product-image-saas-ui-rollout-t7-" + route.replaceAll("/", "-") + "-desktop.png", fullPage: true }); }`
    - PASS if screenshots for home, AI tools, batch, 상품템플릿, uploads, library, results, usage, invite, and settings show no text overlap, no horizontal overflow, and a cohesive compact SaaS layout.
  - Ultraqa:
    - stale_state: rerun screenshots after last CSS changes.
    - dirty_worktree: exact changed-file audit.
    - misleading_success_output: include screenshot and computed width JSON.
    - hung_or_long_commands: cleanup browser/dev server.
    - flaky_tests: rerun screenshot script if network/dev-server boot races.
    - malformed_input: not applicable unless copy forms changed.
    - prompt_injection: not applicable.
    - cancel_resume: not applicable.
    - repeated_interruptions: note if final polish reconciles previous worker changes.
  - Artifacts:
    - `.omo/evidence/product-image-saas-ui-rollout-t7-desktop.png`
    - `.omo/evidence/product-image-saas-ui-rollout-t7-mobile.png`
    - `.omo/evidence/product-image-saas-ui-rollout-t7-width-audit.json`
    - `.omo/evidence/product-image-saas-ui-rollout-t7-green.txt`
    - `.omo/evidence/product-image-saas-ui-rollout-t7-cleanup.txt`

## Final Verification Wave

- [x] F1. Plan compliance and route map audit
  - Tier: HEAVY
  - Dependencies: all TODOs
  - Acceptance criteria:
    - Every visible menu item and every compatibility route in this plan is implemented or explicitly preserved.
    - No old visible primary sidebar labels remain unless intentionally hidden as route content.
    - SVG conversion is present in AI tools and is not only a hidden download route.
  - Verification:
    - `rg -n "홈|AI 도구|일괄처리|상품템플릿|업로드|라이브러리|결과 보관함|회원초대|SVG 변환" src/components src/app tests/product-image-studio`
    - `npm test -- --run tests/product-image-studio/studioShell.test.ts tests/product-image-studio/aiTools.test.ts tests/product-image-studio/resultArchiveRoutes.test.ts --fileParallelism=false`
  - Manual-QA:
    - Exact invocation: `for (const route of ["/product-image-studio","/product-image-studio/ai-tools","/product-image-studio/batch","/product-image-studio/templates","/product-image-studio/uploads","/product-image-studio/library","/product-image-studio/results","/product-image-studio/usage","/product-image-studio/invite","/product-image-studio/settings","/product-image-studio/activity","/product-image-studio/designs","/product-image-studio/projects","/product-image-studio/specs"]) { await page.goto("http://127.0.0.1:<port>" + route); const body = await page.locator("body").innerText(); if (!body.includes("상품 이미지") && !body.includes("AI 도구") && !body.includes("결과")) throw new Error(route + " did not render expected workspace text"); }`
    - PASS if every visible route and compatibility route renders inside the product-image-studio shell and the primary nav shows the approved menu labels.
  - Artifact: `.omo/evidence/product-image-saas-ui-rollout-f1-plan-compliance.txt`

- [x] F2. Vector SVG safety and persistence audit
  - Tier: HEAVY
  - Dependencies: all TODOs
  - Acceptance criteria:
    - PNG upload-to-SVG conversion uses uploaded bytes.
    - SVG contains vector primitives and no embedded raster payload.
    - Sanitizer rejects unsafe SVG output.
    - Archive/download path survives refresh.
  - Verification:
    - `npm test -- --run tests/product-image-studio/vectorSvg.test.ts tests/product-image-studio/svgAssetSanitizer.test.ts tests/product-image-studio/fileStoreGenerated.test.ts tests/product-image-studio/downloads.test.ts tests/product-image-studio/svgConversionRoute.test.ts --fileParallelism=false`
    - HTTP proof against local route and archive download.
  - Manual-QA:
    - `curl -i -F "file=@.omo/fixtures/seal-sticker.png;type=image/png" -F "style=sticker" http://127.0.0.1:<port>/api/product-image-studio/svg-conversions`
    - PASS if the response is 200, the returned or saved SVG contains vector primitives, does not contain `<image`, `data:image`, or `base64`, and a fresh `/product-image-studio/results` page load can reach the SVG download.
  - Artifact: `.omo/evidence/product-image-saas-ui-rollout-f2-vector-audit.txt`

- [x] F3. Full automated verification
  - Tier: HEAVY
  - Dependencies: all TODOs
  - Acceptance criteria:
    - Typecheck, full tests, and build pass on the final tree.
    - Existing provider/generation safety tests still pass.
    - No secrets, env values, API keys, auth headers, or cookies are printed to evidence.
  - Verification:
    - `npm run typecheck`
    - `npm test -- --run`
    - `npm run build`
  - Manual-QA:
    - Exact invocation: `page.goto("http://127.0.0.1:<port>/product-image-studio/ai-tools"); page.getByRole("button", { name: /SVG 변환/ }).click(); page.keyboard.press("Escape"); page.goto("http://127.0.0.1:<port>/product-image-studio/results");`
    - PASS if the AI tool modal opens/closes and the results route renders without client errors after full test/build.
  - Artifact: `.omo/evidence/product-image-saas-ui-rollout-f3-full-verification.txt`

- [x] F4. Global review and debugging gate
  - Tier: HEAVY
  - Dependencies: F1, F2, F3
  - Acceptance criteria:
    - `review-work` lanes pass or blockers are fixed and rerun.
    - Runtime debugging audit names at least three hypotheses and records evidence that confirms or refutes them.
    - No QA server, browser, temp file, port, or spawned agent is left running.
  - Required debugging hypotheses:
    - H1: stale route or build cache shows old sidebar labels.
    - H2: SVG conversion reports success while embedding the PNG raster.
    - H3: archive shows SVG only in memory and loses it after refresh.
    - H4: provider/write gate is accidentally opened or called.
  - Verification:
    - Exact invocation: `page.goto("http://127.0.0.1:<port>/product-image-studio"); const homeText = await page.locator("body").innerText(); page.goto("http://127.0.0.1:<port>/product-image-studio/ai-tools"); await page.getByRole("button", { name: /SVG 변환/ }).click(); await page.keyboard.press("Escape");`
    - HTTP invocation: `curl -i -F "file=@.omo/fixtures/card-front.png;type=image/png" -F "style=line_art" http://127.0.0.1:<port>/api/product-image-studio/svg-conversions`
    - PASS if review lanes pass, stale sidebar labels are absent from the visible primary nav, SVG output is vector-only, results survive a fresh route load, provider gate state is unchanged, and all QA resources are cleaned up.
  - Artifact: `.omo/evidence/product-image-saas-ui-rollout-f4-review-debugging.txt`

## Completion Criteria

- All top-level TODO and Final Verification Wave boxes are checked.
- `.omo/start-work/ledger.jsonl` has evidence for every checkbox.
- Boulder marks `product-image-saas-ui-rollout` completed only after F4 passes.
- If the user later asks for commit/push, exact-path stage only the relevant source/test/plan/evidence files and leave unrelated historical `.omo` and duplicate CSS artifacts alone.
