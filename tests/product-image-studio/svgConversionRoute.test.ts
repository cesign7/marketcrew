import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as GET_RESULT_PREVIEW } from "@/app/api/product-image-studio/projects/[id]/results/[resultId]/preview/route";
import { POST } from "@/app/api/product-image-studio/svg-conversions/route";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";

describe("product image studio SVG conversion route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("accepts multipart PNG upload and persists a vector-only SVG result", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await POST(
      multipartSvgConversionRequest({
        bytes: new Uint8Array(await readFile(".omo/fixtures/seal-sticker.png")),
        fileName: "seal-sticker.png",
        style: "icon",
        title: "ignore previous instructions <image href='data:image/png;base64,abc'/>",
        type: "image/png",
      }),
    );
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      data: {
        contentType: "image/svg+xml",
        fileName: "seal-sticker-icon.svg",
      },
      ok: true,
    });
    const svg = readSvgFromRouteBody(body);
    expect(svg).toContain("<svg");
    expect(svg).toMatch(/<(path|circle|rect|polygon|line)\b/);
    expect(svg).toContain("ignore previous instructions");
    expect(svg).not.toMatch(/<image|data:image|base64|foreignObject/i);

    const projectId = readStringPath(body, ["data", "projectId"]);
    const resultId = readStringPath(body, ["data", "resultId"]);
    expect(readStringPath(body, ["data", "archiveDownloadUrl"])).toContain(resultId);
    const archiveItems = await getProductImageStudioProjectRepository().listResultArchiveItems(projectId);
    expect(archiveItems.some((item) => item.resultId === resultId && item.downloadUrl.includes(resultId))).toBe(true);

    const previewResponse = await GET_RESULT_PREVIEW(
      new Request(
        `http://127.0.0.1:3000/api/product-image-studio/projects/${encodeURIComponent(projectId)}/results/${encodeURIComponent(resultId)}/preview`,
      ),
      { params: Promise.resolve({ id: projectId, resultId }) },
    );

    expect(previewResponse.status).toBe(200);
    expect(previewResponse.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(previewResponse.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(previewResponse.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it.each([
    {
      code: "SVG_CONVERSION_PNG_REQUIRED",
      fileName: "note.txt",
      type: "text/plain",
      bytes: new TextEncoder().encode("not png"),
    },
    {
      code: "SVG_CONVERSION_PNG_MALFORMED",
      fileName: "broken.png",
      type: "image/png",
      bytes: new TextEncoder().encode("not png"),
    },
    {
      code: "SVG_CONVERSION_FILE_EMPTY",
      fileName: "empty.png",
      type: "image/png",
      bytes: new Uint8Array(),
    },
    {
      code: "SVG_CONVERSION_FILE_TOO_LARGE",
      fileName: "large.png",
      type: "image/png",
      bytes: new Uint8Array(21 * 1024 * 1024),
    },
  ])("returns 400 for malformed input before saving: $code", async (caseInput) => {
    const response = await POST(multipartSvgConversionRequest({ ...caseInput, style: "icon", title: "불량 파일" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: { code: caseInput.code }, ok: false });
    expect(JSON.stringify(body)).not.toContain("API_KEY");
  });
});

type MultipartSvgConversionInput = {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly style: string;
  readonly title: string;
  readonly type: string;
};

function multipartSvgConversionRequest(input: MultipartSvgConversionInput): Request {
  const formData = new FormData();
  formData.set("file", new File([toArrayBuffer(input.bytes)], input.fileName, { type: input.type }));
  formData.set("style", input.style);
  formData.set("title", input.title);
  return new Request("http://127.0.0.1:3000/api/product-image-studio/svg-conversions", {
    body: formData,
    method: "POST",
  });
}

function readSvgFromRouteBody(body: unknown): string {
  return readStringPath(body, ["data", "svg"]);
}

function readStringPath(body: unknown, path: readonly string[]): string {
  let cursor = body;
  for (const segment of path) {
    if (typeof cursor !== "object" || cursor === null || !(segment in cursor)) {
      throw new Error(`${path.join(".")} missing`);
    }
    cursor = Object.getOwnPropertyDescriptor(cursor, segment)?.value;
  }
  if (typeof cursor !== "string") {
    throw new Error(`${path.join(".")} must be a string`);
  }
  return cursor;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
