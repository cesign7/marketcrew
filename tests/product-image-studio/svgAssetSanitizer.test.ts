import { describe, expect, it } from "vitest";
import { sanitizeProductImageStudioSvgAsset } from "@/features/product-image-studio/server/svgAssetSanitizer";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

describe("product image studio SVG asset sanitizer", () => {
  it("accepts a self-contained SVG asset as sanitized UTF-8 bytes", () => {
    const result = sanitizeProductImageStudioSvgAsset(
      textEncoder.encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#111111"/></svg>'),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("safe SVG was rejected");
    }
    expect(result.contentType).toBe("image/svg+xml");
    expect(textDecoder.decode(result.bytes)).toContain("<svg");
  });

  it.each([
    ["script tag", '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
    ["foreignObject", '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>HTML</div></foreignObject></svg>'],
    ["event handler", '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'],
    ["external href", '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/a.png"/></svg>'],
    ["external xlink href", '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="http://example.com/icon.svg#x"/></svg>'],
    ["remote CSS url", '<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(https://example.com/pattern.svg#x)"/></svg>'],
    ["javascript href", '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)">x</a></svg>'],
    ["data HTML href", '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:text/html;base64,PHNjcmlwdD5hPC9zY3JpcHQ+"/></svg>'],
    ["executable namespace", '<svg xmlns="http://www.w3.org/2000/svg" xmlns:html="http://www.w3.org/1999/xhtml"><html:script>alert(1)</html:script></svg>'],
  ])("rejects unsafe SVG payloads with %s before storage", (_label, svg) => {
    const result = sanitizeProductImageStudioSvgAsset(textEncoder.encode(svg));

    expect(result).toMatchObject({
      error: { code: "UNSAFE_SVG_ASSET" },
      ok: false,
    });
  });

  it("rejects namespaced SVG script elements before storage", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><svg:script>alert(1)</svg:script></svg>';

    const result = sanitizeProductImageStudioSvgAsset(textEncoder.encode(svg));

    expect(result).toMatchObject({
      error: { code: "UNSAFE_SVG_ASSET" },
      ok: false,
    });
  });
});
