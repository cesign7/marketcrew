import { describe, expect, it } from "vitest";
import * as projectsRoute from "@/app/api/product-image-studio/projects/route";
import {
  createInMemoryProductImageStudioRepository,
  type ProductImageStudioRepository,
} from "@/lib/persistence/productImageStudioRepository";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";
import { manualProductionSettings } from "./manualProductionSettings";

describe("product image studio project archive", () => {
  it("lists project summaries with result counts", async () => {
    const repository = createArchiveRepository();
    await seedArchiveProject(repository);

    const summaries = await repository.listProjectSummaries();

    expect(summaries).toEqual([
      expect.objectContaining({
        id: "project-1",
        latestResultAt: "2026-06-11T00:04:00.000Z",
        name: "봄 초대장 세트",
        resultCount: 2,
        zipDownloadUrl: "/api/product-image-studio/projects/project-1/downloads.zip",
      }),
    ]);
  });

  it("lists result archive items with project and provider metadata", async () => {
    const repository = createArchiveRepository();
    await seedArchiveProject(repository);

    const items = await repository.listResultArchiveItems();

    expect(items).toEqual([
      expect.objectContaining({
        downloadUrl: "/api/product-image-studio/projects/project-1/results/result-2/download",
        generationId: "generation-1",
        model: "gemini-3.1-flash-image",
        previewUrl: "/api/product-image-studio/projects/project-1/results/result-2/preview",
        projectId: "project-1",
        projectName: "봄 초대장 세트",
        provider: "gemini",
        resultId: "result-2",
      }),
      expect.objectContaining({
        resultId: "result-1",
      }),
    ]);
  });

  it("serves archive API responses", async () => {
    const createResponse = await projectsRoute.POST(projectRequest("봄 초대장 세트 API"));
    const createBody: unknown = await createResponse.json();
    if (!isProjectCreateBody(createBody)) {
      throw new Error("project create body missing");
    }
    const repository = getProductImageStudioProjectRepository();
    const generation = await repository.createGenerationRequest({
      conceptId: "minimal-studio",
      projectId: createBody.project.id,
      providerRequestSummary: { model: "gpt-image-1", provider: "openai" },
      qualityMode: "draft",
      requestedCardPoses: ["folded_closed"],
      requestedOutputs: ["card_single"],
    });
    const result = await repository.addResult({
      cardPose: "folded_closed",
      generationRequestId: generation.id,
      height: 1200,
      outputType: "card_single",
      projectId: createBody.project.id,
      ratio: "1:1",
      storageKey: `product-image-studio/${createBody.project.id}/result.png`,
      width: 1200,
    });

    const projectListResponse = await projectsRoute.GET(new Request("http://127.0.0.1:3000/api/product-image-studio/projects"));
    const projectListBody: unknown = await projectListResponse.json();
    const resultsRoute = await import("@/app/api/product-image-studio/results/route");
    const allResultsResponse = await resultsRoute.GET(new Request("http://127.0.0.1:3000/api/product-image-studio/results"));
    const allResultsBody: unknown = await allResultsResponse.json();
    const projectResultsRoute = await import("@/app/api/product-image-studio/projects/[id]/results/route");
    const projectResultsResponse = await projectResultsRoute.GET(
      new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${createBody.project.id}/results`),
      { params: Promise.resolve({ id: createBody.project.id }) },
    );
    const projectResultsBody: unknown = await projectResultsResponse.json();

    expect(projectListResponse.status).toBe(200);
    expect(projectListBody).toMatchObject({
      ok: true,
      projects: expect.arrayContaining([
        expect.objectContaining({ id: createBody.project.id, resultCount: 1 }),
      ]),
    });
    expect(allResultsResponse.status).toBe(200);
    expect(allResultsBody).toMatchObject({
      ok: true,
      results: expect.arrayContaining([
        expect.objectContaining({ model: "gpt-image-1", provider: "openai", resultId: result.id }),
      ]),
    });
    expect(projectResultsResponse.status).toBe(200);
    expect(projectResultsBody).toMatchObject({
      ok: true,
      results: [expect.objectContaining({ projectId: createBody.project.id, resultId: result.id })],
    });
    expect(JSON.stringify(projectListBody)).not.toContain("secret");
    expect(JSON.stringify(allResultsBody)).not.toContain("OPENAI_API_KEY");
  });

  it("deletes one archived result through the project result API", async () => {
    const createResponse = await projectsRoute.POST(projectRequest("삭제 테스트 디자인"));
    const createBody: unknown = await createResponse.json();
    if (!isProjectCreateBody(createBody)) {
      throw new Error("project create body missing");
    }
    const repository = getProductImageStudioProjectRepository();
    const generation = await repository.createGenerationRequest({
      conceptId: "minimal-studio",
      projectId: createBody.project.id,
      providerRequestSummary: { model: "gpt-image-1", provider: "openai" },
      qualityMode: "draft",
      requestedCardPoses: ["folded_closed"],
      requestedOutputs: ["card_single"],
    });
    const result = await repository.addResult({
      cardPose: "folded_closed",
      generationRequestId: generation.id,
      height: 1200,
      outputType: "card_single",
      projectId: createBody.project.id,
      ratio: "1:1",
      storageKey: `product-image-studio/${createBody.project.id}/delete-test-result.png`,
      width: 1200,
    });
    const route = await import("@/app/api/product-image-studio/projects/[id]/results/[resultId]/route");

    const deleteResponse = await route.DELETE(
      new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${createBody.project.id}/results/${result.id}`),
      { params: Promise.resolve({ id: createBody.project.id, resultId: result.id }) },
    );
    const missingResponse = await route.DELETE(
      new Request(`http://127.0.0.1:3000/api/product-image-studio/projects/${createBody.project.id}/results/${result.id}`),
      { params: Promise.resolve({ id: createBody.project.id, resultId: result.id }) },
    );
    const remaining = await repository.listResultArchiveItems(createBody.project.id);
    const deleteBody: unknown = await deleteResponse.json();
    const missingBody: unknown = await missingResponse.json();

    expect(deleteResponse.status).toBe(200);
    expect(deleteBody).toMatchObject({ deletedResultId: result.id, ok: true });
    expect(remaining).toEqual([]);
    expect(missingResponse.status).toBe(404);
    expect(missingBody).toMatchObject({ error: { code: "RESULT_NOT_FOUND" }, ok: false });
    expect(JSON.stringify(deleteBody)).not.toContain("secret");
  });
});

type ProjectCreateBody = {
  readonly project: { readonly id: string };
};

function createArchiveRepository(): ProductImageStudioRepository {
  return createInMemoryProductImageStudioRepository({
    createId: nextId(["project-1", "generation-1", "result-1", "result-2"]),
    now: nextNow([
      "2026-06-11T00:00:00.000Z",
      "2026-06-11T00:01:00.000Z",
      "2026-06-11T00:03:00.000Z",
      "2026-06-11T00:04:00.000Z",
    ]),
  });
}

function projectRequest(name: string): Request {
  return new Request("http://127.0.0.1:3000/api/product-image-studio/projects", {
    body: JSON.stringify({
      cardFormat: "folded_card",
      name,
      productType: "card_envelope_seal_set",
      productionSettings: manualProductionSettings("folded_card"),
      qualityMode: "draft",
      ratios: ["1:1"],
      requestedCardPoses: ["folded_closed"],
      requestedOutputs: ["card_single"],
    }),
    headers: { "content-type": "application/json" },
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

async function seedArchiveProject(repository: ProductImageStudioRepository): Promise<void> {
  const project = await repository.createProject({
    cardFormat: "folded_card",
    name: "봄 초대장 세트",
    productType: "card_envelope_seal_set",
    productionSettings: manualProductionSettings("folded_card"),
    qualityMode: "draft",
    ratios: ["1:1"],
    requestedCardPoses: ["folded_closed"],
    requestedOutputs: ["card_single"],
  });
  const generation = await repository.createGenerationRequest({
    conceptId: "minimal-studio",
    projectId: project.id,
    providerRequestSummary: { model: "gemini-3.1-flash-image", provider: "gemini" },
    qualityMode: "draft",
    requestedCardPoses: ["folded_closed"],
    requestedOutputs: ["card_single"],
  });
  await repository.addResult({
    cardPose: "folded_closed",
    generationRequestId: generation.id,
    height: 1200,
    outputType: "card_single",
    projectId: project.id,
    ratio: "1:1",
    storageKey: "product-image-studio/project-1/result-1.png",
    width: 1200,
  });
  await repository.addResult({
    cardPose: "folded_closed",
    generationRequestId: generation.id,
    height: 1500,
    outputType: "card_single",
    projectId: project.id,
    ratio: "4:5",
    storageKey: "product-image-studio/project-1/result-2.png",
    width: 1200,
  });
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
    return value ?? "2026-06-11T00:00:00.000Z";
  };
}
