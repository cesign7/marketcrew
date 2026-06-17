import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { GET as downloadVectorSvg } from "@/app/api/product-image-studio/projects/[id]/results/[resultId]/vector.svg/route";
import { convertPngToProductImageStudioVectorSvg } from "@/features/product-image-studio/server/pngToVectorSvg";
import { createProductImageStudioVectorSvg } from "@/features/product-image-studio/server/vectorSvg";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";
import { manualProductionSettings } from "./manualProductionSettings";

describe("product image studio vector SVG export", () => {
  it("creates a real vector SVG without embedding the raster image", () => {
    const result = createProductImageStudioVectorSvg({
      fileName: "sample-result.png",
      outputType: "card_single",
      ratio: "1:1",
      style: "character",
      title: "둥근 파란 캐릭터 스티커",
    });

    if (result.ok === false) {
      throw new Error(result.error.message);
    }

    const svg = new TextDecoder().decode(result.bytes);
    expect(result.contentType).toBe("image/svg+xml");
    expect(result.fileName).toBe("sample-result-character.svg");
    expect(svg).toContain("<svg");
    expect(svg).toMatch(/<(path|circle|rect)\b/);
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("base64");
  });

  it("derives deterministic and distinct vector SVGs from uploaded PNG fixture bytes", async () => {
    const sealBytes = new Uint8Array(await readFile(".omo/fixtures/seal-sticker.png"));
    const cardBytes = new Uint8Array(await readFile(".omo/fixtures/card-front.png"));

    const seal = await convertPngToProductImageStudioVectorSvg({
      bytes: sealBytes,
      fileName: "seal-sticker.png",
      style: "icon",
      title: "봉합 스티커",
    });
    const card = await convertPngToProductImageStudioVectorSvg({
      bytes: cardBytes,
      fileName: "card-front.png",
      style: "icon",
      title: "카드 앞면",
    });
    const sealRepeat = await convertPngToProductImageStudioVectorSvg({
      bytes: sealBytes,
      fileName: "seal-sticker.png",
      style: "icon",
      title: "봉합 스티커",
    });

    if (seal.ok === false || card.ok === false || sealRepeat.ok === false) {
      throw new Error("PNG fixture conversion should succeed");
    }

    const sealSvg = new TextDecoder().decode(seal.bytes);
    const cardSvg = new TextDecoder().decode(card.bytes);
    expect(seal.contentType).toBe("image/svg+xml");
    expect(seal.fileName).toBe("seal-sticker-icon.svg");
    expect(sealSvg).toMatch(/<(path|circle|rect|polygon|line)\b/);
    expect(sealSvg).not.toMatch(/<image|data:image|base64|foreignObject/i);
    expect(cardSvg).not.toMatch(/<image|data:image|base64|foreignObject/i);
    expect(cardSvg).not.toBe(sealSvg);
    expect(hashSvg(sealRepeat.bytes)).toBe(hashSvg(seal.bytes));
  });

  it("returns a downloadable vector SVG from the result route", async () => {
    const repository = getProductImageStudioProjectRepository();
    const project = await repository.createProject({
      cardFormat: "postcard_flat",
      name: "AI 이미지 생성기 - 캐릭터 스티커",
      productType: "card_envelope_seal_set",
      productionSettings: manualProductionSettings("postcard_flat"),
      qualityMode: "draft",
      ratios: ["1:1"],
      requestedCardPoses: ["postcard_front_flat"],
      requestedOutputs: ["card_single"],
    });
    const generation = await repository.createGenerationRequest({
      conceptId: "prompt-image-generator",
      projectId: project.id,
      providerRequestSummary: {
        model: "fake-product-image-studio",
        promptPreview: "귀여운 파란 캐릭터 스티커",
        provider: "fake",
        workflow: "image_generator",
      },
      qualityMode: "draft",
      requestedCardPoses: ["postcard_front_flat"],
      requestedOutputs: ["card_single"],
    });
    const result = await repository.addResult({
      cardPose: "postcard_front_flat",
      generationRequestId: generation.id,
      height: 1200,
      outputType: "card_single",
      projectId: project.id,
      ratio: "1:1",
      storageKey: `product-image-studio/${project.id}/results/${generation.id}/character.png`,
      width: 1200,
    });

    const response = await downloadVectorSvg(
      new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${project.id}/results/${result.id}/vector.svg?style=character`),
      { params: Promise.resolve({ id: project.id, resultId: result.id }) },
    );
    const svg = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(response.headers.get("content-disposition")).toContain(".svg");
    expect(svg).toContain("<svg");
    expect(svg).toContain("<title");
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("base64");
  });
});

function hashSvg(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
