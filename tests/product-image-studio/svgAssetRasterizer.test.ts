import { describe, expect, it } from "vitest";
import { rasterizeSanitizedSvgToPng } from "@/features/product-image-studio/server/svgAssetRasterizer";

const textEncoder = new TextEncoder();

describe("product image studio SVG asset rasterizer", () => {
  it("rasterizes sanitized SVG references to PNG bytes for providers", async () => {
    const result = await rasterizeSanitizedSvgToPng(
      textEncoder.encode('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#111111"/></svg>'),
    );

    expect(result.contentType).toBe("image/png");
    expect([...result.bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });
});
