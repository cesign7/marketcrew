---
slug: product-image-studio-photoroom-ai-tools-runtime
status: approved
approved_by: user
approved_at: 2026-06-17
mode: start-work
tier: HEAVY
source_draft: .omo/drafts/product-image-studio-photoroom-ai-tools-runtime.md
---

# Product Image Studio Photoroom AI Tools Runtime

## Objective

Make the Photoroom-like AI tools modal actually generate and display results in place.

The immediate user-visible fix is:

- A user can open an AI tool, upload a design/reference image when needed, enter a prompt, choose model/count/ratio/resolution, click generate, and see the generated API result in the right preview area without leaving the modal.
- The right preview must never present the uploaded reference image as if it were the generated result.
- Future tools with no backend workflow must be visible as `준비 중` or disabled, not fake-operable.

Do not call paid providers in automated QA. Use API interception for browser proof unless the user explicitly asks for a real provider test.

## Source Findings

1. The modal is disconnected from real generation.
   - `src/components/product-image-studio/ProductImageStudioAiToolWorkspaceModal.tsx` switches `generating` to `ready` through a timer and does not call `startProductImageStudioImageGeneratorGeneration`.

2. Prompt and instruction fields are not readable by the modal runtime.
   - `src/components/product-image-studio/ProductImageStudioAiToolGeneratorControls.tsx` uses uncontrolled `defaultValue` inputs.

3. Uploaded assets lose their original `File`.
   - `src/components/product-image-studio/ProductImageStudioAiToolUploads.tsx` keeps display metadata but not the `File` needed by the shared generator client.

4. The right panel uses input previews as fake output.
   - `src/components/product-image-studio/ProductImageStudioAiToolPreviewPanel.tsx` renders uploaded `previewUrl` while the modal phase says ready.

5. A real generator client already exists.
   - `src/features/product-image-studio/client/imageGeneratorApi.ts` posts multipart requests to `/api/product-image-studio/image-generator/generations`.
   - `src/components/product-image-studio/ProductImageStudioImageGenerator.tsx` already renders generated `previewUrl`, download, and vector SVG links.

6. Tool availability and options are inconsistent.
   - `src/components/product-image-studio/ProductImageStudioAiToolCatalog.ts` marks several tools as `계획`, but the hub can still make them appear operable.
   - `src/components/product-image-studio/ProductImageStudioAiToolWorkspaceOptions.ts` includes counts and ratios that do not match the image generator domain contract in `src/features/product-image-studio/domain/imageGenerator.ts`.

## Product Decisions

1. Implement only the generator-backed tools in this wave:
   - `상품 설정샷 생성`
   - `AI 이미지 생성기`
   - `SVG 변환` if its current local conversion workflow already exists

2. Mark these as visible but not runnable until their backend workflows are separately implemented:
   - `배경/소품 생성`
   - `비율 변경`
   - `비슷한 이미지 생성`
   - `목업 합성`
   - `상세 이미지 블록`

3. Uploaded images are inputs. Generated results are outputs.
   - Input thumbnails stay in the left/source area.
   - Generated `previewUrl`, `downloadUrl`, and `vectorSvgUrl` render in the right result area.

4. Keep provider safety.
   - Do not expose API keys.
   - Do not alter provider write gate defaults.
   - Browser QA intercepts the generation route and returns deterministic generated URLs.

## Dirty Worktree Boundary

Before editing, every worker must capture `git status --short`.

Known pre-existing dirt includes many `.omo/` drafts/plans/evidence files, static prototypes under `docs/02-design/`, and `src/components/product-image-studio/ProductImageStudioUploadLibrary.module 2.css`. Workers must not revert or stage unrelated files.

## Test And QA Baseline

Targeted files likely affected:

- `src/components/product-image-studio/ProductImageStudioAiTools.tsx`
- `src/components/product-image-studio/ProductImageStudioAiToolWorkspaceModal.tsx`
- `src/components/product-image-studio/ProductImageStudioAiToolGeneratorControls.tsx`
- `src/components/product-image-studio/ProductImageStudioAiToolUploads.tsx`
- `src/components/product-image-studio/ProductImageStudioAiToolPreviewPanel.tsx`
- `src/components/product-image-studio/ProductImageStudioAiToolCatalog.ts`
- `src/components/product-image-studio/ProductImageStudioAiToolWorkspaceOptions.ts`
- `src/features/product-image-studio/client/imageGeneratorApi.ts`
- `src/features/product-image-studio/domain/imageGenerator.ts`
- `tests/product-image-studio/aiTools.test.ts`
- `tests/product-image-studio/generationUi.test.ts`
- new focused tests under `tests/product-image-studio/` if needed

Final commands:

- `npm run typecheck`
- `npm test -- --run`
- `npm run build`

## TODOs

- [x] 1. Modal generation runtime and failing-first regression
  - Tier: HEAVY
  - Dependencies: none
  - Write scope:
    - `src/components/product-image-studio/ProductImageStudioAiToolWorkspaceModal.tsx`
    - `src/components/product-image-studio/ProductImageStudioAiToolGeneratorControls.tsx`
    - `src/components/product-image-studio/ProductImageStudioAiToolUploads.tsx`
    - `src/components/product-image-studio/ProductImageStudioAiToolPreviewPanel.tsx`
    - `src/features/product-image-studio/client/imageGeneratorApi.ts` only if parser typing needs reuse
    - `tests/product-image-studio/aiTools.test.ts`
    - new `tests/product-image-studio/aiToolRuntime.test.ts` or equivalent
  - Failing-first proof:
    - Add a test or browser-captured failure first showing current behavior: upload/reference + prompt + generate does not call `/api/product-image-studio/image-generator/generations`, and the ready preview can still show an uploaded object URL.
    - The red artifact must be captured before production code changes.
  - Acceptance criteria:
    - Prompt and instruction fields are controlled and included in generation request state.
    - Uploaded assets retain their original `File` for multipart submission while still showing input thumbnails.
    - Clicking generate for a generator-backed tool calls `startProductImageStudioImageGeneratorGeneration`.
    - The modal has explicit phases for idle, generating, ready, partial, blocked, and failed states.
    - The right result panel renders generated `previewUrl`, `downloadUrl`, and `vectorSvgUrl` from the API response.
    - The right result panel does not use uploaded `blob:`/object URLs as generated output.
    - Korean error copy is concise and user-safe.
  - Automated verification:
    - `npm test -- --run tests/product-image-studio/aiTools.test.ts tests/product-image-studio/aiToolRuntime.test.ts --fileParallelism=false`
    - `npm run typecheck`
  - Manual-QA channel:
    - Browser use via Chrome or Playwright.
    - Exact invocation shape: start the app on `http://127.0.0.1:<port>`, then run a Playwright script that performs `page.goto("http://127.0.0.1:<port>/product-image-studio/ai-tools")`, `page.route("**/api/product-image-studio/image-generator/generations", handlerReturningReadyGeneratedResult)`, `page.getByRole("button", { name: /AI 이미지 생성기|상품 설정샷/ }).click()`, `page.getByLabel(/디자인|참고 이미지/).setInputFiles(".omo/fixtures/card-front.png")`, `page.getByLabel(/프롬프트/).fill("연하장 카드 프리미엄 테이블 설정샷")`, `page.getByRole("button", { name: /생성/ }).click()`.
    - PASS if the intercepted request contains prompt text and file data, the right panel renders the generated preview URL from the mocked response, and no generated-result element uses the uploaded `blob:` URL.
  - Ultraqa:
    - malformed_input: submit empty prompt, unsupported response shape, and missing result URLs; assert safe Korean errors or blocked state.
    - stale_state: generate once, change prompt/upload, generate again; assert old generated output is not shown as the new result.
    - dirty_worktree: capture pre/post `git status --short` and prove unrelated `.omo`/prototype dirt is untouched.
    - hung_or_long_commands: capture dev-server PID/port and cleanup.
    - misleading_success_output: browser artifact must include the intercepted request payload summary and actual right-panel image/link observations.
    - flaky_tests: rerun the focused runtime test once if it fails from async timing.
    - prompt_injection: not applicable unless untrusted external page text is consumed.
    - cancel_resume: not applicable unless abort/cancel is added.
    - repeated_interruptions: note whether work resumed from partial test/code state.
  - Artifacts:
    - `.omo/evidence/product-image-ai-tools-runtime-t1-red.txt`
    - `.omo/evidence/product-image-ai-tools-runtime-t1-green.txt`
    - `.omo/evidence/product-image-ai-tools-runtime-t1-browser.json`
    - `.omo/evidence/product-image-ai-tools-runtime-t1-preview.png`
    - `.omo/evidence/product-image-ai-tools-runtime-t1-cleanup.txt`

- [x] 2. Shared option contract and supported-tool gating
  - Tier: HEAVY
  - Dependencies: 1
  - Write scope:
    - `src/components/product-image-studio/ProductImageStudioAiToolCatalog.ts`
    - `src/components/product-image-studio/ProductImageStudioAiToolWorkspaceOptions.ts`
    - `src/components/product-image-studio/ProductImageStudioAiTools.tsx`
    - `src/features/product-image-studio/domain/imageGenerator.ts`
    - `tests/product-image-studio/aiTools.test.ts`
    - new option-contract tests under `tests/product-image-studio/`
  - Failing-first proof:
    - Add a test proving unsupported options such as count `8` or ratio `original` are currently selectable for a generator request or not explicitly blocked.
    - Add a test proving `계획` tools can appear runnable.
  - Acceptance criteria:
    - Generator-backed tools expose only supported count, ratio, model, and resolution values or map values explicitly with validation.
    - Future tools show `준비 중`/disabled state and do not open a fake generation workflow.
    - Disabled tool copy explains that the workflow will be added later without pretending generation happened.
    - The current usable tools remain easy to identify.
  - Automated verification:
    - `npm test -- --run tests/product-image-studio/aiTools.test.ts tests/product-image-studio/aiToolOptions.test.ts --fileParallelism=false`
    - `npm run typecheck`
  - Manual-QA channel:
    - Browser use.
    - Exact invocation shape: `page.goto("http://127.0.0.1:<port>/product-image-studio/ai-tools")`, `page.getByRole("button", { name: /배경\\/소품/ }).click()`, then inspect the modal/card state.
    - PASS if future tools do not expose a generate button and usable tools expose only supported option chips.
  - Ultraqa:
    - malformed_input: directly test invalid option values passed into option readers or request mappers.
    - stale_state: switch from usable tool to disabled tool and back; assert previous generated state is cleared.
    - dirty_worktree: pre/post status capture.
    - misleading_success_output: browser artifact must show disabled/future state, not only unit output.
    - hung_or_long_commands: dev-server cleanup receipt.
    - flaky_tests: rerun focused option test once on async failure.
    - prompt_injection: not applicable.
    - cancel_resume: not applicable.
    - repeated_interruptions: note if partial option contract edits were resumed.
  - Artifacts:
    - `.omo/evidence/product-image-ai-tools-runtime-t2-red.txt`
    - `.omo/evidence/product-image-ai-tools-runtime-t2-green.txt`
    - `.omo/evidence/product-image-ai-tools-runtime-t2-browser.json`
    - `.omo/evidence/product-image-ai-tools-runtime-t2-cleanup.txt`

- [x] 3. Result actions, error recovery, and visual polish
  - Tier: HEAVY
  - Dependencies: 1, 2
  - Write scope:
    - `src/components/product-image-studio/ProductImageStudioAiToolPreviewPanel.tsx`
    - `src/components/product-image-studio/ProductImageStudioAiToolWorkspaceModal.tsx`
    - related CSS modules under `src/components/product-image-studio/`
    - `tests/product-image-studio/aiTools.test.ts`
    - new focused UI tests if needed
  - Failing-first proof:
    - Add a test proving a failed or malformed generation response currently cannot be distinguished from a fake ready state or does not produce a clear Korean error.
  - Acceptance criteria:
    - Generated image cards include preview, download, and SVG download actions when URLs exist.
    - Failed/blocked/partial responses render different concise Korean messages.
    - Upload previews stay visually separated from generated results.
    - Modal remains large enough for preview, with no awkward overflow at desktop 1440px and mobile 390px.
    - No nested card-in-card layout is introduced.
  - Automated verification:
    - `npm test -- --run tests/product-image-studio/aiTools.test.ts tests/product-image-studio/generationUi.test.ts --fileParallelism=false`
    - `npm run typecheck`
  - Manual-QA channel:
    - Browser use.
    - Exact invocation shape: intercept one ready response and one failed response on `/api/product-image-studio/image-generator/generations`; use `page.getByRole("button", { name: /생성/ }).click()` for each.
    - PASS if ready response shows generated result actions and failed response shows a Korean error without keeping stale generated imagery.
  - Ultraqa:
    - malformed_input: malformed JSON or missing result array from intercepted route.
    - stale_state: failed second request must clear or mark old result instead of pretending it belongs to the new prompt.
    - dirty_worktree: pre/post status capture.
    - hung_or_long_commands: dev-server cleanup receipt.
    - misleading_success_output: artifact must include screenshots or DOM dump of result action labels.
    - flaky_tests: rerun focused UI test once if timing-sensitive.
    - prompt_injection: not applicable.
    - cancel_resume: not applicable unless request abort is added.
    - repeated_interruptions: note resumed partial UI/CSS state.
  - Artifacts:
    - `.omo/evidence/product-image-ai-tools-runtime-t3-red.txt`
    - `.omo/evidence/product-image-ai-tools-runtime-t3-green.txt`
    - `.omo/evidence/product-image-ai-tools-runtime-t3-ready.png`
    - `.omo/evidence/product-image-ai-tools-runtime-t3-failed.png`
    - `.omo/evidence/product-image-ai-tools-runtime-t3-cleanup.txt`

- [x] 4. Cross-tool runtime regression and archive compatibility
  - Tier: HEAVY
  - Dependencies: 1, 2, 3
  - Write scope:
    - `src/components/product-image-studio/ProductImageStudioAiTools.tsx`
    - modal/runtime files touched by prior tasks only as needed
    - existing archive/result integration files only if a regression is found
    - `tests/product-image-studio/aiTools.test.ts`
    - `tests/product-image-studio/resultArchiveUi.test.ts`
    - `tests/product-image-studio/uploadArchive.test.ts`
  - Failing-first proof:
    - Add or capture a regression scenario proving generated output from the modal is distinguishable from upload-library assets and does not break existing archive rendering.
  - Acceptance criteria:
    - AI 이미지 생성기 and 상품 설정샷 share the same reliable runtime without duplicated fake timers.
    - Existing SVG conversion and archive pages continue to render.
    - Upload library assets remain inputs and are not overwritten by generated output.
    - No provider key or env value is rendered or logged.
  - Automated verification:
    - `npm test -- --run tests/product-image-studio/aiTools.test.ts tests/product-image-studio/resultArchiveUi.test.ts tests/product-image-studio/uploadArchive.test.ts --fileParallelism=false`
    - `npm run typecheck`
  - Manual-QA channel:
    - Browser use.
    - Exact invocation shape: run the intercepted modal generation scenario for both `AI 이미지 생성기` and `상품 설정샷`, then navigate with `page.goto("http://127.0.0.1:<port>/product-image-studio/archive")`.
    - PASS if both tools show generated previews in-modal and archive/upload pages still render without server error.
  - Ultraqa:
    - stale_state: switching tools clears generated output and input previews correctly.
    - dirty_worktree: pre/post status capture.
    - misleading_success_output: artifact must include both tool names and generated preview URL observations.
    - hung_or_long_commands: dev-server cleanup receipt.
    - flaky_tests: rerun focused cross-tool test once on timing failure.
    - malformed_input: covered by prior route/response probes unless new parser is added.
    - prompt_injection: not applicable.
    - cancel_resume: not applicable.
    - repeated_interruptions: note if resumed after prior incomplete workers.
  - Artifacts:
    - `.omo/evidence/product-image-ai-tools-runtime-t4-red.txt`
    - `.omo/evidence/product-image-ai-tools-runtime-t4-green.txt`
    - `.omo/evidence/product-image-ai-tools-runtime-t4-browser.json`
    - `.omo/evidence/product-image-ai-tools-runtime-t4-cleanup.txt`

## Final Verification Wave

- [x] F1. Full verification and production-safety audit
  - Tier: HEAVY
  - Dependencies: 1, 2, 3, 4
  - Write scope:
    - `.omo/evidence/`
    - `.omo/start-work/ledger.jsonl`
    - no product code unless a verified failure loops back to the relevant TODO
  - Acceptance criteria:
    - All TODO artifacts exist and are attributable to this plan.
    - No generated browser QA used a real paid provider call.
    - Provider write gate defaults and secret handling remain unchanged.
    - No unrelated dirty files were reverted or staged.
    - The modal result area is proven to show generated API output, not uploaded input preview.
  - Automated verification:
    - `npm run typecheck`
    - `npm test -- --run`
    - `npm run build`
  - Manual-QA channel:
    - Browser use via Chrome or Playwright.
    - Exact invocation shape: run one end-to-end intercepted generation flow from `/product-image-studio/ai-tools` and capture final screenshot plus JSON summary.
    - PASS if request, generated preview, result actions, disabled future tools, and cleanup are all observed in one artifact set.
  - Ultraqa:
    - malformed_input: final malformed response check points to recorded TODO evidence.
    - stale_state: final two-generation check points to recorded TODO evidence.
    - dirty_worktree: final `git status --short` captured with intended paths only.
    - hung_or_long_commands: prove no QA dev server/browser listeners remain.
    - misleading_success_output: final browser artifact required.
    - flaky_tests: rerun any single flaky focused suite once and record outcome.
    - prompt_injection: not applicable unless external untrusted text was added.
    - cancel_resume: not applicable unless abort/cancel was added.
    - repeated_interruptions: record any restarted worker lanes.
  - Artifacts:
    - `.omo/evidence/product-image-ai-tools-runtime-f1-typecheck.txt`
    - `.omo/evidence/product-image-ai-tools-runtime-f1-tests.txt`
    - `.omo/evidence/product-image-ai-tools-runtime-f1-build.txt`
    - `.omo/evidence/product-image-ai-tools-runtime-f1-browser.json`
    - `.omo/evidence/product-image-ai-tools-runtime-f1-debugging.txt`
    - `.omo/evidence/product-image-ai-tools-runtime-f1-cleanup.txt`
