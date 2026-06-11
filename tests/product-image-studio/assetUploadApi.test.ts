import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { POST as uploadAsset } from "@/app/api/product-image-studio/projects/[id]/assets/route";
import { POST as createProject } from "@/app/api/product-image-studio/projects/route";
import type { CardFormat, ProductImageStudioAssetRole } from "@/features/product-image-studio/domain/types";

describe("product image studio asset upload API", () => {
  afterEach(async () => {
    await rm(join(process.cwd(), ".marketcrew", "product-image-studio-assets"), { force: true, recursive: true });
    await rm(join(tmpdir(), "marketcrew-product-image-studio-assets"), { force: true, recursive: true });
  });

  it("accepts every required folded-card asset role", async () => {
    const projectId = await createProjectId("folded_card");
    const requiredRoles = [
      "folded_card_outer_front",
      "folded_card_fold_metadata",
      "envelope_front",
      "seal_sticker",
    ] as const satisfies readonly ProductImageStudioAssetRole[];

    for (const role of requiredRoles) {
      const response = await uploadAsset(uploadRequest(projectId, role, "card-front.png", "image/png"), {
        params: Promise.resolve({ id: projectId }),
      });
      const body: unknown = await response.json();

      expect(response.status).toBe(201);
      expect(body).toMatchObject({
        asset: {
          previewUrl: expect.stringContaining(`/studio-assets/${projectId}/${role}/`),
          role,
        },
        ok: true,
      });
      expect(JSON.stringify(body)).not.toContain("..");
    }
  });

  it("accepts postcard required and optional roles", async () => {
    const projectId = await createProjectId("postcard_flat");
    const roles = [
      "postcard_front",
      "envelope_front",
      "seal_sticker",
      "postcard_back",
      "envelope_inside_flap",
      "reference_mood",
    ] as const satisfies readonly ProductImageStudioAssetRole[];

    for (const role of roles) {
      const response = await uploadAsset(uploadRequest(projectId, role, "postcard-front.webp", "image/webp"), {
        params: Promise.resolve({ id: projectId }),
      });

      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({ asset: { role }, ok: true });
    }
  });

  it("rejects malformed multipart requests", async () => {
    const projectId = await createProjectId("postcard_flat");
    const response = await uploadAsset(
      new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/assets`, {
        body: "not multipart",
        headers: { "content-type": "multipart/form-data; boundary=broken" },
        method: "POST",
      }),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "MALFORMED_MULTIPART" }, ok: false });
  });

  it("rejects oversized files and unsupported MIME types", async () => {
    const projectId = await createProjectId("postcard_flat");
    const oversizedResponse = await uploadAsset(
      uploadRequest(projectId, "postcard_front", "large.png", "image/png", new ArrayBuffer(20 * 1024 * 1024 + 1)),
      { params: Promise.resolve({ id: projectId }) },
    );
    const unsupportedMimeResponse = await uploadAsset(
      uploadRequest(projectId, "postcard_front", "card.txt", "text/plain"),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(oversizedResponse.status).toBe(400);
    expect(await oversizedResponse.json()).toMatchObject({ error: { code: "IMAGE_TOO_LARGE" }, ok: false });
    expect(unsupportedMimeResponse.status).toBe(400);
    expect(await unsupportedMimeResponse.json()).toMatchObject({
      error: { code: "UNSUPPORTED_IMAGE_TYPE" },
      ok: false,
    });
  });

  it("rejects folded-card-only roles for postcard projects", async () => {
    const projectId = await createProjectId("postcard_flat");

    for (const role of ["folded_card_inner_spread", "folded_card_fold_metadata"] as const) {
      const response = await uploadAsset(uploadRequest(projectId, role, "inside.png", "image/png"), {
        params: Promise.resolve({ id: projectId }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: "ASSET_ROLE_NOT_ALLOWED" }, ok: false });
    }
  });
});

async function createProjectId(cardFormat: CardFormat): Promise<string> {
  const response = await createProject(
    jsonRequest({
      cardFormat,
      name: cardFormat === "folded_card" ? "접이식 카드 세트" : "엽서 세트",
      productType: "card_envelope_seal_set",
      qualityMode: "draft",
      ratios: ["1:1"],
      requestedCardPoses: cardFormat === "folded_card" ? ["folded_closed"] : ["postcard_front_flat"],
      requestedOutputs: ["set_combined", "card_single", "envelope_single", "seal_sticker_single"],
    }),
  );
  const body: unknown = await response.json();
  if (typeof body === "object" && body !== null && "id" in body && typeof body.id === "string") {
    return body.id;
  }

  throw new Error("project id missing");
}

function jsonRequest(body: Record<string, unknown>): Request {
  return new Request("http://127.0.0.1:3000/api/product-image-studio/projects", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

function uploadRequest(
  projectId: string,
  role: ProductImageStudioAssetRole,
  fileName: string,
  contentType: string,
  bytes: ArrayBuffer = new ArrayBuffer(4),
): Request {
  const formData = new FormData();
  formData.set("role", role);
  formData.set("file", new File([bytes], fileName, { type: contentType }));

  return new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/assets`, {
    body: formData,
    method: "POST",
  });
}
