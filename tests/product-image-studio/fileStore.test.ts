import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createBlobProductImageFileStore } from "@/features/product-image-studio/server/blobFileStore";
import {
  PRODUCT_IMAGE_STUDIO_ALLOWED_IMAGE_MIME_TYPES,
  createLocalProductImageFileStore,
  createProductImageStudioFixtureImages,
} from "@/features/product-image-studio/server/fileStore";

describe("product image studio file store", () => {
  it("stores allowed image uploads under generated safe paths", async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), "marketcrew-studio-files-"));
    const store = createLocalProductImageFileStore({
      createId: () => "asset-001",
      maxBytes: 1024,
      publicBasePath: "/studio-assets",
      rootDirectory,
    });

    const result = await store.saveImage({
      bytes: Buffer.from("png bytes"),
      contentType: "image/png",
      originalFileName: "../secret-card-front.png",
      projectId: "project-001",
      role: "folded_card_outer_front",
    });

    expect(PRODUCT_IMAGE_STUDIO_ALLOWED_IMAGE_MIME_TYPES).toEqual(["image/png", "image/jpeg", "image/webp"]);
    expect(result.byteSize).toBe(9);
    expect(result.contentType).toBe("image/png");
    expect(result.storageKey).toBe("product-image-studio/project-001/folded_card_outer_front/asset-001.png");
    expect(result.previewUrl).toBe("/studio-assets/project-001/folded_card_outer_front/asset-001.png");
    if (!result.absolutePath) {
      throw new Error("local absolute path missing");
    }
    expect(result.absolutePath).toBe(join(rootDirectory, "project-001", "folded_card_outer_front", "asset-001.png"));
    expect(result.originalFileName).toBe("secret-card-front.png");
    expect(await readFile(result.absolutePath, "utf8")).toBe("png bytes");

    const stored = await store.readImage(result.storageKey);
    expect(stored).toMatchObject({ contentType: "image/png" });
    expect(new TextDecoder().decode(stored?.bytes)).toBe("png bytes");
  });

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

  it("stores uploads in Vercel Blob when a blob token is configured", async () => {
    const putCalls: Array<{ readonly pathname: string; readonly contentType: string | undefined }> = [];
    const store = createBlobProductImageFileStore({
      createId: () => "asset-001",
      getBlob: async () => ({
        bytes: Buffer.from("blob bytes"),
        contentType: "image/png",
      }),
      maxBytes: 1024,
      putBlob: async (pathname, _body, options) => {
        putCalls.push({ contentType: options.contentType, pathname });
        return {
          contentDisposition: "inline",
          contentType: options.contentType ?? "image/png",
          downloadUrl: `https://blob.vercel.test/${pathname}?download=1`,
          etag: "etag-test",
          pathname,
          url: `https://blob.vercel.test/${pathname}`,
        };
      },
      token: "blob-token-test",
    });

    const result = await store.saveImage({
      bytes: Buffer.from("blob bytes"),
      contentType: "image/png",
      originalFileName: "card front.png",
      projectId: "project-001",
      role: "folded_card_outer_front",
    });
    const stored = await store.readImage(result.storageKey);

    expect(putCalls).toEqual([
      {
        contentType: "image/png",
        pathname: "product-image-studio/project-001/folded_card_outer_front/asset-001.png",
      },
    ]);
    expect(result.previewUrl).toBe("https://blob.vercel.test/product-image-studio/project-001/folded_card_outer_front/asset-001.png");
    expect(result.storageKey).toBe("product-image-studio/project-001/folded_card_outer_front/asset-001.png");
    expect(new TextDecoder().decode(stored?.bytes)).toBe("blob bytes");
  });

  it("rejects unsupported MIME types and oversized images before writing", async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), "marketcrew-studio-files-"));
    const store = createLocalProductImageFileStore({
      maxBytes: 4,
      publicBasePath: "/studio-assets",
      rootDirectory,
    });

    await expect(
      store.saveImage({
        bytes: Buffer.from("plain"),
        contentType: "text/plain",
        originalFileName: "card.txt",
        projectId: "project-001",
        role: "postcard_front",
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_IMAGE_TYPE" });
    await expect(
      store.saveImage({
        bytes: Buffer.from("too large"),
        contentType: "image/png",
        originalFileName: "card.png",
        projectId: "project-001",
        role: "postcard_front",
      }),
    ).rejects.toMatchObject({ code: "IMAGE_TOO_LARGE" });
  });

  it("creates QA fixture images outside src and public", async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), "marketcrew-studio-fixtures-"));
    const fixtures = await createProductImageStudioFixtureImages(rootDirectory);

    expect(fixtures.map((fixture) => fixture.fileName)).toEqual([
      "card-front.png",
      "envelope-front.png",
      "seal-sticker.png",
    ]);
    for (const fixture of fixtures) {
      expect(fixture.absolutePath).toContain(rootDirectory);
      expect(fixture.absolutePath).not.toContain("/src/");
      expect(fixture.absolutePath).not.toContain("/public/");
      expect((await readFile(fixture.absolutePath)).byteLength).toBeGreaterThan(0);
    }
  });
});
