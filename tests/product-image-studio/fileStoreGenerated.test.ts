import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildProductImageStudioDownloadManifest } from "@/features/product-image-studio/server/downloads";
import { createLocalProductImageFileStore } from "@/features/product-image-studio/server/fileStore";
import type {
  ProductImageStudioProjectRecord,
  ProductImageStudioResultRecord,
} from "@/lib/persistence/productImageStudioRepository";
import { manualProductionSettings } from "./manualProductionSettings";

describe("product image studio generated file store", () => {
  it("stores generated image bytes under a downloadable local result path", async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), "marketcrew-studio-results-"));
    const store = createLocalProductImageFileStore({
      createId: () => "unused-upload-id",
      maxBytes: 1024,
      publicBasePath: "/studio-assets",
      rootDirectory,
    });

    const result = await store.saveGeneratedImage({
      bytes: Buffer.from("generated png bytes"),
      contentType: "image/png",
      generationRequestId: "generation-001",
      outputType: "card_single",
      projectId: "project-001",
      ratio: "4:5",
    });
    const stored = await store.readImage(result.storageKey);

    expect(result.storageKey).toBe("product-image-studio/project-001/results/generation-001/card_single-4x5.png");
    expect(result.previewUrl).toBe("/studio-assets/project-001/results/generation-001/card_single-4x5.png");
    expect(new TextDecoder().decode(stored?.bytes)).toBe("generated png bytes");
  });

  it("stores generated image sequences under distinct local result paths", async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), "marketcrew-studio-result-sequences-"));
    const store = createLocalProductImageFileStore({
      maxBytes: 1024,
      publicBasePath: "/studio-assets",
      rootDirectory,
    });

    const first = await store.saveGeneratedImage({
      bytes: Buffer.from("first generated png"),
      contentType: "image/png",
      generationRequestId: "generation-001",
      outputType: "card_single",
      projectId: "project-001",
      ratio: "1:1",
      sequence: 1,
    });
    const second = await store.saveGeneratedImage({
      bytes: Buffer.from("second generated png"),
      contentType: "image/png",
      generationRequestId: "generation-001",
      outputType: "card_single",
      projectId: "project-001",
      ratio: "1:1",
      sequence: 2,
    });

    expect(first.storageKey).toBe("product-image-studio/project-001/results/generation-001/card_single-1-1x1.png");
    expect(second.storageKey).toBe("product-image-studio/project-001/results/generation-001/card_single-2-1x1.png");
    expect(new TextDecoder().decode((await store.readImage(first.storageKey))?.bytes)).toBe("first generated png");
    expect(new TextDecoder().decode((await store.readImage(second.storageKey))?.bytes)).toBe("second generated png");
  });

  it("stores generated SVG conversion artifacts under a downloadable result path", async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), "marketcrew-studio-result-svg-"));
    const store = createLocalProductImageFileStore({
      maxBytes: 1024,
      publicBasePath: "/studio-assets",
      rootDirectory,
    });
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#111"/></svg>',
    );

    const result = await store.saveGeneratedImage({
      bytes: svg,
      contentType: "image/svg+xml",
      generationRequestId: "generation-svg",
      outputType: "seal_sticker_single",
      projectId: "project-001",
      ratio: "1:1",
      suffix: "icon",
    });
    const stored = await store.readImage(result.storageKey);

    expect(result.storageKey).toBe("product-image-studio/project-001/results/generation-svg/seal_sticker_single-icon-1x1.svg");
    expect(result.contentType).toBe("image/svg+xml");
    expect(stored?.contentType).toBe("image/svg+xml");
    expect(new TextDecoder().decode(stored?.bytes)).toContain("<rect");
  });

  it("preserves SVG content type and extension in download manifest metadata", () => {
    const manifest = buildProductImageStudioDownloadManifest(projectRecord(), [
      {
        cardPose: undefined,
        createdAt: "2026-06-15T00:00:00.000Z",
        generationRequestId: "generation-001",
        height: 800,
        id: "result-svg",
        outputType: "card_single",
        projectId: "project-001",
        ratio: "1:1",
        storageKey: "product-image-studio/project-001/results/generation-001/reference-original.svg",
        width: 800,
      } satisfies ProductImageStudioResultRecord,
    ]);

    expect(manifest.files[0]).toMatchObject({
      contentType: "image/svg+xml",
      fileName: "project-001-card_single-1x1.svg",
      storageKey: "product-image-studio/project-001/results/generation-001/reference-original.svg",
    });
  });
});

function projectRecord(): ProductImageStudioProjectRecord {
  return {
    cardFormat: "postcard_flat",
    createdAt: "2026-06-15T00:00:00.000Z",
    id: "project-001",
    name: "SVG 원본 보존",
    productType: "card_envelope_seal_set",
    productionSettings: manualProductionSettings("postcard_flat"),
    qualityMode: "draft",
    ratios: ["1:1"],
    requestedCardPoses: ["postcard_front_flat"],
    requestedOutputs: ["card_single"],
    updatedAt: "2026-06-15T00:00:00.000Z",
  };
}
