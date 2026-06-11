import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRODUCT_IMAGE_STUDIO_TABLE_NAMES,
  createInMemoryProductImageStudioRepository,
} from "@/lib/persistence/productImageStudioRepository";

describe("product image studio repository contract", () => {
  it("declares the expected persistence tables in the workflow schema", () => {
    const expectedTableNames = [
      "product_image_studio_projects",
      "product_image_studio_assets",
      "product_image_studio_generation_requests",
      "product_image_studio_results",
      "product_image_studio_download_bundles",
      "product_image_studio_usage_records",
    ];
    const workflowSql = readFileSync(join(process.cwd(), "db/workflow-store.sql"), "utf8");

    expect(PRODUCT_IMAGE_STUDIO_TABLE_NAMES).toEqual(expectedTableNames);
    for (const tableName of expectedTableNames) {
      expect(workflowSql).toContain(`CREATE TABLE IF NOT EXISTS ${tableName}`);
    }
  });

  it("stores a folded-card project lifecycle without Search Ad repository coupling", async () => {
    const generatedIds = [
      "project-1",
      "asset-1",
      "generation-1",
      "result-1",
      "bundle-1",
      "usage-1",
    ];
    const repository = createInMemoryProductImageStudioRepository({
      createId: () => generatedIds.shift() ?? "fallback-id",
      now: () => "2026-06-11T00:00:00.000Z",
    });

    const project = await repository.createProject({
      cardFormat: "folded_card",
      name: "봄 초대장 세트",
      productType: "card_envelope_seal_set",
      qualityMode: "draft",
      ratios: ["1:1", "4:5"],
      requestedCardPoses: ["folded_closed", "folded_open_spread"],
      requestedOutputs: ["set_combined", "card_single", "envelope_single", "seal_sticker_single"],
    });
    const asset = await repository.addAsset({
      byteSize: 2048,
      contentType: "image/png",
      originalFileName: "card-front.png",
      projectId: project.id,
      role: "folded_card_outer_front",
      storageKey: "studio/project-1/card-front.png",
    });
    const generation = await repository.createGenerationRequest({
      conceptId: "minimal-studio",
      projectId: project.id,
      providerRequestSummary: { mode: "fake" },
      qualityMode: "draft",
      requestedCardPoses: ["folded_closed"],
      requestedOutputs: ["set_combined"],
    });
    const result = await repository.addResult({
      cardPose: "folded_closed",
      generationRequestId: generation.id,
      height: 1200,
      outputType: "set_combined",
      projectId: project.id,
      ratio: "1:1",
      storageKey: "studio/project-1/result.png",
      width: 1200,
    });
    const bundle = await repository.addDownloadBundle({
      manifest: { resultCount: 1 },
      projectId: project.id,
      resultIds: [result.id],
      storageKey: "studio/project-1/downloads.zip",
    });
    const usage = await repository.addUsageRecord({
      estimatedCostCents: 25,
      generationRequestId: generation.id,
      imageCount: 1,
      model: "fake-image-model",
      projectId: project.id,
      provider: "fake",
      qualityMode: "draft",
      usageSummary: { images: 1 },
    });

    expect(await repository.getProject(project.id)).toEqual(project);
    expect(await repository.listAssets(project.id)).toEqual([asset]);
    expect(await repository.listResults(project.id)).toEqual([result]);
    expect(await repository.listDownloadBundles(project.id)).toEqual([bundle]);
    expect(await repository.listUsageRecords(project.id)).toEqual([usage]);
  });

  it("keeps the studio repository source separate from Search Ad modules", () => {
    const sourceText = readFileSync(
      join(process.cwd(), "src/lib/persistence/productImageStudioRepository.ts"),
      "utf8",
    );

    expect(sourceText).not.toContain("search-ad");
    expect(sourceText).not.toContain("searchAdRepository");
    expect(sourceText).not.toContain("SearchAd");
  });
});
