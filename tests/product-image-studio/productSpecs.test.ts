import { describe, expect, it } from "vitest";

type ProductSpecContracts = typeof import("@/features/product-image-studio/domain/productSpecs");
type ProductSpecParseResult = ReturnType<ProductSpecContracts["parseProductImageStudioProductSpec"]>;
type ProductSpecParseSuccess = Extract<ProductSpecParseResult, { readonly ok: true }>;

async function loadProductSpecContracts(): Promise<ProductSpecContracts> {
  return await import("@/features/product-image-studio/domain/productSpecs");
}

function expectParsedSpec(result: ProductSpecParseResult): ProductSpecParseSuccess {
  if (!result.ok) {
    throw new Error(`Expected product spec to parse, received ${result.error.code}`);
  }
  return result;
}

const malformedProductSpecCases = [
  {
    code: "INVALID_PRODUCT_FAMILY",
    input: {
      family: "calendar",
      id: "spec-unknown",
      name: "알 수 없는 상품",
      sizeMm: { height: 150, width: 100 },
    },
    name: "rejects unknown product families",
  },
  {
    code: "INVALID_SIZE",
    input: {
      family: "postcard",
      id: "spec-negative-postcard",
      name: "음수 엽서",
      sizeMm: { height: 100, width: -1 },
    },
    name: "rejects negative dimensions",
  },
  {
    code: "INVALID_SIZE",
    input: {
      family: "folded_card",
      foldAxis: "vertical",
      foldedSizeMm: { height: 150, width: 0 },
      id: "spec-zero-folded-card",
      name: "0mm 접이식 카드",
      openDirection: "opens_right",
      openSizeMm: { height: 150, width: 200 },
    },
    name: "rejects zero folded-card dimensions",
  },
  {
    code: "INVALID_ENVELOPE_FLAP_SHAPE",
    input: {
      family: "envelope",
      flapPosition: "top",
      flapShape: "pointed",
      id: "spec-envelope-bad-flap",
      name: "잘못된 플랩 봉투",
      sizeMm: { height: 110, width: 160 },
    },
    name: "rejects unknown envelope flap shapes",
  },
] as const;

describe("product image studio product specs", () => {
  it("parses business-card specs with positive real-world dimensions", async () => {
    const contracts = await loadProductSpecContracts();

    const parsed = expectParsedSpec(
      contracts.parseProductImageStudioProductSpec({
        family: "business_card",
        id: "spec-business-90x50",
        name: "명함 90 x 50",
        sizeMm: { height: 50, width: 90 },
      }),
    );

    expect(parsed.spec.family).toBe("business_card");
    if (parsed.spec.family !== "business_card") {
      throw new Error("business card spec expected");
    }
    expect(parsed.spec.sizeMm).toEqual({ height: 50, width: 90 });
    expect(contracts.getProductImageStudioProductFamilyLabel(parsed.spec.family)).toBe("명함");
    expect(contracts.formatProductImageStudioSizeMm(parsed.spec.sizeMm)).toBe("90 x 50mm");
  });

  it("parses envelope specs with flap position and flap shape labels", async () => {
    const contracts = await loadProductSpecContracts();

    const parsed = expectParsedSpec(
      contracts.parseProductImageStudioProductSpec({
        family: "envelope",
        flapPosition: "top",
        flapShape: "jacket",
        id: "spec-envelope-jacket",
        name: "자켓 플랩 봉투",
        sizeMm: { height: 110, width: 160 },
      }),
    );

    expect(parsed.spec.family).toBe("envelope");
    if (parsed.spec.family !== "envelope") {
      throw new Error("envelope spec expected");
    }
    expect(parsed.spec.flapShape).toBe("jacket");
    expect(contracts.getProductImageStudioEnvelopeFlapShapeLabel(parsed.spec.flapShape)).toBe("자켓");
    expect(contracts.getProductImageStudioEnvelopeFlapPositionLabel(parsed.spec.flapPosition)).toBe("상단 플랩");
  });

  it("parses folded-card fold axis and open direction while rejecting impossible open sizes", async () => {
    const contracts = await loadProductSpecContracts();

    const parsed = expectParsedSpec(
      contracts.parseProductImageStudioProductSpec({
        family: "folded_card",
        foldAxis: "vertical",
        foldedSizeMm: { height: 150, width: 100 },
        id: "spec-folded-vertical",
        name: "세로 접힘 카드",
        openDirection: "opens_right",
        openSizeMm: { height: 150, width: 200 },
      }),
    );
    const impossible = contracts.parseProductImageStudioProductSpec({
      family: "folded_card",
      foldAxis: "vertical",
      foldedSizeMm: { height: 150, width: 100 },
      id: "spec-folded-impossible",
      name: "불가능한 접힘 카드",
      openDirection: "opens_right",
      openSizeMm: { height: 151, width: 200 },
    });

    expect(parsed.spec.family).toBe("folded_card");
    if (parsed.spec.family !== "folded_card") {
      throw new Error("folded card spec expected");
    }
    expect(contracts.getProductImageStudioFoldAxisLabel(parsed.spec.foldAxis)).toBe("세로 접힘");
    expect(contracts.getProductImageStudioFoldOpenDirectionLabel(parsed.spec.openDirection)).toBe("오른쪽으로 열림");
    expect(impossible).toMatchObject({
      error: { code: "INVALID_FOLDED_CARD_GEOMETRY" },
      ok: false,
    });
  });

  it.each(malformedProductSpecCases)("$name", async ({ code, input }) => {
    const contracts = await loadProductSpecContracts();

    const parsed = contracts.parseProductImageStudioProductSpec(input);

    expect(parsed).toMatchObject({
      error: { code },
      ok: false,
    });
  });
});
