import { Buffer } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as uploadAsset } from "@/app/api/product-image-studio/projects/[id]/assets/route";
import { POST as startGeneration } from "@/app/api/product-image-studio/projects/[id]/generations/route";
import { POST as createProject } from "@/app/api/product-image-studio/projects/route";
import { listCardSetConceptRecommendations } from "@/features/product-image-studio/domain/concepts";
import type { CardDisplayPose, CardFormat, ProductImageStudioAssetRole } from "@/features/product-image-studio/domain/types";
import { buildProductImageStudioPromptContext } from "@/features/product-image-studio/server/imageProvider";
import { createOpenAiImageProvider } from "@/features/product-image-studio/server/openAiImageProvider";
import { resetProductImageStudioProviderSettingsForTests } from "@/features/product-image-studio/server/providerSettingsStore";
import { manualCardOnlyProductionSettings, manualProductionSettings } from "./manualProductionSettings";

describe("product image studio OpenAI image provider", () => {
  afterEach(() => {
    resetProductImageStudioProviderSettingsForTests();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("turns OpenAI invalid key errors into an actionable Korean message without leaking the key", async () => {
    const provider = createOpenAiImageProvider({
      apiKey: "secret-openai-key",
      fetchImpl: async () =>
        openAiErrorResponse(
          {
            code: "invalid_api_key",
            message: "Incorrect API key provided: sk-live-secret-key. You can find your API key at https://platform.openai.com.",
            type: "invalid_request_error",
          },
          401,
          "req-openai-invalid-key",
        ),
      model: "gpt-image-1",
    });

    await expect(provider.generateScene({ promptContext: promptContext(), referenceImages: [] })).rejects.toMatchObject({
      message:
        "OpenAI 이미지 생성 요청이 실패했습니다: OpenAI API 키가 유효하지 않습니다. 설정에서 sk-... 키를 다시 저장해 주세요.",
      requestId: "req-openai-invalid-key",
      status: 401,
    });
    await expect(provider.generateScene({ promptContext: promptContext(), referenceImages: [] })).rejects.not.toThrow(
      /sk-live-secret-key/,
    );
  });

  it("surfaces OpenAI quota errors with the provider request id", async () => {
    const provider = createOpenAiImageProvider({
      apiKey: "secret-openai-key",
      fetchImpl: async () =>
        openAiErrorResponse(
          {
            code: "insufficient_quota",
            message: "You exceeded your current quota, please check your plan and billing details.",
            type: "insufficient_quota",
          },
          429,
          "req-openai-quota",
        ),
      model: "gpt-image-1",
    });

    await expect(provider.generateScene({ promptContext: promptContext(), referenceImages: [] })).rejects.toMatchObject({
      message:
        "OpenAI 이미지 생성 요청이 실패했습니다: OpenAI API 크레딧 또는 사용 한도가 부족합니다. OpenAI Platform의 Billing/Usage Limits를 확인해 주세요.",
      requestId: "req-openai-quota",
      status: 429,
    });
  });

  it("surfaces OpenAI model access and organization verification errors", async () => {
    const provider = createOpenAiImageProvider({
      apiKey: "secret-openai-key",
      fetchImpl: async () =>
        openAiErrorResponse(
          {
            code: "model_not_found",
            message: "Your organization must be verified to use GPT image models.",
            type: "invalid_request_error",
          },
          403,
          "req-openai-model-access",
        ),
      model: "gpt-image-1",
    });

    await expect(provider.generateScene({ promptContext: promptContext(), referenceImages: [] })).rejects.toMatchObject({
      message:
        "OpenAI 이미지 생성 요청이 실패했습니다: OpenAI 조직 인증 또는 이미지 모델 권한이 필요합니다. Platform에서 Organization Verification, 프로젝트 권한, 모델 설정을 확인해 주세요.",
      requestId: "req-openai-model-access",
      status: 403,
    });
  });

  it("returns the safe OpenAI error detail through the generation API surface", async () => {
    vi.stubEnv("OPENAI_API_KEY", "secret-openai-key");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL", "gpt-image-1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER", "openai");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER_SETTINGS_STORE", "memory");
    vi.stubGlobal(
      "fetch",
      async () =>
        openAiErrorResponse(
          {
            code: "invalid_api_key",
            message: "Incorrect API key provided: sk-live-secret-key.",
            type: "invalid_request_error",
          },
          401,
          "req-openai-route-invalid-key",
        ),
    );
    const projectId = await createProjectId("folded_card");
    const uploadResponse = await uploadAsset(uploadRequest(projectId, "folded_card_outer_front"), {
      params: Promise.resolve({ id: projectId }),
    });
    expect(uploadResponse.status).toBe(201);

    const response = await startGeneration(generationRequest(projectId), {
      params: Promise.resolve({ id: projectId }),
    });
    const bodyText = await response.text();

    expect(response.status).toBe(502);
    expect(bodyText).toContain("OpenAI API 키가 유효하지 않습니다.");
    expect(bodyText).toContain("req-openai-route-invalid-key");
    expect(bodyText).not.toContain("secret-openai-key");
    expect(bodyText).not.toContain("sk-live-secret-key");
  });
});

function openAiErrorResponse(
  error: { readonly code: string; readonly message: string; readonly type: string },
  status: number,
  requestId: string,
): Response {
  return new Response(JSON.stringify({ error }), {
    headers: { "content-type": "application/json", "x-request-id": requestId },
    status,
  });
}

function promptContext() {
  return buildProductImageStudioPromptContext({
    assetRoles: ["folded_card_outer_front"],
    cardPose: "folded_closed",
    concept: readConcept("minimal-studio"),
    outputType: "card_single",
    project: project("folded_card", ["folded_closed"]),
    qualityMode: "draft",
    ratio: "1:1",
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
    ratios: ["1:1"],
    requestedCardPoses,
    requestedOutputs: ["card_single"],
    updatedAt: "2026-06-11T00:00:00.000Z",
  } as const;
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

function generationRequest(projectId: string): Request {
  return new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/generations`, {
    body: JSON.stringify({
      conceptId: "minimal-studio",
      outputs: ["card_single"],
      productionSettings: manualCardOnlyProductionSettings(),
      provider: "openai",
      qualityMode: "draft",
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

function readConcept(id: string) {
  const concept = listCardSetConceptRecommendations().find((candidate) => candidate.id === id);
  if (!concept) {
    throw new Error(`concept missing: ${id}`);
  }
  return concept;
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
