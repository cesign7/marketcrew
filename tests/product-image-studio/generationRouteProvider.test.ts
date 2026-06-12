import { Buffer } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as uploadAsset } from "@/app/api/product-image-studio/projects/[id]/assets/route";
import { POST as startGeneration } from "@/app/api/product-image-studio/projects/[id]/generations/route";
import { POST as createProject } from "@/app/api/product-image-studio/projects/route";
import type { CardFormat, ProductImageStudioAssetRole } from "@/features/product-image-studio/domain/types";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";
import { manualCardOnlyProductionSettings, manualProductionSettings } from "./manualProductionSettings";

describe("product image studio generation route provider selection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the selected provider for generation", async () => {
    stubLocalRouteEnv();
    vi.stubEnv("OPENAI_API_KEY", "openai-test-key");
    vi.stubEnv("GEMINI_API_KEY", "gemini-test-key");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL", "gpt-image-2");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER", "openai");
    const capturedUrls: string[] = [];
    vi.stubGlobal("fetch", async (input: string) => {
      capturedUrls.push(input);
      return input.includes("generativelanguage")
        ? geminiImageResponse("gemini generated png")
        : openAiImageResponse("openai generated png");
    });
    const createGenerationSpy = vi.spyOn(getProductImageStudioProjectRepository(), "createGenerationRequest");

    const projectId = await createProjectId("folded_card");
    const uploadResponse = await uploadAsset(uploadRequest(projectId, "folded_card_outer_front"), {
      params: Promise.resolve({ id: projectId }),
    });
    expect(uploadResponse.status).toBe(201);

    const response = await startGeneration(generationRequest(projectId, "gemini"), {
      params: Promise.resolve({ id: projectId }),
    });

    expect(response.status).toBe(200);
    expect(capturedUrls[0]).toContain("generativelanguage.googleapis.com");
    expect(capturedUrls[0]).toContain("gemini-3.1-flash-image");
    expect(createGenerationSpy).toHaveBeenCalledWith(expect.objectContaining({
      providerRequestSummary: expect.objectContaining({
        model: "gemini-3.1-flash-image",
        provider: "gemini",
      }),
    }));
  });

  it("blocks a disconnected selected provider without calling another provider", async () => {
    stubLocalRouteEnv();
    vi.stubEnv("OPENAI_API_KEY", "openai-test-key");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL", "gpt-image-2");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER", "openai");
    const fetchSpy = vi.fn(async () => openAiImageResponse("openai generated png"));
    vi.stubGlobal("fetch", fetchSpy);

    const projectId = await createProjectId("folded_card");
    const uploadResponse = await uploadAsset(uploadRequest(projectId, "folded_card_outer_front"), {
      params: Promise.resolve({ id: projectId }),
    });
    expect(uploadResponse.status).toBe(201);

    const response = await startGeneration(generationRequest(projectId, "gemini"), {
      params: Promise.resolve({ id: projectId }),
    });
    const bodyJson: unknown = await response.json();

    expect(response.status).toBe(423);
    expect(bodyJson).toMatchObject({
      data: {
        generation: { provider: "gemini", reason: "credential_missing", status: "blocked" },
      },
      ok: true,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

function stubLocalRouteEnv(): void {
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
  vi.stubEnv("MARKETCREW_API_BASE_URL", "");
  vi.stubEnv("MARKETCREW_API_TOKEN", "");
  vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "");
  vi.stubEnv("MARKETCREW_BACKEND_API_URL", "");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("PRODUCT_IMAGE_STUDIO_GEMINI_IMAGE_MODEL", "");
  vi.stubEnv("PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL", "");
  vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER_SETTINGS_STORE", "memory");
}

async function createProjectId(cardFormat: CardFormat): Promise<string> {
  const response = await createProject(
    new Request("http://127.0.0.1:3000/api/product-image-studio/projects", {
      body: JSON.stringify({
        cardFormat,
        name: "봄 초대장 세트",
        productType: "card_envelope_seal_set",
        productionSettings: manualProductionSettings(cardFormat),
        qualityMode: "draft",
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

function generationRequest(projectId: string, provider: "gemini" | "openai"): Request {
  return new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/generations`, {
    body: JSON.stringify({
      conceptId: "minimal-studio",
      outputs: ["card_single"],
      productionSettings: manualCardOnlyProductionSettings(),
      provider,
      qualityMode: "draft",
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
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

function geminiImageResponse(text: string): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  data: Buffer.from(text).toString("base64"),
                  mimeType: "image/png",
                },
              },
            ],
          },
        },
      ],
    }),
    { headers: { "content-type": "application/json", "x-goog-request-id": "gemini-request" }, status: 200 },
  );
}

function openAiImageResponse(text: string): Response {
  return new Response(JSON.stringify({ data: [{ b64_json: Buffer.from(text).toString("base64") }] }), {
    headers: { "content-type": "application/json", "x-request-id": "openai-request" },
    status: 200,
  });
}
