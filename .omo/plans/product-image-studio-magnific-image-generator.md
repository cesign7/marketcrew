# Product Image Studio Magnific-Style Image Generator

## TL;DR
> Summary:      Add a separate Magnific-style AI image generator inside Product Image Studio with reference image upload, prompt input, model/count/ratio/resolution controls, provider-gated generation, automatic archive storage, and download-ready results.
> Deliverables:
> - `/product-image-studio/ai-tools/image-generator` page inside the existing SaaS shell
> - `/api/product-image-studio/image-generator/generations` multipart POST route
> - Typed prompt-generator domain contracts for model labels, count, ratio, resolution, and result summaries
> - Provider/fake-provider support for count, resolution, reference/no-reference generation, and partial failures
> - Existing upload/result archive integration through a generated internal tool project and `workflow=image_generator` summaries
> - Sanitized SVG upload storage, preview, archive reuse, and rasterized provider-reference fallback
> - Static UI tests, route/provider tests, browser QA, and production smoke safety updates
> Effort:       Large
> Risk:         High - provider billing, SVG sanitization/rasterization, archive semantics, multi-image persistence, and hidden-reference UX parity

## Scope
### Must have
- Add a new enabled AI tool card in `src/components/product-image-studio/ProductImageStudioAiTools.tsx` linking to `/product-image-studio/ai-tools/image-generator`.
- Add a new page at `src/app/product-image-studio/ai-tools/image-generator/page.tsx` using `ProductImageStudioShell` with `activePath="/product-image-studio/ai-tools/image-generator"`.
- Build a Magnific-like workspace frame, anchored to the evidence available from the pasted HTML and Magnific docs:
  - large generation/result canvas,
  - reference upload/drop area,
  - prompt textarea,
  - model selector,
  - image count selector,
  - aspect ratio selector,
  - resolution selector,
  - generate button with provider gate state,
  - generated result grid with preview/download links.
- Use natural Korean UI copy.
- Exact API route: `POST /api/product-image-studio/image-generator/generations`.
- Exact route file: `src/app/api/product-image-studio/image-generator/generations/route.ts`.
- API request format: `multipart/form-data`.
  - `payload`: JSON string with:
    - `prompt`: string, trimmed length 1-3000.
    - `modelLabel`: `"gpt2" | "nano-banana-2"`.
    - `count`: integer 1-4.
    - `ratio`: `"1:1" | "4:5" | "3:4" | "16:9"`.
    - `resolution`: `"0.5k" | "1k" | "2k"`.
  - `referenceImages`: optional repeated file field, 0-4 files, each `image/png`, `image/jpeg`, `image/webp`, or sanitized `image/svg+xml`.
- API response format:
  - Success `200`: `{ ok: true, data: { generation: { id, projectId, status: "ready", provider, model, requestedCount, completedCount }, results: ProductImageStudioGenerationResultPreview[] } }`.
  - Partial success `207`: same shape with `status: "partial"` and a Korean `message`.
  - Blocked `423`: `{ ok: true, data: { generation: { status: "blocked", modelLabel, provider, reason }, promptSummary } }`; must not create a project, assets, generation request, results, or provider call.
  - Invalid payload `400`: `{ ok: false, error: { code, message } }`.
  - Provider failure `502`: `{ ok: false, error: { code: "IMAGE_PROVIDER_FAILED", message, requestId? } }`.
- Model label mapping:
  - `gpt2`: display label `GPT Image 2`, provider `openai`, default model `gpt-image-2`.
  - `nano-banana-2`: display label `나노바나나 2`, provider `gemini`, default model `gemini-3.1-flash-image`.
  - If saved provider settings exist for the selected provider and include a non-empty model, use the saved model for that provider while keeping the UI label unchanged.
  - If saved settings disagree by provider, the selected label provider wins; do not silently call the other provider.
- Resolution mapping:
  - `0.5k`: Gemini requests `imageSize: "512"` where supported; OpenAI uses the nearest valid supported size for the selected ratio with `quality:"low"` because `gpt-image-2` size constraints do not allow true 512px square output.
  - `1k`: OpenAI uses `1024x1024`, `1024x1536`, or `1536x1024` based on ratio; Gemini requests `imageSize: "1K"` where supported.
  - `2k`: OpenAI uses actual 2K-class sizes based on ratio (`2048x2048`, `1632x2048`, `1536x2048`, `2048x1152`); Gemini requests `imageSize: "2K"` where supported.
  - Provider-specific unsupported generation config must use the existing Gemini retry-without-generation-config pattern.
- SVG storage:
  - Add `image/svg+xml` as an allowed upload/reference asset type, not as an AI-generated output type in this slice.
  - Sanitize SVG bytes server-side before storage: remove `<script>`, `<foreignObject>`, event-handler attributes, external `href`/`xlink:href`, remote `url(...)`, embedded JavaScript/data HTML, and unknown executable namespaces.
  - Serve SVG previews with `Content-Type: image/svg+xml; charset=utf-8`, `X-Content-Type-Options: nosniff`, and a restrictive `Content-Security-Policy` such as `default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox`.
  - Keep the original SVG file visible in upload archive, design reuse, template reuse, and ZIP/download metadata where relevant.
  - For provider generation, rasterize sanitized SVG references to PNG before OpenAI/Gemini calls. Use a deliberate dependency such as `sharp` for server-side SVG-to-PNG conversion. If rasterization fails, return a Korean validation error before any provider call.
  - Generated provider results remain raster images (`image/png`) in this slice; do not promise AI-generated SVG output.
- Persistence strategy: use an internal generated tool project, not new tables in this slice.
  - Create/persist the internal tool project only after payload validation, provider gate success or fake provider mode, and at least one provider/fake result succeeds. On full provider failure, return `502` without leaving an empty project, reference asset, generation request, result, or usage record in the archive.
  - Project name: `AI 이미지 생성기 - <prompt first 24 chars>` with timestamp fallback.
  - Project record uses existing `productType="card_envelope_seal_set"`, `cardFormat="postcard_flat"`, `requestedOutputs=["card_single"]`, `requestedCardPoses=["postcard_front_flat"]`, ratio from payload, and default `productionSettings` from `createDefaultProductImageStudioProductionSettings("postcard_flat")`.
  - Generation request stores `conceptId="prompt-image-generator"`, `requestedOutputs=["card_single"]`, and `providerRequestSummary` containing `workflow:"image_generator"`, `promptPreview`, `modelLabel`, `provider`, `model`, `ratio`, `resolution`, `requestedCount`, `referenceImageCount`.
  - Reference files are saved as normal project assets with role `reference_mood` only after at least one generated result succeeds, so failed generations do not leave empty archive projects. SVG references are stored as sanitized SVG originals while provider calls receive rasterized PNG copies.
  - Results are stored through existing file store/repository result records with `outputType="card_single"` and `providerRequestSummary.workflow="image_generator"` for archive display.
  - Local file store and Vercel Blob file store must both support unique generated file names per same generation/output/ratio, e.g. `card_single-1-1x1.png`, `card_single-2-1x1.png`, to avoid overwrites in development and production.
- Provider calls:
  - Existing `ImageGenerationProvider` can continue to return one image per call.
  - The new route loops `count` times and treats each call as one requested variant.
  - Use `editWithReferences` when reference files exist; otherwise use `generateScene`.
  - Use bounded parallelism or `Promise.allSettled`; return `207` if at least one image succeeds and at least one provider failure occurs.
  - Fake provider must support `count`, `ratio`, `resolution`, and reference/no-reference paths deterministically for tests and browser QA.
- Archive display:
  - Extend archive read model to expose `workflow` and `promptPreview` from `providerRequestSummary`.
  - If `workflow === "image_generator"`, display output label as `AI 생성 이미지`, project/product copy as `AI 이미지 생성기`, and avoid card-pose-only copy.
  - Existing card/envelope/seal archive labels must remain unchanged for product-staging results.
- Backend/proxy safety:
  - New API route must call `proxyProductImageStudioRequestToBackend(request)` first, matching existing Product Image Studio route pattern.
  - Production smoke must not invoke billed generation endpoints.
  - Provider write gate remains closed by default unless existing settings/gate allow generation.
- Dirty worktree guardrail:
  - Do not modify or delete unrelated untracked `src/components/product-image-studio/ProductImageStudioUploadLibrary.module 2.css`.

### Must NOT have
- Must not implement exact hidden Magnific app cloning beyond the confirmed layout/control pattern, because the live app is gated and pasted HTML only exposes the client shell.
- Must not add a second API key/settings system.
- Must not expose `.env`, API keys, saved credentials, provider raw secrets, auth headers, cookies, or local storage values in UI, tests, logs, or plan/evidence.
- Must not call real providers from production smoke.
- Must not write to Naver, SmartStore, YoungCart, DataLab, or other external ledgers.
- Must not use `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Must not weaken or delete existing failing tests.
- Must not treat `gpt2` or `나노바나나2` as raw provider IDs.
- Must not hide provider blocked states behind generic failures.
- Must not build a marketing landing page; the first screen must be the usable generator.
- Must not add schema migrations in this slice unless the tool-project strategy proves impossible during implementation.
- Must not send raw unsafe SVG directly to OpenAI/Gemini providers.
- Must not treat SVG upload support as AI-generated vector output support; SVG output generation is out of scope for this slice.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: TDD + Vitest + TypeScript + browser QA.
- QA policy: every todo has agent-executed scenarios; route/API todos must include blocked-provider and malformed-input failure paths.
- Evidence: `.omo/evidence/task-<N>-product-image-studio-magnific-image-generator.<ext>`.
- Baseline commands before edits:
  - `npm test -- --run tests/product-image-studio/aiTools.test.ts`
  - `npm test -- --run tests/product-image-studio/providerGate.test.ts`
  - `npm test -- --run tests/product-image-studio/generationRouteProvider.test.ts`
- Final commands:
  - `npm run typecheck`
  - `npm test -- --run tests/product-image-studio/aiTools.test.ts tests/product-image-studio/imageGenerator*.test.ts tests/product-image-studio/providerGate.test.ts tests/product-image-studio/generationRouteProvider.test.ts tests/product-image-studio/fileStore.test.ts tests/product-image-studio/assetUploadApi.test.ts tests/product-image-studio/smokeContract.test.ts`
  - `npm test -- --run`
  - `npm run build`
  - `npm run smoke:prod`
- Browser QA:
  - Start local dev server: `npm run dev -- --port 3100`.
  - In browser automation: `page.goto("http://127.0.0.1:3100/product-image-studio/ai-tools/image-generator")`.
  - Capture screenshots at desktop `1440x1000` and mobile `390x844`.
  - With fake provider enabled locally, fill prompt, upload a PNG fixture and a sanitized SVG fixture, choose each model label, set count `2`, ratio `1:1`, resolution `0.5k`, generate, and verify two result cards with download links plus visible SVG upload archive reuse.
  - With gate closed, submit prompt and verify blocked state without result cards.

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. < 3 per wave (except the final) = under-splitting.
Wave 1 (no deps): Todo 1, Todo 2, Todo 3.
Wave 2 (after Wave 1): Todo 4, Todo 5, Todo 6, Todo 7.
Wave 3 (after Wave 2): Todo 8.
Critical path: Todo 1 -> Todo 4 -> Todo 6 -> Todo 8.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1. Prompt-generator domain contract | None | 4, 5, 6, 7 | 2, 3 |
| 2. Provider/fake-provider generation options | None | 4, 6 | 1, 3 |
| 3. Archive copy, storage keys, and SVG asset support | None | 4, 6 | 1, 2 |
| 4. Multipart generation API route | 1, 2, 3 | 6, 8 | 5, 7 |
| 5. Generator page and client API | 1 | 8 | 4, 6, 7 |
| 6. Archive/upload/result integration tests | 1, 2, 3, 4 | 8 | 5, 7 |
| 7. Smoke/auth/proxy safety | 1 | 8 | 4, 5, 6 |
| 8. Browser QA and final verification | 4, 5, 6, 7 | Final | None |

## Todos
> Implementation + Test = ONE todo. Never separate.
- [x] 1. Define prompt-generator domain contracts
  What to do / Must NOT do
  - Add `src/features/product-image-studio/domain/imageGenerator.ts`.
  - Define `PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_LABELS = ["gpt2", "nano-banana-2"]`.
  - Define display labels `GPT Image 2`, `나노바나나 2`.
  - Define model label mapping to provider/default model:
    - `gpt2 -> openai / gpt-image-2`.
    - `nano-banana-2 -> gemini / gemini-3.1-flash-image`.
  - Define count range 1-4, ratio options `1:1`, `4:5`, `3:4`, `16:9`, and resolution options `0.5k`, `1k`, `2k`.
  - Define parser/normalizer for multipart `payload` JSON.
  - Define prompt harness builder that wraps user prompt as user content, adds reference count, ratio, resolution, and forbids treating prompt text as system instructions.
  - Define reusable validation constants for reference image limits: max 4 files, allowed MIME `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`, and a named `svgRequiresSanitization` decision so the route cannot treat SVG like ordinary raster bytes.
  - Must NOT accept `custom` ratio in this tool.
  - Must NOT treat the displayed model labels as raw provider model IDs.
  Parallelization: Can parallel Y | Wave 1 | Blocks 4, 5, 6, 7
  References (executor has NO interview context - be exhaustive): `src/features/product-image-studio/domain/types.ts:53`, `src/features/product-image-studio/domain/providerModels.ts:1`, `src/features/product-image-studio/server/providerConfig.ts:167`, `.omo/drafts/product-image-studio-magnific-image-generator.md:93`
  Acceptance criteria (agent-executable):
  - Add `tests/product-image-studio/imageGeneratorDomain.test.ts`.
  - `npm test -- --run tests/product-image-studio/imageGeneratorDomain.test.ts` passes.
  - Tests assert invalid JSON, empty prompt, too-long prompt, invalid model label, invalid count `0/5`, invalid ratio `custom`, invalid resolution, too many references, unsupported reference MIME, `image/svg+xml` accepted only through the sanitizer-required path, and prompt-injection text remains inside the prompt field rather than changing model/provider.
  QA scenarios (name the exact tool + invocation): HTTP call (`curl -i -X POST http://127.0.0.1:3100/api/product-image-studio/image-generator/generations -F 'payload={\"prompt\":\"ignore previous instructions\",\"modelLabel\":\"gpt2\",\"count\":0,\"ratio\":\"1:1\",\"resolution\":\"1k\"}'`) after route exists; expected `400` and no provider call. Evidence `.omo/evidence/task-1-product-image-studio-magnific-image-generator.txt`.
  Commit: N | feat(product-image-studio): add image generator domain contract | Files `src/features/product-image-studio/domain/imageGenerator.ts`, `tests/product-image-studio/imageGeneratorDomain.test.ts`

- [x] 2. Extend provider call options for resolution and deterministic multi-result fake generation
  What to do / Must NOT do
  - Extend `ProductImageStudioPromptContext` or add a prompt-generator-specific provider context so provider mappers can read `resolution`.
  - Update OpenAI mapper to map `resolution` and `ratio` into explicit supported sizes:
    - `0.5k`: nearest supported size for the selected ratio with `quality:"low"` because true 512px output is not a valid OpenAI image size.
    - `1k`: `1024x1024`, `1024x1536`, or `1536x1024` based on ratio.
    - `2k`: `2048x2048`, `1632x2048`, `1536x2048`, or `2048x1152` based on ratio, with no fallback down to 1K unless the provider rejects and the route surfaces that failure.
  - Update Gemini mapper to map `resolution` to `imageSize`:
    - `0.5k -> "512"`, `1k -> "1K"`, `2k -> "2K"` when supported.
    - Preserve retry-without-generation-config behavior.
  - Update fake provider helper or add `createFakeProductImageStudioImageGeneratorProviderResult` so fake generation can produce unique deterministic PNG results for count indexes.
  - Must NOT change current product-staging provider prompts except for backward-compatible optional fields.
  - Must NOT use `n > 1` with OpenAI in this slice; the route loops count times.
  Parallelization: Can parallel Y | Wave 1 | Blocks 4, 6
  References: `src/features/product-image-studio/server/imageProvider.ts:21`, `src/features/product-image-studio/server/imageProvider.ts:112`, `src/features/product-image-studio/server/openAiImageProvider.ts:58`, `src/features/product-image-studio/server/openAiImageProvider.ts:181`, `src/features/product-image-studio/server/geminiImageProvider.ts:49`, `src/features/product-image-studio/server/geminiImageProvider.ts:253`
  Acceptance criteria (agent-executable):
  - Extend/add tests in `tests/product-image-studio/openAiImageProvider.test.ts`, `tests/product-image-studio/geminiImageProvider.test.ts`, and `tests/product-image-studio/imageProvider.test.ts`.
  - `npm test -- --run tests/product-image-studio/openAiImageProvider.test.ts tests/product-image-studio/geminiImageProvider.test.ts tests/product-image-studio/imageProvider.test.ts` passes.
  - Tests prove existing product-staging request bodies remain valid, OpenAI 2K mappings are not accidentally downgraded to 1K, Gemini uses exact uppercase `1K`/`2K` values, and prompt-generator resolution mappings are correct.
  QA scenarios (name the exact tool + invocation): HTTP call (`curl -i -X POST http://127.0.0.1:3100/api/product-image-studio/image-generator/generations -F 'payload={\"prompt\":\"desk product photo\",\"modelLabel\":\"nano-banana-2\",\"count\":2,\"ratio\":\"1:1\",\"resolution\":\"0.5k\"}'`) with fake provider enabled after route exists; expected two unique result IDs. Evidence `.omo/evidence/task-2-product-image-studio-magnific-image-generator.txt`.
  Commit: N | feat(product-image-studio): support generator resolution options | Files `src/features/product-image-studio/server/imageProvider.ts`, `src/features/product-image-studio/server/openAiImageProvider.ts`, `src/features/product-image-studio/server/geminiImageProvider.ts`, provider tests

- [x] 3. Make generated result storage, SVG assets, and archive copy safe for image-generator workflow
  What to do / Must NOT do
  - Extend `SaveGeneratedProductImageInput` in `src/features/product-image-studio/server/fileStore.ts` with an optional sequence or suffix.
  - Store repeated results from the same generation without overwriting: e.g. `card_single-1-1x1.png`, `card_single-2-1x1.png`.
  - Apply the same unique generated-result naming behavior to `src/features/product-image-studio/server/blobFileStore.ts`, not only the local file store.
  - Extend allowed asset MIME support to `image/svg+xml` without making generated provider results SVG.
  - Add a server-side SVG sanitizer helper, e.g. `src/features/product-image-studio/server/svgAssetSanitizer.ts`, that rejects or removes scripts, `foreignObject`, event handlers, external href/xlink references, remote CSS `url(...)`, embedded JavaScript/data HTML, and executable namespaces before storage.
  - Add a server-side SVG rasterization helper, e.g. `src/features/product-image-studio/server/svgAssetRasterizer.ts`, using a deliberate dependency such as `sharp`, so sanitized SVG references can be converted to PNG before provider calls.
  - Update asset preview responses so SVG previews are served with `Content-Type: image/svg+xml; charset=utf-8`, `X-Content-Type-Options: nosniff`, and a restrictive `Content-Security-Policy`.
  - Update ZIP/download metadata so stored SVG originals keep their filename/content type while generated AI outputs remain PNG.
  - Extend archive read model in `src/lib/persistence/productImageStudioArchiveReadModels.ts` to read `workflow` and `promptPreview` from `providerRequestSummary`.
  - Extend `src/components/product-image-studio/productImageStudioArchiveCopy.ts` and `ProductImageStudioArchive.tsx` so `workflow === "image_generator"` displays:
    - product/type label `AI 이미지 생성기`,
    - output label `AI 생성 이미지`,
    - no card-pose metric unless present for legacy results,
    - prompt preview if available.
  - Must NOT change existing card/envelope/seal labels for current workflow.
  - Must NOT add database migrations in this todo.
  - Must NOT pass unsanitized or raw SVG bytes to OpenAI/Gemini.
  Parallelization: Can parallel Y | Wave 1 | Blocks 4, 6
  References: `src/features/product-image-studio/server/fileStore.ts:22`, `src/features/product-image-studio/server/fileStore.ts:143`, `src/features/product-image-studio/server/blobFileStore.ts:87`, `src/features/product-image-studio/server/assetUploadApi.ts:54`, `src/app/api/product-image-studio/projects/[id]/assets/[assetId]/preview/route.ts:1`, `src/features/product-image-studio/server/assetImageResponse.ts:1`, `src/features/product-image-studio/server/downloads.ts:61`, `src/features/product-image-studio/server/zipArchive.ts:1`, `src/lib/persistence/productImageStudioArchiveReadModels.ts:27`, `src/lib/persistence/productImageStudioArchiveReadModels.ts:62`, `src/components/product-image-studio/ProductImageStudioArchive.tsx:69`, `src/components/product-image-studio/productImageStudioArchiveCopy.ts:40`, `tests/product-image-studio/fileStore.test.ts:47`, `tests/product-image-studio/assetUploadApi.test.ts:1`, `package.json:17`
  Acceptance criteria (agent-executable):
  - Extend `tests/product-image-studio/fileStore.test.ts` to prove same generation/output/ratio with sequence stores distinct keys.
  - Add/extend blob file store coverage so production Blob storage also stores distinct keys for same generation/output/ratio.
  - Add `tests/product-image-studio/svgAssetSanitizer.test.ts` and `tests/product-image-studio/svgAssetRasterizer.test.ts`.
  - Extend `tests/product-image-studio/assetUploadApi.test.ts` to prove safe SVG uploads are accepted/stored as sanitized SVG and unsafe SVG payloads with `<script>`, `foreignObject`, `onload`, external href, or remote CSS URLs are rejected or neutralized before storage.
  - Extend preview/download tests to prove SVG preview headers include `nosniff` and restrictive CSP, and ZIP/download metadata preserves stored SVG originals.
  - Add/extend `tests/product-image-studio/resultArchiveUi.test.ts` for image-generator workflow copy.
  - `npm test -- --run tests/product-image-studio/fileStore.test.ts tests/product-image-studio/blobFileStore.test.ts tests/product-image-studio/svgAssetSanitizer.test.ts tests/product-image-studio/svgAssetRasterizer.test.ts tests/product-image-studio/assetUploadApi.test.ts tests/product-image-studio/resultArchiveUi.test.ts` passes.
  QA scenarios (name the exact tool + invocation): HTTP call (`curl -i http://127.0.0.1:3100/api/product-image-studio/projects/<projectId>/assets/<safeSvgAssetId>/preview`) after uploading a safe SVG; PASS if headers include `image/svg+xml`, `X-Content-Type-Options: nosniff`, and restrictive `Content-Security-Policy`. Browser use (`page.goto("http://127.0.0.1:3100/product-image-studio/activity"); page.locator("text=AI 생성 이미지").first().isVisible()`) after fake generation; PASS if generic label appears and existing `카드 단독컷` still appears for legacy fixtures/tests. Evidence `.omo/evidence/task-3-product-image-studio-magnific-image-generator.png` and `.omo/evidence/task-3-svg-preview-headers.txt`.
  Commit: N | feat(product-image-studio): archive image generator results safely | Files `src/features/product-image-studio/server/fileStore.ts`, `src/features/product-image-studio/server/blobFileStore.ts`, `src/features/product-image-studio/server/svgAssetSanitizer.ts`, `src/features/product-image-studio/server/svgAssetRasterizer.ts`, `src/lib/persistence/productImageStudioArchiveReadModels.ts`, archive copy/UI tests

- [x] 4. Add the multipart prompt-generation API route
  What to do / Must NOT do
  - Add `src/features/product-image-studio/server/imageGeneratorRoutePayload.ts`.
  - Add `src/features/product-image-studio/server/imageGeneratorRunner.ts` or tightly scoped route helper.
  - Add `src/app/api/product-image-studio/image-generator/generations/route.ts`.
  - Route must start with `proxyProductImageStudioRequestToBackend(request)` and return proxied response if present.
  - Parse multipart payload and reference files, including safe SVG references.
  - Validate payload, file count, file size, MIME type, and SVG sanitization/rasterization before provider resolution, provider calls, or persistent project/file writes.
  - Resolve provider using selected model label provider, saved settings, existing gate, and existing fake provider mode.
  - If blocked, return `423` without file/project/result writes and without provider fetch.
  - If enabled/fake:
    - keep validated reference files in memory until at least one provider/fake result succeeds,
    - call provider once per requested count using sanitized raster references when SVG was uploaded,
    - return `502` without project, asset, generation, result, or usage writes if every provider call fails,
    - create internal tool project only after at least one result succeeds,
    - save reference files as `reference_mood` assets after success, preserving sanitized SVG originals where applicable,
    - create generation request with `workflow:"image_generator"` summary after success,
    - call provider once per requested count,
    - save each successful image with unique sequence,
    - add usage record with requested/completed counts,
    - return `200` ready, `207` partial, or `502` full provider failure.
  - Must NOT call real provider when `PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED` or saved generation gate is closed.
  - Must NOT include secrets/model env values in response bodies beyond safe provider/model summary already allowed.
  - Must NOT persist upload/reference assets for malformed input, closed gate, SVG rasterization failure, or full provider failure.
  Parallelization: Can parallel Y | Wave 2 | Blocks 6, 8 | Blocked by 1, 2, 3
  References: `src/app/api/product-image-studio/projects/[id]/generations/route.ts:32`, `src/app/api/product-image-studio/projects/[id]/generations/route.ts:114`, `src/app/api/product-image-studio/projects/[id]/generations/route.ts:146`, `src/features/product-image-studio/server/generationRoutePayload.ts:25`, `src/features/product-image-studio/server/providerConfig.ts:81`, `src/features/product-image-studio/server/generationRunner.ts:168`, `src/lib/persistence/productImageStudioRepository.ts:124`, `src/app/api/product-image-studio/results/route.ts:7`
  Acceptance criteria (agent-executable):
  - Add `tests/product-image-studio/imageGeneratorRoute.test.ts`.
  - `npm test -- --run tests/product-image-studio/imageGeneratorRoute.test.ts tests/product-image-studio/providerGate.test.ts tests/product-image-studio/svgAssetSanitizer.test.ts tests/product-image-studio/svgAssetRasterizer.test.ts` passes.
  - Tests cover: invalid payload `400`, unsupported image MIME `400`, unsafe SVG `400`, SVG rasterization failure `400`, closed gate `423` with no repository writes/fetch, fake provider count `2` creates two results and one internal project, PNG/WebP/JPEG/SVG reference uploads saved as `reference_mood` only after at least one result succeeds, selected `gpt2` uses OpenAI provider, selected `nano-banana-2` uses Gemini provider, partial provider failure returns `207`, full provider failure returns `502` with no persisted project/assets/generation/results/usage, no secret leakage.
  QA scenarios (name the exact tool + invocation): HTTP call (`curl -i -X POST http://127.0.0.1:3100/api/product-image-studio/image-generator/generations -F 'payload={\"prompt\":\"premium stationery flatlay\",\"modelLabel\":\"gpt2\",\"count\":2,\"ratio\":\"1:1\",\"resolution\":\"1k\"}' -F 'referenceImages=@.omo/evidence/fixtures/card-front.png;type=image/png' -F 'referenceImages=@.omo/evidence/fixtures/safe-card.svg;type=image/svg+xml'`) with fake provider enabled; PASS if status `200`, body has two results, and persisted references include one sanitized SVG asset. Failure scenario same command with gate closed; PASS if status `423` and no results or archive writes. Evidence `.omo/evidence/task-4-product-image-studio-magnific-image-generator.txt`.
  Commit: N | feat(product-image-studio): add prompt image generator API | Files new route/helper/tests

- [x] 5. Build the Magnific-style generator page and client API
  What to do / Must NOT do
  - Add `src/features/product-image-studio/client/imageGeneratorApi.ts`.
  - Add `src/components/product-image-studio/ProductImageStudioImageGenerator.tsx`.
  - Add `src/components/product-image-studio/ProductImageStudioImageGenerator.module.css`.
  - Add page `src/app/product-image-studio/ai-tools/image-generator/page.tsx`.
  - Page must load provider settings state and pass safe status only, similar to product-staging page.
  - Configure `ProductImageStudioShell` so unrelated primary actions such as `새 상품컷` do not appear on this focused generator tool page.
  - Layout:
    - full-height workspace under shell content well,
    - main canvas/result grid first,
    - compact control panel with prompt and options,
    - model/count/ratio/resolution controls visible without scrolling on desktop,
    - mobile stacks controls before/after canvas without overlap.
  - Use lucide icons already installed for upload, sparkle/generate, image, download, alert/status.
  - UI copy must be natural Korean and concise.
  - Upload UI must state/reflect accepted design reference formats including SVG, while result UI clearly treats generated outputs as downloadable raster images.
  - The generate button must be disabled for empty prompt, invalid payload, active generation, or blocked provider with a visible Korean blocked reason.
  - Must NOT include long explanatory marketing sections.
  - Must NOT create nested cards inside cards.
  - Must NOT show provider keys, saved secret values, env model strings, or raw backend errors in the client.
  Parallelization: Can parallel Y | Wave 2 | Blocks 8 | Blocked by 1
  References: `src/app/product-image-studio/ai-tools/page.tsx:4`, `src/app/product-image-studio/ai-tools/product-staging/page.tsx:10`, `src/components/product-image-studio/ProductImageStudioShell.tsx:104`, `src/components/product-image-studio/ProductImageStudioGenerationPanel.tsx:38`, `src/features/product-image-studio/client/projectWizardApi.ts:95`, `src/components/product-image-studio/ProductImageStudioAiTools.module.css:1`, `src/components/product-image-studio/ProductImageStudioUploadLibrary.tsx:1`
  Acceptance criteria (agent-executable):
  - Add/extend `tests/product-image-studio/imageGeneratorUi.test.ts`.
  - `npm test -- --run tests/product-image-studio/imageGeneratorUi.test.ts tests/product-image-studio/aiTools.test.ts` passes.
  - Static render asserts Korean title, prompt textarea, upload control, SVG accepted format copy, both model labels, count controls, ratio controls, resolution controls, generate button, no secret strings, no unrelated `새 상품컷` CTA, shell active nav on AI tools.
  QA scenarios (name the exact tool + invocation): Browser use (`page.goto("http://127.0.0.1:3100/product-image-studio/ai-tools/image-generator"); page.fill("textarea[name=prompt]", "정돈된 테이블 위 프리미엄 카드 설정샷"); page.setInputFiles("input[type=file]", [".omo/evidence/fixtures/safe-card.svg"]); page.click("text=나노바나나 2"); page.selectOption("select[name=count]", "2"); page.click("text=생성")`) with fake provider; PASS if two result cards appear and the SVG reference is shown as an uploaded reference, not as a generated vector result. Evidence `.omo/evidence/task-5-product-image-studio-magnific-image-generator.png`.
  Commit: N | feat(product-image-studio): build image generator workspace | Files new page/component/client/tests

- [x] 6. Integrate AI tools hub, uploads, results, and downloads
  What to do / Must NOT do
  - Update `ProductImageStudioAiTools.tsx` card list to include the new enabled image generator card.
  - Update card count and tests from six cards to seven cards.
  - Ensure reference files uploaded through generator appear in `/product-image-studio/uploads` because they are saved as `reference_mood`.
  - Ensure SVG reference uploads appear in `/product-image-studio/uploads` with safe preview/metadata and can be reused by template/design flows as stored assets.
  - Ensure generated results appear in `/product-image-studio/activity` and project detail/download routes via existing archive APIs.
  - Ensure result preview/download URLs are from existing project result endpoints.
  - Ensure ZIP download still works for generated tool projects.
  - Must NOT make the disabled placeholder tools accidentally enabled.
  Parallelization: Can parallel Y | Wave 2 | Blocks 8 | Blocked by 1, 2, 3, 4
  References: `src/components/product-image-studio/ProductImageStudioAiTools.tsx:25`, `tests/product-image-studio/aiTools.test.ts:7`, `src/features/product-image-studio/server/uploadArchive.ts:24`, `src/app/api/product-image-studio/uploads/route.ts:7`, `src/app/api/product-image-studio/results/route.ts:7`, `src/lib/persistence/productImageStudioArchiveReadModels.ts:93`, `src/features/product-image-studio/server/downloads.ts:61`
  Acceptance criteria (agent-executable):
  - Extend `tests/product-image-studio/aiTools.test.ts`, `tests/product-image-studio/uploadArchive.test.ts`, `tests/product-image-studio/archivePageData.test.ts`, `tests/product-image-studio/downloads.test.ts`.
  - `npm test -- --run tests/product-image-studio/aiTools.test.ts tests/product-image-studio/uploadArchive.test.ts tests/product-image-studio/archivePageData.test.ts tests/product-image-studio/downloads.test.ts` passes.
  - Tests prove the new tool is linked and enabled, reference uploads show in upload archive, SVG references keep safe preview metadata, generator results show in activity/archive, and download URLs are usable.
  QA scenarios (name the exact tool + invocation): Browser use (`page.goto("http://127.0.0.1:3100/product-image-studio/ai-tools"); page.click("text=AI 이미지 생성기"); page.goto("http://127.0.0.1:3100/product-image-studio/uploads"); page.goto("http://127.0.0.1:3100/product-image-studio/activity")`) after fake generation with PNG and SVG references; PASS if the uploaded PNG/SVG references and AI generated result are visible. Evidence `.omo/evidence/task-6-product-image-studio-magnific-image-generator.png`.
  Commit: N | feat(product-image-studio): connect generator to studio archives | Files AI tools/upload/archive/download tests

- [x] 7. Preserve provider gate, backend proxy, and production smoke safety
  What to do / Must NOT do
  - Add route proxy tests proving `/api/product-image-studio/image-generator/generations` uses `proxyProductImageStudioRequestToBackend` first when backend env is configured.
  - Update `tests/product-image-studio/smokeContract.test.ts` and `scripts/production-smoke.mjs` only for safe auth/page checks:
    - login protection for `/product-image-studio/ai-tools/image-generator`,
    - do not POST to `/api/product-image-studio/image-generator/generations`.
  - Ensure provider status/settings APIs still redact secrets.
  - Ensure blocked generation message is clear in the UI and API.
  - Must NOT call billed generation in production smoke.
  - Must NOT expose provider model env values in production smoke output.
  Parallelization: Can parallel Y | Wave 2 | Blocks 8 | Blocked by 1
  References: `src/features/product-image-studio/server/backendProxy.ts:1`, `src/app/api/product-image-studio/projects/[id]/generations/route.ts:32`, `tests/product-image-studio/providerSettingsProxy.test.ts:72`, `scripts/production-smoke.mjs:4`, `scripts/production-smoke.mjs:78`, `tests/product-image-studio/smokeContract.test.ts:12`, `tests/product-image-studio/providerGate.test.ts:104`
  Acceptance criteria (agent-executable):
  - Add/extend `tests/product-image-studio/imageGeneratorProxy.test.ts`, `tests/product-image-studio/smokeContract.test.ts`, and `tests/product-image-studio/providerGate.test.ts`.
  - `npm test -- --run tests/product-image-studio/imageGeneratorProxy.test.ts tests/product-image-studio/smokeContract.test.ts tests/product-image-studio/providerGate.test.ts` passes.
  - `npm run smoke:prod` passes and output does not contain generation endpoint calls, API keys, model env values, or provider secrets.
  QA scenarios (name the exact tool + invocation): HTTP call (`curl -i https://marketcrew.app/product-image-studio/ai-tools/image-generator`) after deployment; PASS if unauthenticated production request redirects to login or protected page without server error. Evidence `.omo/evidence/task-7-product-image-studio-magnific-image-generator.txt`.
  Commit: N | test(product-image-studio): guard generator provider and prod smoke safety | Files proxy/smoke/status tests and smoke script

- [x] 8. Run browser QA, full verification, and commit
  What to do / Must NOT do
  - Run targeted tests from Todos 1-7.
  - Run `npm run typecheck`.
  - Run `npm test -- --run`.
  - Run `npm run build`.
  - Start local dev server on a free port, prefer `3100`.
  - Browser QA desktop and mobile:
    - `/product-image-studio/ai-tools` shows seven tools and new generator card.
    - `/product-image-studio/ai-tools/image-generator` renders without server error.
    - Empty prompt blocks generation.
    - Gate-closed state is visible and no result appears.
    - Fake-provider state with one PNG reference, one SVG reference, and count `2` creates two visible raster result cards.
    - Activity and uploads pages show generated result/reference uploads, including safe SVG metadata.
    - Download link responds with image content.
    - Safe SVG preview endpoint returns `image/svg+xml`, `nosniff`, and restrictive CSP headers.
  - Capture screenshots and curl outputs under `.omo/evidence/`.
  - Run `npm run smoke:prod`; it must not call generation endpoints.
  - Stage only intentional files. Do not stage unrelated `ProductImageStudioUploadLibrary.module 2.css`.
  - Commit once after verification with `feat(product-image-studio): add prompt image generator`.
  Parallelization: Can parallel N | Wave 3 | Blocks Final | Blocked by 4, 5, 6, 7
  References: `package.json:8`, `scripts/production-smoke.mjs:4`, `src/app/product-image-studio/ai-tools/page.tsx:4`, `src/app/api/product-image-studio/results/route.ts:7`, `src/features/product-image-studio/server/fileStore.ts:143`
  Acceptance criteria (agent-executable):
  - `npm run typecheck` exits 0.
  - `npm test -- --run` exits 0.
  - `npm run build` exits 0.
  - `npm run smoke:prod` exits 0 or any failure is proven pre-existing and unrelated.
  - Browser screenshots exist:
    - `.omo/evidence/task-8-generator-desktop.png`
    - `.omo/evidence/task-8-generator-mobile.png`
    - `.omo/evidence/task-8-generator-results.png`
    - `.omo/evidence/task-8-generator-svg-upload.png`
  - `git status --short` shows only expected committed changes plus pre-existing unrelated untracked files if still present.
  QA scenarios (name the exact tool + invocation): Browser use (`page.goto("http://127.0.0.1:3100/product-image-studio/ai-tools/image-generator"); page.setViewportSize({ width: 1440, height: 1000 }); page.screenshot({ path: ".omo/evidence/task-8-generator-desktop.png", fullPage: true }); page.setViewportSize({ width: 390, height: 844 }); page.screenshot({ path: ".omo/evidence/task-8-generator-mobile.png", fullPage: true })`), plus HTTP call (`curl -I http://127.0.0.1:3100/api/product-image-studio/projects/<projectId>/results/<resultId>/download`) after fake generation and HTTP call (`curl -i http://127.0.0.1:3100/api/product-image-studio/projects/<projectId>/assets/<safeSvgAssetId>/preview`) for SVG preview headers. Evidence paths above plus `.omo/evidence/task-8-download-head.txt` and `.omo/evidence/task-8-svg-preview-headers.txt`.
  Commit: Y | feat(product-image-studio): add prompt image generator | Files all intentional implementation/test/evidence docs only

## Final verification wave (after ALL todos)
> Runs in parallel. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [x] F1. Plan compliance audit
  - Verify every Must have and Must NOT have item against the final diff and evidence.
  - Exact command: `rg -n "image-generator|image_generator|nano-banana-2|gpt2|reference_mood" src tests scripts .omo/evidence`.
  - Approve only if the new route/page/tests/evidence exist and no unrelated dirty file was staged.
- [x] F2. Code quality review
  - Review changed TypeScript/TSX/CSS for strict typing, no `as any`, no suppressed errors, no secret exposure, and no unrelated refactors.
  - Exact command: `rg -n "as any|@ts-ignore|@ts-expect-error|OPENAI_API_KEY|GEMINI_API_KEY|sk-" src tests`.
  - Approve only if matches are expected safe tests or no matches.
- [x] F3. Real manual QA
  - Drive the local browser workflow with fake provider and gate-closed mode.
  - Exact invocation: Browser `page.goto("http://127.0.0.1:3100/product-image-studio/ai-tools/image-generator")`, then fill prompt, upload fixture, generate count `2`, screenshot results.
  - Approve only if desktop/mobile screenshots show no overlap and result cards/download links are visible.
- [x] F4. Scope fidelity
  - Confirm the implementation does not add unrelated tools, exact hidden Magnific cloning, second credential systems, production generation smoke, or external ledger writes.
  - Exact command: `git diff --stat HEAD~1..HEAD` after commit plus `git show --name-only --stat HEAD`.
  - Approve only if changed files match this plan's scope.

## Commit strategy
- Work on the current branch unless the user explicitly asks for a new branch.
- Keep `.omo/drafts/product-image-studio-magnific-image-generator.md` and this plan file as planning artifacts; implementation commits may include `.omo/evidence` only if repo conventions allow it at execution time.
- Use one final commit after all Todos and Final verification wave pass:
  - `feat(product-image-studio): add prompt image generator`
- Stage by exact path. Never stage unrelated `src/components/product-image-studio/ProductImageStudioUploadLibrary.module 2.css`.
- If the user later says `커밋마지푸시해줘`, use the repo's established flow: commit, merge to `main` if needed, push, then run/record production smoke.

## Success criteria
- The final UI has a usable Magnific-style image generator route in Product Image Studio, not a landing page.
- Prompt, reference upload, model, count, ratio, and resolution controls are present and tested.
- `gpt2` and `나노바나나2` are display labels mapped to configured OpenAI/Gemini provider models server-side.
- Provider gate behavior is explicit: closed gate returns `423`, no provider call, no persisted project/result.
- Fake provider can generate multiple deterministic results for QA without billing.
- Successful generation stores reference uploads, generation request, results, usage, archive rows, preview URLs, and download URLs.
- Existing product-staging generation still works and its archive labels remain unchanged.
- Production smoke remains safe and does not invoke generation.
- `npm run typecheck`, targeted tests, full tests, `npm run build`, browser QA, and `npm run smoke:prod` are completed or any unrelated failures are clearly proven.
