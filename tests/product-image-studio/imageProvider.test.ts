import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as downloadResult } from "@/app/api/product-image-studio/projects/[id]/results/[resultId]/download/route";
import { POST as uploadAsset } from "@/app/api/product-image-studio/projects/[id]/assets/route";
import { POST as createProject } from "@/app/api/product-image-studio/projects/route";
import { POST as startGeneration } from "@/app/api/product-image-studio/projects/[id]/generations/route";
import { listCardSetConceptRecommendations } from "@/features/product-image-studio/domain/concepts";
import { buildProductImageStudioPromptContext, createFakeProductImageStudioImageProvider, resolveProductImageStudioImageProvider } from "@/features/product-image-studio/server/imageProvider";
import { createOpenAiImageProvider } from "@/features/product-image-studio/server/openAiImageProvider";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";
import type { CardDisplayPose, CardFormat, ProductImageStudioAssetRole } from "@/features/product-image-studio/domain/types";
import { manualCardOnlyProductionSettings, manualProductionSettings } from "./manualProductionSettings";

describe("product image studio image provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns deterministic fake provider output for local blocked mode", async () => {
    const provider = createFakeProductImageStudioImageProvider();
    const promptContext = foldedPromptContext(["folded_card_outer_front", "envelope_front", "seal_sticker"]);
    const first = await provider.generateScene({ promptContext, referenceImages: [] });
    const second = await provider.generateScene({ promptContext, referenceImages: [] });

    expect(first).toEqual(second);
    expect(first.provider).toBe("fake");
    expect(first.model).toBe("fake-product-image-studio");
    expect(first.b64Json).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("keeps the provider blocked by default and exposes a fake provider for local tests", () => {
    const resolved = resolveProductImageStudioImageProvider({});

    expect(resolved.kind).toBe("blocked");
    if (resolved.kind === "blocked") {
      expect(resolved.reason).toBe("generation_disabled");
      expect(resolved.provider.name).toBe("fake");
    }
  });

  it("builds prompts with card format, pose, and asset role context", () => {
    const folded = foldedPromptContext(["folded_card_outer_front", "folded_card_fold_metadata", "envelope_front"]);
    const postcard = postcardPromptContext(["postcard_front", "envelope_front", "seal_sticker"]);

    expect(folded.prompt).toContain("cardFormat=folded_card");
    expect(folded.prompt).toContain("requestedCardPoses=folded_closed,folded_open_spread,folded_standing");
    expect(folded.prompt).toContain("assetRoles=folded_card_outer_front,folded_card_fold_metadata,envelope_front");
    expect(folded.prompt).toContain("generationMethod=mockup_composite_first");
    expect(folded.prompt).toContain("cardFoldedSize=100x150mm");
    expect(folded.prompt).toContain("envelopeSize=110x160mm");
    expect(folded.prompt).toContain("designPreservation=exact_composite");
    expect(folded.prompt).toContain("카드와 봉투의 상대 크기가 실제 사양과 맞아야 합니다.");
    expect(folded.prompt).toContain("접힌 축");
    expect(postcard.prompt).toContain("cardFormat=postcard_flat");
    expect(postcard.prompt).toContain("assetRoles=postcard_front,envelope_front,seal_sticker");
    expect(postcard.prompt).toContain("접힘 없는");
    expect(postcard.prompt).not.toBe(folded.prompt);
  });

  it("builds an OpenAI adapter request without leaking the API key in results", async () => {
    let capturedBody = "";
    let capturedAuthorization = "";
    const provider = createOpenAiImageProvider({
      apiKey: "secret-test-key",
      fetchImpl: async (_input, init) => {
        capturedBody = typeof init?.body === "string" ? init.body : "";
        capturedAuthorization = init?.headers instanceof Headers ? init.headers.get("authorization") ?? "" : "";
        return new Response(JSON.stringify({ data: [{ b64_json: "ZmFrZS1pbWFnZQ==" }] }), {
          headers: { "content-type": "application/json", "x-request-id": "req-test" },
          status: 200,
        });
      },
      model: "gpt-image-2",
    });
    const result = await provider.generateScene({
      promptContext: foldedPromptContext(["folded_card_outer_front", "seal_sticker"]),
      referenceImages: [],
    });

    expect(capturedBody).toContain("\"model\":\"gpt-image-2\"");
    expect(capturedBody).toContain("cardFormat=folded_card");
    expect(capturedAuthorization).toBe("Bearer secret-test-key");
    expect(result.model).toBe("gpt-image-2");
    expect(JSON.stringify(result)).not.toContain("secret-test-key");
  });

  it("returns a blocked generation response without provider billing in default env", async () => {
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "0");
    const projectId = await createProjectId("folded_card");
    await getProductImageStudioProjectRepository().addAsset({
      byteSize: 1024,
      contentType: "image/png",
      originalFileName: "card-front.png",
      projectId,
      role: "folded_card_outer_front",
      storageKey: `product-image-studio/${projectId}/card-front.png`,
    });
    const response = await startGeneration(
      new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/generations`, {
        body: JSON.stringify({
          conceptId: "minimal-studio",
          outputs: ["card_single"],
          productionSettings: manualCardOnlyProductionSettings(),
          qualityMode: "high",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
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
    const projectId = await createProjectId("folded_card");
    const uploadResponse = await uploadAsset(uploadRequest(projectId, "folded_card_outer_front"), {
      params: Promise.resolve({ id: projectId }),
    });
    expect(uploadResponse.status).toBe(201);

    const response = await startGeneration(
      new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/generations`, {
        body: JSON.stringify({
          conceptId: "minimal-studio",
          outputs: ["card_single"],
          productionSettings: manualCardOnlyProductionSettings(),
          qualityMode: "draft",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
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
});

function foldedPromptContext(assetRoles: readonly ProductImageStudioAssetRole[]) {
  return buildProductImageStudioPromptContext({
    assetRoles,
    cardPose: "folded_open_spread",
    concept: readConcept("minimal-studio"),
    outputType: "set_combined",
    project: project("folded_card", ["folded_closed", "folded_open_spread", "folded_standing"]),
    qualityMode: "high",
    ratio: "1:1",
  });
}

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
