import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { GET as previewAsset } from "@/app/api/product-image-studio/projects/[id]/assets/[assetId]/preview/route";
import { POST as uploadAsset } from "@/app/api/product-image-studio/projects/[id]/assets/route";
import { POST as createProject } from "@/app/api/product-image-studio/projects/route";
import type { CardFormat, ProductImageStudioAssetRole } from "@/features/product-image-studio/domain/types";

describe("product image studio asset upload API", () => {
  let assetRootDirectory = "";

  beforeAll(async () => {
    assetRootDirectory = await mkdtemp(join(tmpdir(), "marketcrew-product-image-studio-assets-"));
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_ASSET_ROOT", assetRootDirectory);
  });

  afterEach(async () => {
    await rm(assetRootDirectory, { force: true, recursive: true });
  });

  afterAll(async () => {
    await rm(assetRootDirectory, { force: true, recursive: true });
    vi.unstubAllEnvs();
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

  it("keeps legacy PNG, JPEG, and WebP uploads accepted", async () => {
    const projectId = await createProjectId("postcard_flat");
    const uploads = [
      { contentType: "image/png", fileName: "postcard-front.png", role: "postcard_front" },
      { contentType: "image/jpeg", fileName: "envelope-front.jpg", role: "envelope_front" },
      { contentType: "image/webp", fileName: "seal.webp", role: "seal_sticker" },
    ] as const satisfies readonly {
      readonly contentType: string;
      readonly fileName: string;
      readonly role: ProductImageStudioAssetRole;
    }[];

    for (const upload of uploads) {
      const response = await uploadAsset(
        uploadRequest(projectId, upload.role, upload.fileName, upload.contentType),
        { params: Promise.resolve({ id: projectId }) },
      );

      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({
        asset: {
          contentType: upload.contentType,
          originalFileName: upload.fileName,
          role: upload.role,
        },
        ok: true,
      });
    }
  });

  it("accepts safe SVG reference uploads and serves them with restrictive preview headers", async () => {
    const projectId = await createProjectId("postcard_flat");
    const uploadResponse = await uploadAsset(
      uploadRequest(
        projectId,
        "reference_mood",
        "safe-reference.svg",
        "image/svg+xml",
        stringBytes('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16"/></svg>'),
      ),
      { params: Promise.resolve({ id: projectId }) },
    );
    const uploadBody: unknown = await uploadResponse.json();

    expect(uploadResponse.status).toBe(201);
    expect(uploadBody).toMatchObject({
      asset: {
        contentType: "image/svg+xml",
        originalFileName: "safe-reference.svg",
        role: "reference_mood",
      },
      ok: true,
    });
    const assetId = readAssetId(uploadBody);
    const previewResponse = await previewAsset(
      new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/assets/${assetId}/preview`),
      { params: Promise.resolve({ assetId, id: projectId }) },
    );

    expect(previewResponse.status).toBe(200);
    expect(previewResponse.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(previewResponse.headers.get("x-content-type-options")).toBe("nosniff");
    expect(previewResponse.headers.get("content-security-policy")).toContain("default-src 'none'");
  });

  it.each([
    ["script tag", '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
    ["foreignObject", '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>HTML</div></foreignObject></svg>'],
    ["event handler", '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'],
    ["external href", '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/a.png"/></svg>'],
    ["remote CSS url", '<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(https://example.com/pattern.svg#x)"/></svg>'],
  ])("rejects unsafe SVG uploads with %s before storage", async (_label, svg) => {
    const projectId = await createProjectId("postcard_flat");
    const response = await uploadAsset(
      uploadRequest(projectId, "reference_mood", "unsafe.svg", "image/svg+xml", stringBytes(svg)),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "UNSAFE_SVG_ASSET" },
      ok: false,
    });
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

function stringBytes(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer;
}

function readAssetId(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "asset" in value &&
    typeof value.asset === "object" &&
    value.asset !== null &&
    "id" in value.asset &&
    typeof value.asset.id === "string"
  ) {
    return value.asset.id;
  }

  throw new Error("asset id missing");
}
