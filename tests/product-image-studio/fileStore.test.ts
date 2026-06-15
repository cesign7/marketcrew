import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRODUCT_IMAGE_STUDIO_ALLOWED_IMAGE_MIME_TYPES,
  createLocalProductImageFileStore,
  createProductImageStudioFixtureImages,
} from "@/features/product-image-studio/server/fileStore";

describe("product image studio local file store", () => {
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

    expect(PRODUCT_IMAGE_STUDIO_ALLOWED_IMAGE_MIME_TYPES).toEqual(
      expect.arrayContaining(["image/png", "image/jpeg", "image/webp"]),
    );
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

  it("keeps legacy PNG, JPEG, and WebP uploads accepted before SVG support is added", async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), "marketcrew-studio-raster-uploads-"));
    const store = createLocalProductImageFileStore({
      createId: nextId(["asset-png", "asset-jpeg", "asset-webp"]),
      maxBytes: 1024,
      publicBasePath: "/studio-assets",
      rootDirectory,
    });
    const uploads = [
      { contentType: "image/png", expectedKey: "asset-png.png", fileName: "front.png" },
      { contentType: "image/jpeg", expectedKey: "asset-jpeg.jpg", fileName: "front.jpg" },
      { contentType: "image/webp", expectedKey: "asset-webp.webp", fileName: "front.webp" },
    ] as const;

    for (const upload of uploads) {
      const result = await store.saveImage({
        bytes: Buffer.from(upload.contentType),
        contentType: upload.contentType,
        originalFileName: upload.fileName,
        projectId: "project-001",
        role: "postcard_front",
      });

      expect(result.storageKey).toBe(`product-image-studio/project-001/postcard_front/${upload.expectedKey}`);
      expect(result.contentType).toBe(upload.contentType);
    }
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

function nextId(ids: readonly string[]): () => string {
  let index = 0;
  return () => {
    const id = ids[index];
    index += 1;
    return id ?? "fallback-id";
  };
}
