import { describe, expect, it } from "vitest";

type UploadClassificationContracts = typeof import("@/features/product-image-studio/domain/uploadClassification");
type UploadClassificationParseResult = ReturnType<
  UploadClassificationContracts["parseProductImageStudioUploadClassification"]
>;
type UploadClassificationParseSuccess = Extract<UploadClassificationParseResult, { readonly ok: true }>;

async function loadUploadClassificationContracts(): Promise<UploadClassificationContracts> {
  return await import("@/features/product-image-studio/domain/uploadClassification");
}

function expectParsedClassification(result: UploadClassificationParseResult): UploadClassificationParseSuccess {
  if (!result.ok) {
    throw new Error(`Expected upload classification to parse, received ${result.error.code}`);
  }
  return result;
}

const malformedClassificationCases = [
  {
    code: "INVALID_PRODUCT_FAMILY",
    input: {
      assetKind: "product_surface",
      productFamily: "calendar",
      productSpecId: "spec-calendar",
      surface: "front",
    },
    name: "rejects unknown classification families",
  },
  {
    code: "INVALID_UPLOAD_SURFACE",
    input: {
      assetKind: "product_surface",
      productFamily: "business_card",
      productSpecId: "spec-business-90x50",
      surface: "lid",
    },
    name: "rejects unknown upload surfaces",
  },
  {
    code: "PRODUCT_SPEC_ID_REQUIRED",
    input: {
      assetKind: "product_surface",
      productFamily: "postcard",
      surface: "front",
    },
    name: "rejects missing product spec ids where classification requires a spec",
  },
  {
    code: "INVALID_GENERATION_ROLE",
    input: {
      assetKind: "product_surface",
      generationRole: "business_card_front",
      productFamily: "business_card",
      productSpecId: "spec-business-90x50",
      surface: "front",
    },
    name: "rejects unknown generation roles without adding raw upload roles",
  },
] as const;

describe("product image studio upload classification", () => {
  it("parses raw upload classification separately from generation asset roles", async () => {
    const contracts = await loadUploadClassificationContracts();

    const parsed = expectParsedClassification(
      contracts.parseProductImageStudioUploadClassification({
        assetKind: "product_surface",
        productFamily: "business_card",
        productSpecId: "spec-business-90x50",
        surface: "back",
      }),
    );

    expect(parsed.classification).toEqual({
      assetKind: "product_surface",
      productFamily: "business_card",
      productSpecId: "spec-business-90x50",
      surface: "back",
    });
    expect(contracts.PRODUCT_IMAGE_STUDIO_UPLOAD_ASSET_KINDS).not.toContain("business_card_back");
  });

  it("keeps optional generationRole constrained to existing generation/project asset roles", async () => {
    const contracts = await loadUploadClassificationContracts();

    const parsed = expectParsedClassification(
      contracts.parseProductImageStudioUploadClassification({
        assetKind: "product_surface",
        generationRole: "envelope_inside_flap",
        productFamily: "envelope",
        productSpecId: "spec-envelope-jacket",
        surface: "flap",
      }),
    );

    expect(parsed.classification.generationRole).toBe("envelope_inside_flap");
    expect(contracts.getProductImageStudioUploadClassificationLabel(parsed.classification)).toBe("봉투 플랩");
  });

  it("maps classification values to natural Korean labels", async () => {
    const contracts = await loadUploadClassificationContracts();

    const businessCardBack = expectParsedClassification(
      contracts.parseProductImageStudioUploadClassification({
        assetKind: "product_surface",
        productFamily: "business_card",
        productSpecId: "spec-business-90x50",
        surface: "back",
      }),
    );
    const foldedInside = expectParsedClassification(
      contracts.parseProductImageStudioUploadClassification({
        assetKind: "product_surface",
        productFamily: "folded_card",
        productSpecId: "spec-folded-vertical",
        surface: "inside_spread",
      }),
    );
    const envelopeDieline = expectParsedClassification(
      contracts.parseProductImageStudioUploadClassification({
        assetKind: "dieline",
        productFamily: "envelope",
        productSpecId: "spec-envelope-jacket",
        surface: "dieline",
      }),
    );

    expect(contracts.getProductImageStudioUploadClassificationLabel(businessCardBack.classification)).toBe("명함 뒷면");
    expect(contracts.getProductImageStudioUploadClassificationLabel(foldedInside.classification)).toBe(
      "접이식 카드 안쪽/펼침면",
    );
    expect(contracts.getProductImageStudioUploadClassificationLabel(envelopeDieline.classification)).toBe(
      "봉투 칼선/전개도",
    );
  });

  it.each(malformedClassificationCases)("$name", async ({ code, input }) => {
    const contracts = await loadUploadClassificationContracts();

    const parsed = contracts.parseProductImageStudioUploadClassification(input);

    expect(parsed).toMatchObject({
      error: { code },
      ok: false,
    });
  });
});
