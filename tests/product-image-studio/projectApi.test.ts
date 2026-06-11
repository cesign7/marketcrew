import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/product-image-studio/projects/[id]/route";
import { POST } from "@/app/api/product-image-studio/projects/route";

describe("product image studio project API", () => {
  it("creates and reads a folded-card project without SmartStore id", async () => {
    const createResponse = await POST(
      jsonRequest({
        cardFormat: "folded_card",
        name: "봄 초대장 세트",
        productType: "card_envelope_seal_set",
        qualityMode: "draft",
        ratios: ["1:1", "4:5"],
        requestedCardPoses: ["folded_closed", "folded_open_spread", "folded_standing"],
        requestedOutputs: ["set_combined", "card_single", "envelope_single", "seal_sticker_single"],
      }),
    );
    const createBody: unknown = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createBody).toMatchObject({
      ok: true,
      project: {
        cardFormat: "folded_card",
        name: "봄 초대장 세트",
        productType: "card_envelope_seal_set",
        requestedOutputs: ["set_combined", "card_single", "envelope_single", "seal_sticker_single"],
      },
    });
    expect(JSON.stringify(createBody)).not.toContain("smartstore");

    const projectId = readCreatedId(createBody);
    const readResponse = await GET(new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}`), {
      params: Promise.resolve({ id: projectId }),
    });
    const readBody: unknown = await readResponse.json();

    expect(readResponse.status).toBe(200);
    expect(readBody).toMatchObject({ ok: true, project: { id: projectId, cardFormat: "folded_card" } });
  });

  it("rejects missing project names and non-card-set product types", async () => {
    const missingName = await POST(
      jsonRequest({
        cardFormat: "folded_card",
        name: "",
        productType: "card_envelope_seal_set",
        qualityMode: "draft",
        ratios: ["1:1"],
        requestedCardPoses: ["folded_closed"],
        requestedOutputs: ["set_combined"],
      }),
    );
    const wrongProductType = await POST(
      jsonRequest({
        cardFormat: "folded_card",
        name: "봄 초대장 세트",
        productType: "banner",
        qualityMode: "draft",
        ratios: ["1:1"],
        requestedCardPoses: ["folded_closed"],
        requestedOutputs: ["set_combined"],
      }),
    );

    expect(missingName.status).toBe(400);
    expect(wrongProductType.status).toBe(400);
  });

  it("validates postcard payloads separately from folded-card payloads", async () => {
    const postcardResponse = await POST(
      jsonRequest({
        cardFormat: "postcard_flat",
        name: "엽서 세트",
        productType: "card_envelope_seal_set",
        qualityMode: "draft",
        ratios: ["1:1"],
        requestedCardPoses: ["postcard_front_flat"],
        requestedOutputs: ["set_combined", "card_single", "envelope_single", "seal_sticker_single"],
      }),
    );
    const invalidPostcardPose = await POST(
      jsonRequest({
        cardFormat: "postcard_flat",
        name: "엽서 세트",
        productType: "card_envelope_seal_set",
        qualityMode: "draft",
        ratios: ["1:1"],
        requestedCardPoses: ["folded_closed"],
        requestedOutputs: ["set_combined"],
      }),
    );

    expect(postcardResponse.status).toBe(201);
    expect(await postcardResponse.json()).toMatchObject({ project: { cardFormat: "postcard_flat" } });
    expect(invalidPostcardPose.status).toBe(400);
  });
});

function jsonRequest(body: Record<string, unknown>): Request {
  return new Request("http://127.0.0.1:3000/api/product-image-studio/projects", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

function readCreatedId(value: unknown): string {
  if (typeof value === "object" && value !== null && "id" in value && typeof value.id === "string") {
    return value.id;
  }

  throw new Error("created project id missing");
}
