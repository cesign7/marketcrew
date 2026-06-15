import { Buffer } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as downloadResult } from "@/app/api/product-image-studio/projects/[id]/results/[resultId]/download/route";
import { POST as startGeneration } from "@/app/api/product-image-studio/projects/[id]/generations/route";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";
import {
  createProviderRouteProjectId,
  manualCardOnlySettingsForProviderRoute,
  manualSettingsForProviderRoute,
  providerRouteUploadRequest,
  uploadProviderRouteAsset,
} from "./imageProviderTestSupport";

describe("product image studio image provider route integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns a blocked generation response without provider billing in default env", async () => {
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "0");
    const projectId = await createProviderRouteProjectId("folded_card");
    await getProductImageStudioProjectRepository().addAsset({
      byteSize: 1024,
      contentType: "image/png",
      originalFileName: "card-front.png",
      projectId,
      role: "folded_card_outer_front",
      storageKey: `product-image-studio/${projectId}/card-front.png`,
    });
    const response = await startGeneration(generationRequest(projectId, ["card_single"], manualCardOnlySettingsForProviderRoute()), {
      params: Promise.resolve({ id: projectId }),
    });
    const bodyText = await response.text();
    const bodyJson: unknown = JSON.parse(bodyText);

    expect(response.status).toBe(423);
    expect(bodyJson).toMatchObject({
      data: {
        generation: { reason: "generation_disabled", status: "blocked" },
      },
      ok: true,
    });
    expect(bodyText).not.toContain("OPENAI_API_KEY");
    expect(bodyText).not.toContain("secret");
  });

  it("stores OpenAI generated image bytes and returns ready results when the provider is enabled", async () => {
    vi.stubEnv("OPENAI_API_KEY", "secret-test-key");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL", "gpt-image-2");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER", "openai");
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(JSON.stringify({ data: [{ b64_json: Buffer.from("openai generated png").toString("base64") }] }), {
          headers: { "content-type": "application/json", "x-request-id": "req-generated" },
          status: 200,
        }),
    );
    const projectId = await createProviderRouteProjectId("folded_card");
    const uploadResponse = await uploadProviderRouteAsset(projectId, "folded_card_outer_front");
    expect(uploadResponse.status).toBe(201);

    const response = await startGeneration(generationRequest(projectId, ["card_single"], manualCardOnlySettingsForProviderRoute()), {
      params: Promise.resolve({ id: projectId }),
    });
    const bodyJson: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(bodyJson).toMatchObject({
      data: {
        generation: { status: "ready" },
        results: [{ outputType: "card_single", ratio: "1:1" }],
      },
      ok: true,
    });
    const results = await getProductImageStudioProjectRepository().listResults(projectId);
    const generated = results[0];
    if (!generated) {
      throw new Error("generated result missing");
    }

    const downloadResponse = await downloadResult(
      new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/results/${generated.id}/download`),
      { params: Promise.resolve({ id: projectId, resultId: generated.id }) },
    );
    expect(new TextDecoder().decode(await downloadResponse.arrayBuffer())).toBe("openai generated png");
  });

  it("returns saved OpenAI results when another requested output fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "secret-test-key");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL", "gpt-image-2");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER", "openai");
    let callCount = 0;
    vi.stubGlobal("fetch", async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Response(JSON.stringify({ data: [{ b64_json: Buffer.from("saved card png").toString("base64") }] }), {
          headers: { "content-type": "application/json", "x-request-id": "req-card" },
          status: 200,
        });
      }
      return new Response(
        JSON.stringify({
          error: {
            code: "insufficient_quota",
            message: "You exceeded your current quota. Secret key sk-live-secret-key.",
            type: "insufficient_quota",
          },
        }),
        {
          headers: { "content-type": "application/json", "x-request-id": "req-seal-failed" },
          status: 429,
        },
      );
    });
    const projectId = await createProviderRouteProjectId("folded_card");
    const cardUpload = await uploadProviderRouteAsset(projectId, "folded_card_outer_front");
    const sealUpload = await uploadProviderRouteAsset(projectId, "seal_sticker");
    expect(cardUpload.status).toBe(201);
    expect(sealUpload.status).toBe(201);

    const response = await startGeneration(
      generationRequest(projectId, ["card_single", "seal_sticker_single"], manualSettingsForProviderRoute("folded_card")),
      { params: Promise.resolve({ id: projectId }) },
    );
    const bodyText = await response.text();
    const bodyJson: unknown = JSON.parse(bodyText);

    expect(response.status).toBe(207);
    expect(bodyJson).toMatchObject({
      data: {
        generation: { status: "partial" },
        results: [{ outputType: "card_single", ratio: "1:1" }],
      },
      ok: true,
    });
    expect(bodyText).toContain("일부 이미지만 준비되었습니다.");
    expect(bodyText).not.toContain("sk-live-secret-key");
    expect(await getProductImageStudioProjectRepository().listResults(projectId)).toHaveLength(1);
  });
});

function generationRequest(
  projectId: string,
  outputs: readonly string[],
  productionSettings: ReturnType<typeof manualSettingsForProviderRoute>,
): Request {
  return new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/generations`, {
    body: JSON.stringify({
      conceptId: "minimal-studio",
      outputs,
      productionSettings,
      qualityMode: "draft",
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}
