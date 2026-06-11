import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/product-image-studio/concepts/route";
import { PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES } from "@/features/product-image-studio/domain/types";
import { listCardSetConceptRecommendations } from "@/features/product-image-studio/domain/concepts";

describe("product image studio concept recommendations", () => {
  it("returns six Korean card-set concepts with four output prompt specs each", () => {
    const concepts = listCardSetConceptRecommendations();

    expect(concepts.map((concept) => concept.id)).toEqual([
      "tabletop-set",
      "premium-stationery",
      "seasonal-gift",
      "wedding-announcement",
      "minimal-studio",
      "cozy-lifestyle",
    ]);
    for (const concept of concepts) {
      expect(concept.label).toMatch(/[가-힣]/);
      expect(concept.summary).toMatch(/[가-힣]/);
      expect(concept.outputPrompts.map((prompt) => prompt.outputType)).toEqual(PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES);
    }
    expect(JSON.stringify(concepts).toLowerCase()).not.toContain("banner");
    expect(JSON.stringify(concepts)).not.toContain("배너");
  });

  it("includes folded-card and postcard pose variants in scene prompt specs", () => {
    const concepts = listCardSetConceptRecommendations();

    for (const concept of concepts) {
      const setCombinedPrompt = concept.outputPrompts.find((prompt) => prompt.outputType === "set_combined");

      expect(setCombinedPrompt?.posePrompts.map((prompt) => prompt.pose)).toEqual(
        expect.arrayContaining([
          "folded_closed",
          "folded_open_spread",
          "folded_standing",
          "postcard_front_flat",
          "postcard_back_flat",
          "postcard_lifestyle_stack",
        ]),
      );
      expect(setCombinedPrompt?.posePrompts.find((prompt) => prompt.pose === "folded_open_spread")?.prompt).toContain(
        "접힌 축",
      );
      expect(setCombinedPrompt?.posePrompts.find((prompt) => prompt.pose === "postcard_front_flat")?.prompt).toContain(
        "접힘 없는",
      );
    }
  });

  it("serves concepts through the local API route", async () => {
    const response = await GET(
      new Request("http://127.0.0.1:3000/api/product-image-studio/concepts?productType=card_envelope_seal_set"),
    );
    const body = await readConceptResponse(response);

    expect(response.status).toBe(200);
    expect(body.concepts).toHaveLength(6);
    for (const concept of body.concepts) {
      expect(concept.outputPrompts.map((prompt) => prompt.outputType)).toEqual(PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES);
    }
  });
});

async function readConceptResponse(response: Response): Promise<{
  readonly concepts: readonly {
    readonly outputPrompts: readonly {
      readonly outputType: string;
    }[];
  }[];
}> {
  const body: unknown = await response.json();
  if (
    typeof body === "object" &&
    body !== null &&
    "data" in body &&
    typeof body.data === "object" &&
    body.data !== null &&
    "concepts" in body.data &&
    Array.isArray(body.data.concepts)
  ) {
    return {
      concepts: body.data.concepts.map((concept) => {
        if (typeof concept === "object" && concept !== null && "outputPrompts" in concept && Array.isArray(concept.outputPrompts)) {
          return { outputPrompts: concept.outputPrompts };
        }
        return { outputPrompts: [] };
      }),
    };
  }

  throw new Error("concept response missing");
}
