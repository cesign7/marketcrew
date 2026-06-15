import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as startGeneration } from "@/app/api/product-image-studio/projects/[id]/generations/route";
import {
  createProviderRouteProjectId,
  manualCardOnlySettingsForProviderRoute,
  uploadProviderRouteAsset,
} from "./imageProviderTestSupport";

describe("product image studio OpenAI image provider route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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
    const projectId = await createProviderRouteProjectId("folded_card");
    const uploadResponse = await uploadProviderRouteAsset(projectId, "folded_card_outer_front");
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

function generationRequest(projectId: string): Request {
  return new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/generations`, {
    body: JSON.stringify({
      conceptId: "minimal-studio",
      outputs: ["card_single"],
      productionSettings: manualCardOnlySettingsForProviderRoute(),
      provider: "openai",
      qualityMode: "draft",
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

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
