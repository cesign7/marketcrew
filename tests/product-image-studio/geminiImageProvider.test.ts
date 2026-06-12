import { Buffer } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as uploadAsset } from "@/app/api/product-image-studio/projects/[id]/assets/route";
import { POST as startGeneration } from "@/app/api/product-image-studio/projects/[id]/generations/route";
import { POST as createProject } from "@/app/api/product-image-studio/projects/route";
import { listCardSetConceptRecommendations } from "@/features/product-image-studio/domain/concepts";
import type { CardDisplayPose, CardFormat, ProductImageStudioAssetRole } from "@/features/product-image-studio/domain/types";
import { buildProductImageStudioPromptContext } from "@/features/product-image-studio/server/imageProvider";
import { createGeminiImageProvider } from "@/features/product-image-studio/server/geminiImageProvider";
import { resetProductImageStudioProviderSettingsForTests } from "@/features/product-image-studio/server/providerSettingsStore";
import { manualProductionSettings } from "./manualProductionSettings";

describe("product image studio Gemini image provider", () => {
  afterEach(() => {
    resetProductImageStudioProviderSettingsForTests();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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
      promptContext: postcardPromptContext(["postcard_front"]),
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
    expect(capturedBody).toContain("\"imageSize\":\"1K\"");
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
      promptContext: postcardPromptContext(["postcard_front"]),
      referenceImages: [],
    });

    expect(capturedBodies).toHaveLength(2);
    expect(capturedBodies[0]).toContain("\"generationConfig\"");
    expect(capturedBodies[0]).toContain("\"imageConfig\"");
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
        promptContext: postcardPromptContext(["postcard_front"]),
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
        promptContext: postcardPromptContext(["postcard_front"]),
        referenceImages: [],
      }),
    ).rejects.toMatchObject({
      message:
        "Gemini 이미지 생성 요청이 실패했습니다: Gemini API 키가 유효하지 않습니다. 설정에서 AI Studio의 AIza... 키를 다시 저장해 주세요.",
      status: 400,
    });
  });

  it("returns the safe Gemini error detail through the generation API surface", async () => {
    vi.stubEnv("GEMINI_API_KEY", "secret-gemini-key");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER", "gemini");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER_SETTINGS_STORE", "memory");
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 400,
              message: "Quota exceeded for this API key.",
              status: "INVALID_ARGUMENT",
            },
          }),
          { headers: { "x-goog-request-id": "gemini-route-rejected" }, status: 400 },
        ),
    );
    const projectId = await createProjectId("postcard_flat");
    const uploadResponse = await uploadAsset(uploadRequest(projectId, "postcard_front"), {
      params: Promise.resolve({ id: projectId }),
    });
    expect(uploadResponse.status).toBe(201);

    const response = await startGeneration(
      new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/generations`, {
        body: JSON.stringify({
          conceptId: "minimal-studio",
          outputs: ["card_single"],
          productionSettings: manualProductionSettings("postcard_flat"),
          qualityMode: "draft",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const bodyText = await response.text();

    expect(response.status).toBe(502);
    expect(bodyText).toContain("Gemini 이미지 생성 요청이 실패했습니다: Quota exceeded for this API key.");
    expect(bodyText).toContain("gemini-route-rejected");
    expect(bodyText).not.toContain("secret-gemini-key");
  });
});

function postcardPromptContext(assetRoles: readonly ProductImageStudioAssetRole[]) {
  return buildProductImageStudioPromptContext({
    assetRoles,
    cardPose: "postcard_front_flat",
    concept: readConcept("minimal-studio"),
    outputType: "set_combined",
    project: project("postcard_flat", ["postcard_front_flat"]),
    qualityMode: "draft",
    ratio: "4:5",
  });
}

function project(cardFormat: CardFormat, requestedCardPoses: readonly CardDisplayPose[]) {
  return {
    cardFormat,
    createdAt: "2026-06-11T00:00:00.000Z",
    id: `${cardFormat}-project`,
    name: "봄 초대장 세트",
    productType: "card_envelope_seal_set",
    qualityMode: "draft",
    productionSettings: manualProductionSettings(cardFormat),
    ratios: ["1:1", "4:5"],
    requestedCardPoses,
    requestedOutputs: ["set_combined", "card_single", "envelope_single", "seal_sticker_single"],
    updatedAt: "2026-06-11T00:00:00.000Z",
  } as const;
}

function readConcept(id: string) {
  const concept = listCardSetConceptRecommendations().find((candidate) => candidate.id === id);
  if (!concept) {
    throw new Error(`concept missing: ${id}`);
  }
  return concept;
}

async function createProjectId(cardFormat: CardFormat): Promise<string> {
  const response = await createProject(
    new Request("http://127.0.0.1:3000/api/product-image-studio/projects", {
      body: JSON.stringify({
        cardFormat,
        name: "봄 초대장 세트",
        productType: "card_envelope_seal_set",
        qualityMode: "draft",
        productionSettings: manualProductionSettings(cardFormat),
        ratios: ["1:1"],
        requestedCardPoses: cardFormat === "folded_card" ? ["folded_closed"] : ["postcard_front_flat"],
        requestedOutputs: ["set_combined", "card_single", "envelope_single", "seal_sticker_single"],
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const body: unknown = await response.json();
  if (typeof body === "object" && body !== null && "id" in body && typeof body.id === "string") {
    return body.id;
  }

  throw new Error("project id missing");
}

function uploadRequest(projectId: string, role: ProductImageStudioAssetRole): Request {
  const formData = new FormData();
  formData.set("role", role);
  formData.set("file", new File([Buffer.from("uploaded card bytes")], "card-front.png", { type: "image/png" }));

  return new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/assets`, {
    body: formData,
    method: "POST",
  });
}
