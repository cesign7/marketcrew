import { describe, expect, it } from "vitest";
import { createBlobProductImageFileStore } from "@/features/product-image-studio/server/blobFileStore";

describe("product image studio blob file store", () => {
  it("stores generated image sequences under distinct Vercel Blob paths", async () => {
    const putCalls: Array<{ readonly contentType: string | undefined; readonly pathname: string }> = [];
    const store = createBlobProductImageFileStore({
      getBlob: async (pathname) => ({
        bytes: Buffer.from(pathname),
        contentType: "image/png",
      }),
      maxBytes: 1024,
      putBlob: async (pathname, _body, options) => {
        putCalls.push({ contentType: options.contentType, pathname });
        return {
          contentType: options.contentType ?? "image/png",
          pathname,
          url: `https://blob.vercel.test/${pathname}`,
        };
      },
      token: "blob-token-test",
    });

    const first = await store.saveGeneratedImage({
      bytes: Buffer.from("first"),
      contentType: "image/png",
      generationRequestId: "generation-001",
      outputType: "card_single",
      projectId: "project-001",
      ratio: "1:1",
      sequence: 1,
    });
    const second = await store.saveGeneratedImage({
      bytes: Buffer.from("second"),
      contentType: "image/png",
      generationRequestId: "generation-001",
      outputType: "card_single",
      projectId: "project-001",
      ratio: "1:1",
      sequence: 2,
    });

    expect(putCalls.map((call) => call.pathname)).toEqual([
      "product-image-studio/project-001/results/generation-001/card_single-1-1x1.png",
      "product-image-studio/project-001/results/generation-001/card_single-2-1x1.png",
    ]);
    expect(first.storageKey).toBe("product-image-studio/project-001/results/generation-001/card_single-1-1x1.png");
    expect(second.storageKey).toBe("product-image-studio/project-001/results/generation-001/card_single-2-1x1.png");
  });
});
