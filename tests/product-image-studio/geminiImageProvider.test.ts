import { Buffer } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGeminiGenerateContentRequestBody,
  createGeminiImageProvider,
} from "@/features/product-image-studio/server/geminiImageProvider";
import {
  postcardProviderPromptContext,
  type PromptGeneratorResolution,
} from "./imageProviderTestSupport";

describe("product image studio Gemini image provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("keeps product-staging Gemini generation bodies valid when resolution is absent", () => {
    const body = buildGeminiGenerateContentRequestBody(
      { promptContext: postcardProviderPromptContext(["postcard_front"]), referenceImages: [] },
      "gemini-3.1-flash-image",
    );

    expect(body.generationConfig).toEqual({
      imageConfig: {
        aspectRatio: "4:5",
        imageSize: "512",
      },
      responseModalities: ["IMAGE"],
    });
  });

  it.each([
    { imageSize: "512", resolution: "0.5k" },
    { imageSize: "1K", resolution: "1k" },
    { imageSize: "2K", resolution: "2k" },
  ] satisfies readonly { readonly imageSize: "512" | "1K" | "2K"; readonly resolution: PromptGeneratorResolution }[])(
    "maps Gemini prompt-generator resolution $resolution to imageSize $imageSize when supported",
    ({ imageSize, resolution }) => {
      const body = buildGeminiGenerateContentRequestBody(
        { promptContext: postcardProviderPromptContext(["postcard_front"], { resolution }), referenceImages: [] },
        "gemini-3.1-flash-image",
      );

      expect(body.generationConfig?.imageConfig).toEqual({
        aspectRatio: "4:5",
        imageSize,
      });
    },
  );

  it("omits Gemini imageSize for unsupported generation-config models even when resolution is requested", () => {
    const body = buildGeminiGenerateContentRequestBody(
      { promptContext: postcardProviderPromptContext(["postcard_front"], { resolution: "2k" }), referenceImages: [] },
      "gemini-2.5-flash-image-preview",
    );

    expect(body.generationConfig?.imageConfig).toEqual({
      aspectRatio: "4:5",
    });
  });

  it("builds a Gemini adapter request with prompt and reference images", async () => {
    let capturedBody = "";
    let capturedApiKey = "";
    let capturedUrl = "";
    const provider = createGeminiImageProvider({
      apiKey: "secret-gemini-key",
      fetchImpl: async (input, init) => {
        capturedUrl = input;
        capturedBody = typeof init.body === "string" ? init.body : "";
        capturedApiKey = init.headers instanceof Headers ? init.headers.get("x-goog-api-key") ?? "" : "";
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ inlineData: { data: Buffer.from("gemini generated png").toString("base64") } }],
                },
              },
            ],
          }),
          { headers: { "x-goog-request-id": "gemini-request" }, status: 200 },
        );
      },
      model: "gemini-3.1-flash-image",
    });

    const result = await provider.editWithReferences({
      promptContext: postcardProviderPromptContext(["postcard_front"]),
      referenceImages: [
        {
          bytes: Uint8Array.from([1, 2, 3]).buffer,
          contentType: "image/png",
          fileName: "postcard-front.png",
          role: "postcard_front",
        },
      ],
    });

    expect(capturedApiKey).toBe("secret-gemini-key");
    expect(capturedUrl).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent");
    expect(capturedBody).toContain("\"responseModalities\":[\"IMAGE\"]");
    expect(capturedBody).toContain("\"imageConfig\"");
    expect(capturedBody).toContain("\"aspectRatio\":\"4:5\"");
    expect(capturedBody).toContain("\"imageSize\":\"512\"");
    expect(capturedBody).not.toContain("\"responseFormat\"");
    expect(capturedBody).toContain("\"inline_data\"");
    expect(result.provider).toBe("gemini");
    expect(result.requestId).toBe("gemini-request");
    expect(JSON.stringify(result)).not.toContain("secret-gemini-key");
  });

  it("retries once without generation config when Gemini rejects the config schema", async () => {
    const capturedBodies: string[] = [];
    const provider = createGeminiImageProvider({
      apiKey: "secret-gemini-key",
      fetchImpl: async (_input, init) => {
        capturedBodies.push(typeof init.body === "string" ? init.body : "");
        if (capturedBodies.length === 1) {
          return new Response(
            JSON.stringify({
              error: {
                code: 400,
                message:
                  "Invalid JSON payload received. Unknown name \"responseModalities\" at 'generation_config': Cannot find field.",
                status: "INVALID_ARGUMENT",
              },
            }),
            { headers: { "x-goog-request-id": "gemini-schema-rejected" }, status: 400 },
          );
        }

        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ inline_data: { data: Buffer.from("gemini fallback png").toString("base64") } }],
                },
              },
            ],
          }),
          { headers: { "x-goog-request-id": "gemini-fallback-request" }, status: 200 },
        );
      },
      model: "gemini-3.1-flash-image",
    });

    const result = await provider.generateScene({
      promptContext: postcardProviderPromptContext(["postcard_front"], { resolution: "2k" }),
      referenceImages: [],
    });

    expect(capturedBodies).toHaveLength(2);
    expect(capturedBodies[0]).toContain("\"generationConfig\"");
    expect(capturedBodies[0]).toContain("\"imageConfig\"");
    expect(capturedBodies[0]).toContain("\"imageSize\":\"2K\"");
    expect(capturedBodies[1]).not.toContain("\"generationConfig\"");
    expect(result.b64Json).toBe(Buffer.from("gemini fallback png").toString("base64"));
    expect(result.requestId).toBe("gemini-fallback-request");
  });

  it("shows the safe Gemini provider error detail when image generation is rejected", async () => {
    const provider = createGeminiImageProvider({
      apiKey: "secret-gemini-key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 400,
              message: "Quota exceeded for this API key.",
              status: "INVALID_ARGUMENT",
            },
          }),
          { headers: { "x-goog-request-id": "gemini-rejected" }, status: 400 },
        ),
      model: "gemini-3.1-flash-image",
    });

    await expect(
      provider.generateScene({
        promptContext: postcardProviderPromptContext(["postcard_front"]),
        referenceImages: [],
      }),
    ).rejects.toMatchObject({
      message: "Gemini 이미지 생성 요청이 실패했습니다: Quota exceeded for this API key.",
      requestId: "gemini-rejected",
      status: 400,
    });
  });

  it("turns Gemini invalid API key errors into an actionable Korean message", async () => {
    const provider = createGeminiImageProvider({
      apiKey: "secret-gemini-key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 400,
              message: "API key not valid. Please pass a valid API key.",
              status: "INVALID_ARGUMENT",
            },
          }),
          { status: 400 },
        ),
      model: "gemini-3.1-flash-image",
    });

    await expect(
      provider.generateScene({
        promptContext: postcardProviderPromptContext(["postcard_front"]),
        referenceImages: [],
      }),
    ).rejects.toMatchObject({
      message:
        "Gemini 이미지 생성 요청이 실패했습니다: Gemini API 키가 유효하지 않습니다. 설정에서 AI Studio의 AIza... 키를 다시 저장해 주세요.",
      status: 400,
    });
  });
});
