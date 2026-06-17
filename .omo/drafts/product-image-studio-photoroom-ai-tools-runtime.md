# Product Image Studio Photoroom AI Tools Runtime Draft

status: awaiting-summary-review
pending_action: summarize before writing .omo/plans/product-image-studio-photoroom-ai-tools-runtime.md
mode: plan-only
implementation: not-started

## User request

- Use `$omo:ulw-plan`.
- Re-read the AI tools code and identify weird structure or tool fixes.
- Use Photoroom as the benchmark.
- Do not start implementation.
- Show the plan summary first.

## Tier

HEAVY.

Facts:
- The scope crosses AI tools IA, modal UI, image generation client/server API, upload handling, result preview/archive, and QA.
- The user explicitly requested a plan before work and asked for a full structure review.
- The current bug is user-facing: uploaded reference image stays in the right preview instead of generated output.

## External benchmark

Photoroom public help confirms the target AI tools flow:
- Select an AI tool.
- Upload or choose images when the tool needs them.
- Adjust settings such as prompt, quality, size/layout, and brand/style.
- Generate images.
- See results in the same workspace.
- Download or continue editing/saving the result.

Sources used:
- https://help.photoroom.com/en/articles/13673310-quick-guide-to-the-photoroom-ui-web-app
- https://help.photoroom.com/en/articles/13628967-upload-an-image-and-edit-with-ai-web-app
- https://help.photoroom.com/en/articles/13003543-create-a-design-with-an-ai-background-web-app

## Repo findings

1. Modal UI is disconnected from real generation.
- `src/components/product-image-studio/ProductImageStudioAiToolWorkspaceModal.tsx:55-59` changes `generating` to `ready` with a timer.
- `src/components/product-image-studio/ProductImageStudioAiToolWorkspaceModal.tsx:93-95` wires Generate to `setPhase("generating")` only.
- No call is made to `startProductImageStudioImageGeneratorGeneration`.

2. Prompt fields are not part of the generation state.
- `src/components/product-image-studio/ProductImageStudioAiToolGeneratorControls.tsx:73-81` uses uncontrolled `defaultValue`.
- The modal cannot read the user's prompt or instruction when Generate is clicked.

3. Upload assets lose the original File object.
- `src/components/product-image-studio/ProductImageStudioAiToolUploads.tsx` stores filename/preview metadata but not the `File`.
- The real generator API needs `referenceImages: readonly File[]`.

4. Right preview uses uploaded image as fake result.
- `src/components/product-image-studio/ProductImageStudioAiToolPreviewPanel.tsx:84-93` renders "ready" state.
- `src/components/product-image-studio/ProductImageStudioAiToolPreviewPanel.tsx:120-124` displays `featuredAsset.previewUrl`, which is the uploaded file object URL, not generated output.

5. The real image-generator implementation already exists elsewhere.
- `src/components/product-image-studio/ProductImageStudioImageGenerator.tsx:42-61` calls `startProductImageStudioImageGeneratorGeneration`.
- `src/components/product-image-studio/ProductImageStudioImageGenerator.tsx:78-90` renders generated `previewUrl`, download, and vector SVG links.
- `src/features/product-image-studio/client/imageGeneratorApi.ts:54-84` has the shared FormData request builder and API call.

6. Tool metadata has future/plan tools presented like usable tools.
- `src/components/product-image-studio/ProductImageStudioAiToolCatalog.ts` has `statusLabel: "계획"` for some tools but the modal still opens them as generation tools.
- This makes unfinished tools look functional.

7. Option contracts diverge.
- Modal options include `8컷`, `original`, `16:9`, `2:3`, `3:2`, `4:3`, `9:16`.
- Domain image generator accepts counts 1-4 and ratios `1:1`, `4:5`, `3:4`, `16:9`.
- This requires explicit mapping or a shared option contract.

8. Tests cover static rendering but not the broken real flow.
- `tests/product-image-studio/aiTools.test.ts` confirms modal structure and controls.
- Missing: browser/API-mocked scenario for upload + prompt + generate -> API request -> generated result in right panel.

## Planning approach

Plan around a shared Photoroom-like AI tool runtime, not one-off fixes:

1. Establish a single generation runtime hook/model for modal AI tools.
2. Make prompt, instruction, selected options, model, count, ratio, resolution, and upload files part of one typed request state.
3. Reuse the existing `imageGeneratorApi.ts` client for generator-style tools.
4. Render generated API results in the right panel, never uploaded object URLs in the "generated" state.
5. Keep uploaded images as input/reference previews until generation succeeds.
6. Show unavailable/future tools as disabled or "준비 중", not fake-generate.
7. Align modal option contracts with domain/server contracts or add explicit mapping with validation.
8. Add real-surface browser QA for Photoroom-like modal flow with API interception to avoid provider cost.

## Suggested scope

Must have:
- Fix the reported modal generation bug.
- Convert modal prompt/instruction to controlled state.
- Keep uploaded `File` references and submit them to the real generation API.
- Display generated `previewUrl/downloadUrl/vectorSvgUrl` in the right panel.
- Surface blocked/failed API messages in Korean.
- Disable or clearly mark tools whose backend workflow is not implemented.
- Add regression tests and browser QA scenario.

Must not have:
- No provider key exposure.
- No real paid provider call in automated QA unless explicitly approved.
- No product code implementation before the final plan is approved.
- No redesign of the entire shell unless it directly supports the AI tool flow.

## Open decision

Default recommendation:
- Treat only `상품 설정샷 생성`, `AI 이미지 생성기`, and `SVG 변환` as usable in this implementation wave.
- Mark `배경/소품 생성`, `비율 변경`, `비슷한 이미지 생성`, `목업 합성`, and `상세 이미지 블록` as visible but not fake-operable until each has its own backend workflow.

Alternative:
- Keep all tools clickable and route every generator-like tool through the same image generator endpoint with prompt templates. Faster visually, but riskier because tool labels imply workflows that are not truly implemented.

## Verification summary for future plan

- Unit/domain tests:
  - prompt composition includes prompt, instruction, selected options, and safe tool context.
  - count/ratio/resolution mapping rejects unsupported values or maps explicitly.
  - client response parser handles ready, partial, blocked, failed, and malformed responses.

- Browser QA:
  - Open `/product-image-studio/ai-tools`.
  - Open AI image generator modal.
  - Upload a reference image.
  - Enter prompt.
  - Intercept `/api/product-image-studio/image-generator/generations`.
  - Click Generate.
  - Assert request contains multipart payload + file.
  - Assert right panel renders generated preview URL, not uploaded object URL.
  - Assert download/SVG links appear when response includes them.

- Build checks:
  - `npm run typecheck`
  - `npm test -- --run tests/product-image-studio/aiTools.test.ts tests/product-image-studio/imageGeneratorUi.test.ts tests/product-image-studio/imageGeneratorRoute.test.ts`
  - `npm run build`
