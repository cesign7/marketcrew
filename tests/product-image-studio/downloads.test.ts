import { describe, expect, it, vi, afterEach } from "vitest";
import { GET as downloadZip } from "@/app/api/product-image-studio/projects/[id]/downloads.zip/route";
import { GET as downloadResult } from "@/app/api/product-image-studio/projects/[id]/results/[resultId]/download/route";
import { POST as createProject } from "@/app/api/product-image-studio/projects/route";
import { POST as startGeneration } from "@/app/api/product-image-studio/projects/[id]/generations/route";
import {
  createProductImageStudioZipArchive,
  createProductImageStudioZipArchiveFromStore,
  parseProductImageStudioCustomRatio,
  regenerateProductImageStudioRatio,
  toProductImageStudioDownloadItems,
} from "@/features/product-image-studio/server/downloads";
import type { ProductImageFileStore } from "@/features/product-image-studio/server/fileStore";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";
import { createInMemoryProductImageStudioRepository, type ProductImageStudioProjectRecord, type ProductImageStudioResultRecord } from "@/lib/persistence/productImageStudioRepository";
import type { CardDisplayPose, ProductImageStudioAssetRole, ProductImageStudioOutputType, ProductImageStudioRatioPreset } from "@/features/product-image-studio/domain/types";
import { manualProductionSettings } from "./manualProductionSettings";

describe("product image studio downloads", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds safe individual file names and download URLs", () => {
    const project = projectRecord("project-download-1");
    const items = toProductImageStudioDownloadItems(project, [
      resultRecord("result-1", "set_combined", "folded_closed", "1:1"),
      resultRecord("result-2", "seal_sticker_single", undefined, "4:5"),
    ]);

    expect(items.map((item) => item.fileName)).toEqual([
      "project-download-1-set_combined-folded_closed-1x1.png",
      "project-download-1-seal_sticker_single-4x5.png",
    ]);
    expect(items[0]?.downloadUrl).toBe("/api/product-image-studio/projects/project-download-1/results/result-1/download");
    expect(items[0]).toMatchObject({
      vectorSvgUrl: "/api/product-image-studio/projects/project-download-1/results/result-1/vector.svg?style=flat_illustration",
    });
    for (const item of items) {
      expect(item.fileName).not.toContain("..");
      expect(item.fileName).not.toContain("/");
    }
  });

  it("creates a zip archive with a manifest containing all output roles", () => {
    const project = projectRecord("project-download-2");
    const archive = createProductImageStudioZipArchive(project, [
      resultRecord("result-1", "set_combined", "folded_closed", "1:1"),
      resultRecord("result-2", "card_single", "folded_open_spread", "1:1"),
      resultRecord("result-3", "envelope_single", undefined, "1:1"),
      resultRecord("result-4", "seal_sticker_single", undefined, "1:1"),
    ]);
    const archiveText = new TextDecoder().decode(archive.bytes);

    expect(archive.fileName).toBe("project-download-2-product-image-studio.zip");
    expect(archive.manifest.files.map((file) => file.outputType)).toEqual(["set_combined", "card_single", "envelope_single", "seal_sticker_single"]);
    expect(archiveText).toContain("manifest.json");
    expect(archiveText).toContain("set_combined");
    expect(archiveText).toContain("seal_sticker_single");
  });

  it("keeps image-generator result download URLs and ZIP manifest usable", async () => {
    const project = projectRecord("project-download-1", {
      cardFormat: "postcard_flat",
      name: "AI 이미지 생성기 - 차분한 문구",
      productionSettings: manualProductionSettings("postcard_flat"),
      requestedCardPoses: ["postcard_front_flat"],
      requestedOutputs: ["card_single"],
      ratios: ["1:1"],
    });
    const result = resultRecord("result-ai", "card_single", undefined, "1:1");
    const items = toProductImageStudioDownloadItems(project, [result]);
    const archive = await createProductImageStudioZipArchiveFromStore(project, [result], memoryImageStore(result.storageKey));
    const archiveText = new TextDecoder().decode(archive.bytes);

    expect(items).toEqual([
      expect.objectContaining({
        contentType: "image/png",
        downloadUrl: "/api/product-image-studio/projects/project-download-1/results/result-ai/download",
        fileName: "project-download-1-card_single-1x1.png",
      }),
    ]);
    expect(archive.manifest).toMatchObject({
      files: [expect.objectContaining({ fileName: "project-download-1-card_single-1x1.png", outputType: "card_single" })],
      projectId: "project-download-1",
      projectName: "AI 이미지 생성기 - 차분한 문구",
    });
    expect(archiveText).toContain("manifest.json");
    expect(archiveText).toContain("files/project-download-1-card_single-1x1.png");
  });

  it("validates custom ratio dimensions", () => {
    expect(parseProductImageStudioCustomRatio({ height: 1500, width: 1200 })).toEqual({
      dimensions: { height: 1500, width: 1200 },
      ok: true,
    });
    expect(parseProductImageStudioCustomRatio({ height: 0, width: 1200 })).toMatchObject({ error: { code: "CUSTOM_RATIO_SIZE_INVALID" }, ok: false });
    expect(parseProductImageStudioCustomRatio({ height: 1500.5, width: 1200 })).toMatchObject({ error: { code: "CUSTOM_RATIO_SIZE_INVALID" }, ok: false });
  });

  it("regenerates a ratio by appending a new result record without mutating the original", async () => {
    const repository = createInMemoryProductImageStudioRepository({
      createId: nextId(["project-1", "generation-1", "result-original", "result-regenerated"]),
      now: () => "2026-06-11T00:00:00.000Z",
    });
    const project = await repository.createProject(projectInput());
    const generation = await repository.createGenerationRequest({
      conceptId: "minimal-studio",
      projectId: project.id,
      providerRequestSummary: { provider: "fake" },
      qualityMode: "draft",
      requestedCardPoses: ["folded_closed"],
      requestedOutputs: ["set_combined"],
    });
    const original = await repository.addResult({
      ...resultRecord("result-original", "set_combined", "folded_closed", "1:1"),
      generationRequestId: generation.id,
      projectId: project.id,
      storageKey: "product-image-studio/project-1/results/original.png",
    });

    const regenerated = await regenerateProductImageStudioRatio({
      customDimensions: { height: 1500, width: 1200 },
      projectId: project.id,
      repository,
      ratio: "custom",
      sourceResultId: original.id,
    });
    const results = await repository.listResults(project.id);

    expect(regenerated).toMatchObject({ ratio: "custom", width: 1200, height: 1500 });
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(original);
    expect(results[1]).toMatchObject({ id: "result-regenerated", storageKey: expect.stringContaining("custom-1200x1500") });
  });

  it("returns a zip download from the route when fake generation has produced results", async () => {
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_FAKE_PROVIDER_ENABLED", "1");
    const projectId = await createGeneratedProjectId();
    const response = await downloadZip(
      new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/downloads.zip`),
      { params: Promise.resolve({ id: projectId }) },
    );
    const bodyText = new TextDecoder().decode(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/zip");
    expect(bodyText).toContain("manifest.json");
    expect(bodyText).toContain("set_combined");
    expect(bodyText).toContain("card_single");
    expect(bodyText).toContain("envelope_single");
    expect(bodyText).toContain("seal_sticker_single");
  });

  it("returns stored generated image bytes from the individual download route", async () => {
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_FAKE_PROVIDER_ENABLED", "1");
    const projectId = await createGeneratedProjectId();
    const result = (await getProductImageStudioProjectRepository().listResults(projectId))[0];
    if (!result) {
      throw new Error("generated result missing");
    }

    const response = await downloadResult(
      new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/results/${result.id}/download`),
      { params: Promise.resolve({ id: projectId, resultId: result.id }) },
    );
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
    expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });
});

function projectRecord(id: string, overrides: Partial<Omit<ProductImageStudioProjectRecord, "createdAt" | "id" | "updatedAt">> = {}): ProductImageStudioProjectRecord {
  return {
    ...projectInput(),
    createdAt: "2026-06-11T00:00:00.000Z",
    id,
    updatedAt: "2026-06-11T00:00:00.000Z",
    ...overrides,
  };
}

function projectInput() {
  return {
    cardFormat: "folded_card", name: "봄 초대장 세트/../", productType: "card_envelope_seal_set",
    productionSettings: manualProductionSettings("folded_card"), qualityMode: "draft", ratios: ["1:1", "4:5"],
    requestedCardPoses: ["folded_closed", "folded_open_spread"], requestedOutputs: ["set_combined", "card_single", "envelope_single", "seal_sticker_single"],
  } as const;
}

function resultRecord(id: string, outputType: ProductImageStudioOutputType, cardPose: CardDisplayPose | undefined, ratio: ProductImageStudioRatioPreset): ProductImageStudioResultRecord {
  return {
    cardPose,
    createdAt: "2026-06-11T00:00:00.000Z",
    generationRequestId: "generation-1",
    height: 1200,
    id,
    outputType,
    projectId: "project-download-1",
    ratio,
    storageKey: `product-image-studio/project-download-1/results/${id}.png`,
    width: 1200,
  };
}

function memoryImageStore(storageKey: string): ProductImageFileStore {
  return {
    readImage: async (key) => (key === storageKey ? { bytes: pngBytes(), contentType: "image/png" } : null),
    saveGeneratedImage: async () => {
      throw new Error("saveGeneratedImage is not used by this ZIP test");
    },
    saveImage: async () => {
      throw new Error("saveImage is not used by this ZIP test");
    },
  };
}

function pngBytes(): Uint8Array {
  return new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
}

function nextId(ids: readonly string[]): () => string {
  let index = 0;
  return () => {
    const id = ids[index];
    index += 1;
    return id ?? "fallback-id";
  };
}

async function createGeneratedProjectId(): Promise<string> {
  const createResponse = await createProject(
    new Request("http://127.0.0.1:3000/api/product-image-studio/projects", {
      body: JSON.stringify({ ...projectInput(), name: "봄 초대장 세트", ratios: ["1:1"] }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const projectId = readId(await createResponse.json());
  const requiredAssets = [
    { originalFileName: "card-front.png", role: "folded_card_outer_front" },
    { originalFileName: "envelope-front.png", role: "envelope_front" },
    { originalFileName: "seal.png", role: "seal_sticker" },
  ] as const satisfies readonly { readonly originalFileName: string; readonly role: ProductImageStudioAssetRole }[];
  await Promise.all(
    requiredAssets.map(({ originalFileName, role }) =>
      getProductImageStudioProjectRepository().addAsset({
        byteSize: 1024, contentType: "image/png", originalFileName, projectId,
        role,
        storageKey: `product-image-studio/${projectId}/${originalFileName}`,
      }),
    ),
  );
  await startGeneration(
    new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/generations`, {
      body: JSON.stringify({
        conceptId: "minimal-studio",
        outputs: ["set_combined", "card_single", "envelope_single", "seal_sticker_single"],
        productionSettings: manualProductionSettings("folded_card"),
        qualityMode: "draft",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
    { params: Promise.resolve({ id: projectId }) },
  );

  return projectId;
}

function readId(value: unknown): string {
  if (typeof value === "object" && value !== null && "id" in value && typeof value.id === "string") {
    return value.id;
  }

  throw new Error("id missing");
}
