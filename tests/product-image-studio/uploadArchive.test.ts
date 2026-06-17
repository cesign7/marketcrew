import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GET as previewAsset } from "@/app/api/product-image-studio/projects/[id]/assets/[assetId]/preview/route";
import { POST as uploadAsset } from "@/app/api/product-image-studio/projects/[id]/assets/route";
import { POST as createProject } from "@/app/api/product-image-studio/projects/route";
import { ProductImageStudioUploadsWorkspacePage } from "@/components/product-image-studio/ProductImageStudioUploadLibrary";
import { createInMemoryProductImageStudioRepository } from "@/lib/persistence/productImageStudioRepository";
import { listProductImageStudioUploadArchiveItems } from "@/features/product-image-studio/server/uploadArchive";
import type { ProductImageStudioUploadArchiveItem } from "@/features/product-image-studio/server/uploadArchive";
import { manualProductionSettings } from "./manualProductionSettings";

describe("product image studio upload archive", () => {
  it("lists uploaded assets with preview and reuse links", async () => {
    // Given: two uploaded source assets exist across projects.
    const repository = createInMemoryProductImageStudioRepository({
      createId: nextId(["project-1", "asset-1", "asset-2"]),
      now: nextNow([
        "2026-06-14T00:00:00.000Z",
        "2026-06-14T00:01:00.000Z",
        "2026-06-14T00:02:00.000Z",
      ]),
    });
    const project = await repository.createProject({
      cardFormat: "folded_card",
      name: "봄 초대장 세트",
      productType: "card_envelope_seal_set",
      productionSettings: manualProductionSettings("folded_card"),
      qualityMode: "draft",
      ratios: ["1:1"],
      requestedCardPoses: ["folded_closed"],
      requestedOutputs: ["set_combined"],
    });
    await repository.addAsset({
      byteSize: 1500,
      contentType: "image/png",
      originalFileName: "card-front.png",
      projectId: project.id,
      role: "folded_card_outer_front",
      storageKey: "product-image-studio/project-1/folded_card_outer_front/asset-1.png",
    });
    await repository.addAsset({
      byteSize: 800,
      contentType: "image/png",
      originalFileName: "seal.png",
      projectId: project.id,
      role: "seal_sticker",
      storageKey: "product-image-studio/project-1/seal_sticker/asset-2.png",
    });

    // When: the upload archive is read for the workspace.
    const uploads = await listProductImageStudioUploadArchiveItems(repository);

    // Then: latest uploads appear first with routes that can feed designs and templates.
    expect(uploads).toEqual([
      expect.objectContaining({
        assetId: "asset-2",
        originalFileName: "seal.png",
        previewUrl: "/api/product-image-studio/projects/project-1/assets/asset-2/preview",
        role: "seal_sticker",
        svgConversionUrl: "/product-image-studio/ai-tools?tool=svg-conversion&upload=asset-2",
        templateUseUrl: "/product-image-studio/templates?upload=asset-2",
      }),
      expect.objectContaining({
        assetId: "asset-1",
        designUseUrl: "/product-image-studio/designs?upload=asset-1",
        projectName: "봄 초대장 세트",
      }),
    ]);
  });

  it("lists generator reference_mood uploads with SVG metadata and reuse links", async () => {
    // Given: an image-generator project saved PNG and SVG reference files after generation.
    const repository = createInMemoryProductImageStudioRepository({
      createId: nextId(["project-ai", "asset-png", "asset-svg"]),
      now: nextNow([
        "2026-06-14T01:00:00.000Z",
        "2026-06-14T01:01:00.000Z",
        "2026-06-14T01:02:00.000Z",
      ]),
    });
    const project = await repository.createProject({
      cardFormat: "postcard_flat",
      name: "AI 이미지 생성기 - 차분한 문구",
      productType: "card_envelope_seal_set",
      productionSettings: manualProductionSettings("postcard_flat"),
      qualityMode: "draft",
      ratios: ["1:1"],
      requestedCardPoses: ["postcard_front_flat"],
      requestedOutputs: ["card_single"],
    });
    await repository.addAsset({
      byteSize: 1200,
      contentType: "image/png",
      originalFileName: "reference.png",
      projectId: project.id,
      role: "reference_mood",
      storageKey: "product-image-studio/project-ai/reference_mood/asset-png.png",
    });
    await repository.addAsset({
      byteSize: 300,
      contentType: "image/svg+xml",
      originalFileName: "safe-reference.svg",
      projectId: project.id,
      role: "reference_mood",
      storageKey: "product-image-studio/project-ai/reference_mood/asset-svg.svg",
    });

    // When: the upload archive is read for the uploads page.
    const uploads = await listProductImageStudioUploadArchiveItems(repository);

    // Then: generator references are reusable stored assets with safe preview routes.
    expect(uploads).toEqual([
      expect.objectContaining({
        assetId: "asset-svg",
        contentType: "image/svg+xml",
        designUseUrl: "/product-image-studio/designs?upload=asset-svg",
        originalFileName: "safe-reference.svg",
        previewUrl: "/api/product-image-studio/projects/project-ai/assets/asset-svg/preview",
        projectName: "AI 이미지 생성기 - 차분한 문구",
        role: "reference_mood",
        svgConversionUrl: "/product-image-studio/ai-tools?tool=svg-conversion&upload=asset-svg",
        templateUseUrl: "/product-image-studio/templates?upload=asset-svg",
      }),
      expect.objectContaining({
        assetId: "asset-png",
        contentType: "image/png",
        role: "reference_mood",
      }),
    ]);
  });

  it("renders uploads with reusable asset metadata", () => {
    // Given: the uploads page receives archived source assets.
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioUploadsWorkspacePage, {
        uploads: [uploadItem()],
      }),
    );

    // Then: the page exposes thumbnail, file metadata, and reuse actions.
    expect(html).toContain('src="/api/product-image-studio/projects/project-1/assets/asset-1/preview"');
    expect(html).toContain("safe-card.svg");
    expect(html).toContain("AI 이미지 생성기 - 참고");
    expect(html).toContain("참고 이미지");
    expect(html).toContain("image/svg+xml");
    expect(html).toContain("디자인에 사용");
    expect(html).toContain("템플릿에 적용");
    expect(html).toContain("SVG 변환");
    expect(html).toContain("/product-image-studio/ai-tools?tool=svg-conversion&amp;upload=asset-1");
    expect(html).not.toContain("새 상품컷");
    expect(html).not.toContain("새 업로드");
    expect(html).not.toContain("업로드 라이브러리");
    expect(html).not.toContain("원본 보기");
    expect(html).not.toContain("저장된 업로드가 아직 없습니다");
  });

  it("serves uploaded asset previews for library thumbnails", async () => {
    // Given: a project has one uploaded image asset.
    const projectResponse = await createProject(projectRequest());
    const projectBody: unknown = await projectResponse.json();
    if (!isProjectCreateBody(projectBody)) {
      throw new Error("project create body missing");
    }
    const uploadResponse = await uploadAsset(uploadRequest(projectBody.project.id), {
      params: Promise.resolve({ id: projectBody.project.id }),
    });
    const uploadBody: unknown = await uploadResponse.json();
    if (!isUploadCreateBody(uploadBody)) {
      throw new Error("asset create body missing");
    }

    // When: the upload library thumbnail route is requested.
    const response = await previewAsset(
      new Request(
        `http://127.0.0.1:3000/api/product-image-studio/projects/${projectBody.project.id}/assets/${uploadBody.asset.id}/preview`,
      ),
      { params: Promise.resolve({ assetId: uploadBody.asset.id, id: projectBody.project.id }) },
    );

    // Then: the stored upload bytes are returned as an inline image.
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect((await response.arrayBuffer()).byteLength).toBe(4);
  });
});

type ProjectCreateBody = {
  readonly project: { readonly id: string };
};

type UploadCreateBody = {
  readonly asset: { readonly id: string };
};

function uploadItem(): ProductImageStudioUploadArchiveItem {
  return {
    assetId: "asset-1",
    byteSize: 1500,
    contentType: "image/svg+xml",
    createdAt: "2026-06-14T00:01:00.000Z",
    designUseUrl: "/product-image-studio/designs?upload=asset-1",
    originalFileName: "safe-card.svg",
    previewUrl: "/api/product-image-studio/projects/project-1/assets/asset-1/preview",
    projectId: "project-1",
    projectName: "AI 이미지 생성기 - 참고",
    role: "reference_mood",
    storageKey: "product-image-studio/project-1/reference_mood/asset-1.svg",
    svgConversionUrl: "/product-image-studio/ai-tools?tool=svg-conversion&upload=asset-1",
    templateUseUrl: "/product-image-studio/templates?upload=asset-1",
  };
}

function projectRequest(): Request {
  return new Request("http://127.0.0.1:3000/api/product-image-studio/projects", {
    body: JSON.stringify({
      cardFormat: "folded_card",
      name: "업로드 테스트",
      productType: "card_envelope_seal_set",
      productionSettings: manualProductionSettings("folded_card"),
      qualityMode: "draft",
      ratios: ["1:1"],
      requestedCardPoses: ["folded_closed"],
      requestedOutputs: ["set_combined"],
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

function uploadRequest(projectId: string): Request {
  const formData = new FormData();
  formData.set("role", "folded_card_outer_front");
  formData.set("file", new File([new ArrayBuffer(4)], "card-front.png", { type: "image/png" }));

  return new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${projectId}/assets`, {
    body: formData,
    method: "POST",
  });
}

function isProjectCreateBody(value: unknown): value is ProjectCreateBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "project" in value &&
    typeof value.project === "object" &&
    value.project !== null &&
    "id" in value.project &&
    typeof value.project.id === "string"
  );
}

function isUploadCreateBody(value: unknown): value is UploadCreateBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "asset" in value &&
    typeof value.asset === "object" &&
    value.asset !== null &&
    "id" in value.asset &&
    typeof value.asset.id === "string"
  );
}

function nextId(ids: readonly string[]): () => string {
  let index = 0;
  return () => {
    const id = ids[index];
    index += 1;
    return id ?? "fallback-id";
  };
}

function nextNow(values: readonly string[]): () => string {
  let index = 0;
  return () => {
    const value = values[index];
    index += 1;
    return value ?? "2026-06-14T00:00:00.000Z";
  };
}
