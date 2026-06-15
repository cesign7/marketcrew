---
slug: product-image-studio-magnific-image-generator
status: approved
pending_action: write .omo/plans/product-image-studio-magnific-image-generator.md
created_at: 2026-06-15
---

# Product Image Studio Magnific-style Image Generator Draft

## User Request
- Build a plan, using `omo:ulw-plan`, for an image work tool inside MarketCrew Product Image Studio.
- The tool should follow the structure of `www.magnific.com` AI image generator.
- User-provided reference HTML: `/Users/mini/.codex/attachments/567b69dc-def0-42b6-8233-d767637dd796/pasted-text.txt`.
- Desired controls: upload images, prompt input, model selection (`gpt2`, `나노바나나2`), number of generated images, aspect ratio, resolution, and generation.
- Layout should be very close to the reference style while still being integrated into MarketCrew.

## Confirmed Findings
- Reference HTML directly confirms:
  - Title: `이미지 생성기 I Magnific AI`.
  - Route/canonical URL: `https://www.magnific.com/kr/app/ai-image-generator`.
  - The raw HTML does not contain server-rendered controls; actual UI is client-rendered into `#app`.
  - Bundle names support aspect-ratio, file/reference upload, model abstraction, and generation/loading flows, but prompt/count/resolution controls are not directly visible in the pasted HTML.
- Live reference check:
  - Direct open of `https://www.magnific.com/kr/app/ai-image-generator` returned 403, so the authenticated app frame could not be inspected directly.
  - Public Magnific docs confirm the image generator creates from text prompts, reference images, or both.
  - Public Magnific docs confirm the flow: prompt field, style, aspect ratio, model, optional references, Generate.
  - Public Magnific docs confirm generated images are saved automatically and can be downloaded, edited, varied, or reused.
  - Public Magnific docs confirm reference-image flow: upload/select reference image, write prompt, adjust style/aspect ratio/model/settings, Generate.
  - Public Magnific docs confirm model selector near prompt settings, searchable/browsable models, and settings for aspect ratio plus references.
  - Public Magnific docs confirm generation settings include model, aspect ratio, and number of images 1-4.
  - Public Magnific marketing page confirms Nano Banana, GPT, Imagen, Seedream, Flux, Mystic, Ideogram-style model families and reference-image support.
- Existing MarketCrew AI tools hub is `src/components/product-image-studio/ProductImageStudioAiTools.tsx`.
  - Current enabled tool is `/product-image-studio/ai-tools/product-staging`.
  - New generator should be added as a separate enabled tool card, not folded into the existing product-staging wizard.
- Existing shell/navigation is `src/components/product-image-studio/ProductImageStudioShell.tsx`.
  - It already has the left SaaS menu structure the new route should inherit.
- Existing product-staging generation route is `src/app/api/product-image-studio/projects/[id]/generations/route.ts`.
  - It is project-bound and concept/output/production-settings driven.
  - It is not a good fit for a free prompt-first generator without a new route or a new payload contract.
- Provider safety is in `src/features/product-image-studio/server/providerConfig.ts`.
  - Generation is blocked unless generation is enabled, provider/model are configured, and a credential exists.
  - Status routes intentionally avoid exposing secrets.
- Provider implementations and fake provider are in `src/features/product-image-studio/server/imageProvider.ts`.
  - OpenAI/Gemini providers and fake provider can be reused.
  - A new prompt-first generation context should be added rather than bypassing provider safety.
- Upload archive already exists:
  - `src/components/product-image-studio/ProductImageStudioUploadLibrary.tsx`
  - `src/features/product-image-studio/server/uploadArchive.ts`
  - `src/app/api/product-image-studio/uploads/route.ts`
- Result archive already exists:
  - `src/app/api/product-image-studio/results/route.ts`
  - project result archive APIs under `/api/product-image-studio/projects/[id]/results`.
- Test commands in `package.json`:
  - `npm run typecheck`
  - `npm test -- --run`
  - `npm run build`
  - `npm run smoke:prod`
- Relevant tests to extend:
  - `tests/product-image-studio/aiTools.test.ts`
  - `tests/product-image-studio/generationWorkflow.test.ts`
  - `tests/product-image-studio/generationRouteProvider.test.ts`
  - `tests/product-image-studio/providerGate.test.ts`
  - `tests/product-image-studio/imageProvider.test.ts`
  - `tests/product-image-studio/openAiImageProvider.test.ts`
  - `tests/product-image-studio/geminiImageProvider.test.ts`
  - upload/archive/result UI tests as needed.

## Scope Defaults
- Build a separate tool route:
  - `/product-image-studio/ai-tools/image-generator`
- Add a separate prompt-first API contract:
  - likely `/api/product-image-studio/image-generator/generations`
  - alternative: project-scoped prompt generations if user wants every generation tied to a project from day one.
- Reuse existing provider settings/gate; do not introduce a second credential system.
- Save outputs into the existing result archive model when possible, so generated images can later be reused in designs/templates/activity.
- Keep production provider calls blocked unless existing generation gate and saved provider settings allow them.
- Use natural Korean UI copy.
- Keep existing untracked file out of scope:
  - `src/components/product-image-studio/ProductImageStudioUploadLibrary.module 2.css`

## Proposed UX Shape
- A full-height generator workspace inside the existing Product Image Studio shell.
- Magnific-like structure:
  - main visual area for upload/reference images and generated results,
  - side or lower control panel for prompt and settings,
  - upload/reference image dropzone,
  - prompt textarea,
  - model selector,
  - image count selector,
  - aspect ratio selector,
  - resolution selector,
  - generate button with provider/gate status,
  - result grid with download and archive-aware actions.
- The UI should not explain itself with long instructional text; controls should be clear, compact, and icon-backed where useful.

## Decisions Applied
1. Model names:
   - Decision: treat `gpt2` and `나노바나나2` as user-facing labels.
   - Implementation intent: map them server-side to configured OpenAI/Gemini image model IDs, or to saved provider model values.
   - Rationale: current provider settings expect actual model IDs, while the requested labels may not be valid provider IDs.
2. Persistence shape:
   - Decision: generated outputs are saved into the existing result archive and are also visible from the generator page.
   - Rationale: Magnific-style docs emphasize automatic saving/history, and MarketCrew already has result archive surfaces.
3. Test strategy:
   - Decision: TDD for route/domain/provider safety, then static UI tests and browser QA.
   - Rationale: the work touches provider calls, persisted results, upload references, and UI routing.

## Approval Brief
- Plan will add a new AI tool card under `/product-image-studio/ai-tools`.
- Plan will add a new page at `/product-image-studio/ai-tools/image-generator`.
- Plan will build a Magnific-like generator frame inside the existing MarketCrew SaaS shell:
  - upload/reference image area,
  - prompt input,
  - compact model/count/ratio/resolution controls,
  - generation button with provider gate status,
  - generated result grid and download/archive actions.
- Plan will add a separate prompt-first generation contract instead of overloading the existing product-staging generation route.
- Plan will reuse existing provider settings, provider gate, fake provider, file store, upload archive, and result archive patterns.
- Plan will keep production provider calls blocked unless the existing generation gate and credentials allow them.
- Plan will preserve natural Korean UI copy and keep env/secrets hidden.
- Plan will keep unrelated dirty worktree files out of scope.

## Waiting For
- Approved by user: `추천안대로 승인`.
- Next action: write `.omo/plans/product-image-studio-magnific-image-generator.md`.
