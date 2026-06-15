import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/product-image-studio/image-generator/generations/route";
import {
  handleProductImageStudioImageGeneratorGeneration,
  type ProductImageStudioImageGeneratorProviderResolver,
} from "@/features/product-image-studio/server/imageGeneratorRunner";
import {
  enabledImageGeneratorRouteResolver,
  expectNoImageGeneratorRouteArchiveWrites,
  imageGeneratorRouteFile,
  imageGeneratorRouteTestState,
  multipartImageGeneratorRouteRequest,
  recordingImageGeneratorRouteProvider,
  safeImageGeneratorRouteSvg,
  validImageGeneratorRoutePayload,
} from "./imageGeneratorRouteTestSupport";

describe("product image studio image-generator route validation and gate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("proxies before parsing the multipart body", async () => {
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "https://api.marketcrew.test");
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ ok: true, proxied: true }), { status: 202 }));

    const response = await POST(new Request("http://127.0.0.1:3000/api/product-image-studio/image-generator/generations", {
      body: "not multipart",
      headers: { "content-type": "multipart/form-data; boundary=broken" },
      method: "POST",
    }));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true, proxied: true });
  });

  it.each([
    { code: "INVALID_JSON", request: () => multipartImageGeneratorRouteRequest("{") },
    {
      code: "REFERENCE_IMAGE_MIME_UNSUPPORTED",
      request: () => multipartImageGeneratorRouteRequest(validImageGeneratorRoutePayload(), [imageGeneratorRouteFile("note.txt", "text/plain", "x")]),
    },
    {
      code: "REFERENCE_IMAGE_TOO_LARGE",
      request: () => multipartImageGeneratorRouteRequest(validImageGeneratorRoutePayload(), [
        imageGeneratorRouteFile("large.png", "image/png", new ArrayBuffer(21 * 1024 * 1024)),
      ]),
    },
  ])("returns 400 for malformed input before provider or archive writes: $code", async (caseInput) => {
    const state = imageGeneratorRouteTestState();
    const provider = recordingImageGeneratorRouteProvider("openai");
    const response = await handleProductImageStudioImageGeneratorGeneration(caseInput.request(), {
      ...state,
      resolveProvider: enabledImageGeneratorRouteResolver("gpt-image-2", provider),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: caseInput.code }, ok: false });
    expect(provider.calls).toHaveLength(0);
    await expectNoImageGeneratorRouteArchiveWrites(state);
  });

  it("rejects unsafe SVG and rasterization failures before provider resolution", async () => {
    const unsafe = imageGeneratorRouteTestState();
    const rasterFailure = imageGeneratorRouteTestState();
    const resolveProvider = vi.fn<ProductImageStudioImageGeneratorProviderResolver>();
    const unsafeResponse = await handleProductImageStudioImageGeneratorGeneration(
      multipartImageGeneratorRouteRequest(validImageGeneratorRoutePayload(), [
        imageGeneratorRouteFile("unsafe.svg", "image/svg+xml", "<svg><script>alert(1)</script></svg>"),
      ]),
      { ...unsafe, resolveProvider },
    );
    const rasterResponse = await handleProductImageStudioImageGeneratorGeneration(
      multipartImageGeneratorRouteRequest(validImageGeneratorRoutePayload(), [
        imageGeneratorRouteFile("safe.svg", "image/svg+xml", safeImageGeneratorRouteSvg()),
      ]),
      {
        ...rasterFailure,
        rasterizeSvg: async () => {
          throw new Error("raster failed");
        },
        resolveProvider,
      },
    );

    expect(unsafeResponse.status).toBe(400);
    expect(rasterResponse.status).toBe(400);
    expect(resolveProvider).not.toHaveBeenCalled();
    await expectNoImageGeneratorRouteArchiveWrites(unsafe);
    await expectNoImageGeneratorRouteArchiveWrites(rasterFailure);
  });

  it("returns 423 for a closed gate without repository writes or fetch", async () => {
    const state = imageGeneratorRouteTestState();
    const provider = recordingImageGeneratorRouteProvider("openai");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await handleProductImageStudioImageGeneratorGeneration(
      multipartImageGeneratorRouteRequest(validImageGeneratorRoutePayload()),
      {
        ...state,
        resolveProvider: async () => ({ kind: "blocked", provider, reason: "generation_disabled" }),
      },
    );
    const bodyText = await response.text();

    expect(response.status).toBe(423);
    expect(JSON.parse(bodyText)).toMatchObject({ data: { generation: { reason: "generation_disabled", status: "blocked" } }, ok: true });
    expect(provider.calls).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(bodyText).not.toContain("secret");
    await expectNoImageGeneratorRouteArchiveWrites(state);
  });
});
