import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductImageStudioAiToolsHub } from "@/components/product-image-studio/ProductImageStudioAiTools";
import {
  ProductImageStudioSvgConversionModal,
  readSvgConversionInteractionState,
  readSvgConversionStatusCopy,
  type ProductImageStudioSvgConversionInteraction,
  type ProductImageStudioSvgConversionState,
} from "@/components/product-image-studio/ProductImageStudioSvgConversionModal";

const SVG_SUCCESS_STATE = {
  contentType: "image/svg+xml",
  downloadUrl: "/api/product-image-studio/projects/project-1/results/result-1/download",
  fileName: "seal-sticker-icon.svg",
  kind: "success",
  svg: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h12v12H0z"/></svg>',
} as const;

describe("product image studio SVG conversion UI", () => {
  it("renders SVG conversion as a modal-first AI tool with PNG, style, name, and generate controls", () => {
    // Given: the AI tools hub opens the SVG conversion tool directly.
    const html = renderToStaticMarkup(createElement(ProductImageStudioAiToolsHub, { initialToolId: "svg-conversion" }));

    // Then: the modal contains the full upload-to-SVG surface without navigating away.
    expect(html).toContain('data-ai-tool-card="svg-conversion"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain("SVG 변환");
    expect(html).toContain('data-svg-conversion-state="idle"');
    expect(html).toContain('type="file"');
    expect(html).toContain('accept="image/png"');
    expect(html).toContain('name="file"');
    expect(html).toContain('name="style"');
    expect(html).toContain("아이콘형");
    expect(html).toContain("라인형");
    expect(html).toContain('value="line_art"');
    expect(html).toContain("스티커형");
    expect(html).toContain('name="title"');
    expect(html).toContain("생성");
    expect(html).toContain("초기화");
    expect(html).toContain("PNG만 업로드");
  });

  it("hides native file input copy behind a Korean upload control", () => {
    // Given: the SVG modal still needs a real file input for browser automation.
    const html = renderToStaticMarkup(createElement(ProductImageStudioAiToolsHub, { initialToolId: "svg-conversion" }));
    const css = readFileSync(
      join(process.cwd(), "src/components/product-image-studio/ProductImageStudioAiTools.module.css"),
      "utf8",
    );

    // Then: the visible upload surface is Korean while the file input remains addressable.
    expect(html).toContain('type="file"');
    expect(html).toContain('aria-label="SVG 변환 PNG 파일"');
    expect(html).toContain("PNG 파일 선택");
    expect(html).toContain("파일 업로드");
    expect(html).not.toContain("Choose File");
    expect(css).toMatch(/\.fileInput\s*{[\s\S]*clip-path:\s*inset\(50%\)/);
    expect(css).toMatch(/\.uploadAction\s*{/);
    expect(css).not.toMatch(/\.uploadBox input\s*{/);
  });

  it("locks validation, reset, reopen, and cancel-pending interaction outcomes", () => {
    // Given: interaction outcomes are user-visible state, even in this Node test environment.
    const validPng = createFile("seal-sticker.png", "image/png", 68);
    const wrongType = createFile("seal-sticker.jpg", "image/jpeg", 68);
    const oversizedPng = createFile("too-large.png", "image/png", 20 * 1024 * 1024 + 1);
    const cases = [
      {
        expectedCopy: "SVG로 변환할 PNG 파일을 선택해 주세요.",
        expectedState: "error",
        interaction: { file: null, kind: "submit" },
        name: "no file submit",
      },
      {
        expectedCopy: "PNG 파일만 SVG로 변환할 수 있습니다.",
        expectedState: "error",
        interaction: { file: wrongType, kind: "select-file" },
        name: "wrong file type",
      },
      {
        expectedCopy: "PNG 파일은 20MB 이하만 사용할 수 있습니다.",
        expectedState: "error",
        interaction: { file: oversizedPng, kind: "select-file" },
        name: "oversized PNG",
      },
      {
        expectedCopy: "seal-sticker.png SVG 생성 중",
        expectedState: "loading",
        interaction: { file: validPng, kind: "submit" },
        name: "valid submit starts generation",
      },
      {
        expectedCopy: "PNG 파일을 선택하면 SVG를 만들 수 있습니다.",
        expectedState: "idle",
        interaction: { kind: "reset" },
        name: "reset clears state",
      },
      {
        expectedCopy: "PNG 파일을 선택하면 SVG를 만들 수 있습니다.",
        expectedState: "idle",
        interaction: { kind: "reopen" },
        name: "close and reopen starts clean",
      },
      {
        expectedCopy: "PNG 파일을 선택하면 SVG를 만들 수 있습니다.",
        expectedState: "idle",
        interaction: { kind: "cancel-pending" },
        name: "close during pending recovers",
      },
    ] satisfies readonly {
      readonly expectedCopy: string;
      readonly expectedState: ProductImageStudioSvgConversionState["kind"];
      readonly interaction: ProductImageStudioSvgConversionInteraction;
      readonly name: string;
    }[];

    for (const caseInput of cases) {
      // When: the same state transition helper used by the modal handlers processes the interaction.
      const state = readSvgConversionInteractionState(caseInput.interaction);
      const html = renderToStaticMarkup(createElement(ProductImageStudioSvgConversionModal, { initialState: state }));

      // Then: the rendered user-facing copy and state match the expected outcome.
      expect(state.kind, caseInput.name).toBe(caseInput.expectedState);
      expect(readSvgConversionStatusCopy(state), caseInput.name).toBe(caseInput.expectedCopy);
      expect(html, caseInput.name).toContain(`data-svg-conversion-state="${caseInput.expectedState}"`);
      expect(html, caseInput.name).toContain(caseInput.expectedCopy);
      expect(html, caseInput.name).not.toContain("Choose File");
    }
  });

  it.each([
    {
      expectedCopy: "PNG 파일을 선택하면 SVG를 만들 수 있습니다.",
      expectedState: "idle",
      initialState: { kind: "idle" } as const,
    },
    {
      expectedCopy: "SVG 생성 중",
      expectedState: "loading",
      initialState: { fileName: "seal-sticker.png", kind: "loading" } as const,
    },
    {
      expectedCopy: "SVG 변환 완료",
      expectedState: "success",
      initialState: SVG_SUCCESS_STATE,
    },
    {
      expectedCopy: "PNG 파일만 SVG로 변환할 수 있습니다.",
      expectedState: "error",
      initialState: { kind: "error", message: "PNG 파일만 SVG로 변환할 수 있습니다." } as const,
    },
    {
      expectedCopy: "PNG 파일은 20MB 이하만 사용할 수 있습니다.",
      expectedState: "error",
      initialState: { kind: "error", message: "PNG 파일은 20MB 이하만 사용할 수 있습니다." } as const,
    },
  ])("renders the $expectedState SVG conversion state with safe Korean copy", (caseInput) => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioAiToolsHub, {
        initialToolId: "svg-conversion",
        svgConversionInitialState: caseInput.initialState,
      }),
    );

    expect(html).toContain(`data-svg-conversion-state="${caseInput.expectedState}"`);
    expect(html).toContain(caseInput.expectedCopy);
    expect(html).toContain("초기화");
    expect(html).not.toContain("API_KEY");
  });

  it("renders success with an actual SVG download href and content type", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioAiToolsHub, {
        initialToolId: "svg-conversion",
        svgConversionInitialState: SVG_SUCCESS_STATE,
      }),
    );

    expect(html).toContain('href="/api/product-image-studio/projects/project-1/results/result-1/download"');
    expect(html).toContain('download="seal-sticker-icon.svg"');
    expect(html).toContain("image/svg+xml");
    expect(html).toContain("&lt;path");
    expect(html).not.toMatch(/<image|data:image|base64/i);
  });

  it("escapes prompt-injection shaped SVG conversion titles as input text only", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioAiToolsHub, {
        initialToolId: "svg-conversion",
        svgConversionInitialState: { kind: "idle" },
        svgConversionInitialTitle: '벡터 </textarea><script>alert("x")</script>',
      }),
    );

    expect(html).toContain('name="title"');
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });
});

function createFile(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type });
}
