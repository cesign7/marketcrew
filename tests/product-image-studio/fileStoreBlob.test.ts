import { describe, expect, it } from "vitest";
import { createBlobProductImageFileStore } from "@/features/product-image-studio/server/blobFileStore";

describe("product image studio blob file store", () => {
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
});
