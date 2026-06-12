import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRODUCT_IMAGE_STUDIO_TABLE_NAMES,
  createInMemoryProductImageStudioRepository,
} from "@/lib/persistence/productImageStudioRepository";
import { createPostgresProductImageStudioRepository } from "@/lib/persistence/productImageStudioPostgresRepository";
import type { ProductImageStudioSqlQuery } from "@/lib/persistence/productImageStudioPostgresSchema";
import { selectProductImageStudioRepositoryStorageMode } from "@/features/product-image-studio/server/projectApi";
import { manualProductionSettings } from "./manualProductionSettings";

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
    expect(workflowSql).toContain("CREATE TABLE IF NOT EXISTS product_image_studio_provider_settings");
    expect(workflowSql).toContain("encrypted_api_key TEXT NOT NULL");
    expect(workflowSql).toContain("production_settings JSONB NOT NULL");
  });

  it("declares provider-keyed image provider settings persistence", () => {
    // Given: the workflow schema is the source of truth for production tables.
    const workflowSql = readFileSync(join(process.cwd(), "db/workflow-store.sql"), "utf8");

    // When: provider settings persistence is inspected.
    const providerCredentialSql = workflowSql.slice(
      workflowSql.indexOf("CREATE TABLE IF NOT EXISTS product_image_studio_provider_settings"),
      workflowSql.indexOf("CREATE TABLE IF NOT EXISTS product_image_studio_provider_setting_defaults"),
    );
    const providerDefaultSql = workflowSql.slice(
      workflowSql.indexOf("CREATE TABLE IF NOT EXISTS product_image_studio_provider_setting_defaults"),
      workflowSql.indexOf("CREATE INDEX IF NOT EXISTS product_image_studio_projects_updated_idx"),
    );

    // Then: credentials are keyed per provider and default selection is stored separately.
    expect(providerCredentialSql).toContain("provider TEXT PRIMARY KEY");
    expect(providerCredentialSql).not.toContain("CHECK (id = 'default')");
    expect(providerDefaultSql).toContain("CREATE TABLE IF NOT EXISTS product_image_studio_provider_setting_defaults");
    expect(providerDefaultSql).toContain("default_provider TEXT NOT NULL");
  });

  it("selects Postgres metadata storage only when production-like database configuration exists", () => {
    expect(selectProductImageStudioRepositoryStorageMode({})).toBe("memory");
    expect(selectProductImageStudioRepositoryStorageMode({ DATABASE_URL: "postgres://test" })).toBe("memory");
    expect(
      selectProductImageStudioRepositoryStorageMode({
        DATABASE_URL: "postgres://test",
        VERCEL: "1",
      }),
    ).toBe("postgres");
    expect(
      selectProductImageStudioRepositoryStorageMode({
        DATABASE_URL: "postgres://test",
        PRODUCT_IMAGE_STUDIO_METADATA_STORE: "postgres",
      }),
    ).toBe("postgres");
  });

  it("stores a project lifecycle through the Postgres repository contract", async () => {
    const queryFake = createProductImageStudioQueryFake();
    const generatedIds = [
      "project-1",
      "asset-1",
      "generation-1",
      "result-1",
      "bundle-1",
      "usage-1",
    ];
    const repository = createPostgresProductImageStudioRepository({
      createId: () => generatedIds.shift() ?? "fallback-id",
      query: queryFake.query,
    });

    const project = await repository.createProject({
      cardFormat: "folded_card",
      name: "봄 초대장 세트",
      productType: "card_envelope_seal_set",
      productionSettings: manualProductionSettings("folded_card"),
      qualityMode: "draft",
      ratios: ["1:1", "4:5"],
      requestedCardPoses: ["folded_closed", "folded_open_spread"],
      requestedOutputs: ["set_combined", "card_single"],
    });

    expect(await repository.getProject(project.id)).toEqual(project);
    expect(JSON.stringify(queryFake.values)).toContain("specSource");
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
      productionSettings: manualProductionSettings("folded_card"),
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

function createProductImageStudioQueryFake(): {
  readonly query: ProductImageStudioSqlQuery;
  readonly values: readonly unknown[];
} {
  const projects = new Map<string, Readonly<Record<string, unknown>>>();
  const values: unknown[] = [];
  const query: ProductImageStudioSqlQuery = async (text, queryValues = []) => {
    values.push(...queryValues);

    if (text.includes("CREATE ") || text.includes("ALTER TABLE") || text.includes("CREATE INDEX")) {
      return { rows: [] };
    }

    if (text.includes("INSERT INTO product_image_studio_projects")) {
      const row = {
        card_format: readStringValue(queryValues[3]),
        created_at: "2026-06-11T00:00:00.000Z",
        id: readStringValue(queryValues[0]),
        name: readStringValue(queryValues[1]),
        product_type: readStringValue(queryValues[2]),
        production_settings: parseJsonValue(queryValues[4]),
        quality_mode: readStringValue(queryValues[8]),
        ratios: parseJsonValue(queryValues[7]),
        requested_card_poses: parseJsonValue(queryValues[5]),
        requested_outputs: parseJsonValue(queryValues[6]),
        updated_at: "2026-06-11T00:00:00.000Z",
      } satisfies Readonly<Record<string, unknown>>;
      projects.set(row.id, row);
      return { rows: [row] };
    }

    if (text.includes("SELECT * FROM product_image_studio_projects")) {
      const id = queryValues[0];
      const row = typeof id === "string" ? projects.get(id) : undefined;
      return { rows: row ? [row] : [] };
    }

    return { rows: [] };
  };

  return { query, values };
}

function readStringValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  throw new Error("expected string query value");
}

function parseJsonValue(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}
