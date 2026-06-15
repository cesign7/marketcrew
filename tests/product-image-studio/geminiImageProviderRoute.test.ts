import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as startGeneration } from "@/app/api/product-image-studio/projects/[id]/generations/route";
import {
  createProviderRouteProjectId,
  manualSettingsForProviderRoute,
  uploadProviderRouteAsset,
} from "./imageProviderTestSupport";

describe("product image studio Gemini image provider route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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
    const projectId = await createProviderRouteProjectId("postcard_flat");
    const uploadResponse = await uploadProviderRouteAsset(projectId, "postcard_front");
    expect(uploadResponse.status).toBe(201);

    const response = await startGeneration(
      new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/generations`, {
        body: JSON.stringify({
          conceptId: "minimal-studio",
          outputs: ["card_single"],
          productionSettings: manualSettingsForProviderRoute("postcard_flat"),
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
