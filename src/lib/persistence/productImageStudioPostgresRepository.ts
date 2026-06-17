import { randomUUID } from "node:crypto";
import {
  ensureProductImageStudioPostgresSchema,
  runProductImageStudioPostgresQuery,
  type ProductImageStudioSqlQuery,
} from "@/lib/persistence/productImageStudioPostgresSchema";
import {
  mapProductImageStudioAssetRow,
  mapProductImageStudioDownloadBundleRow,
  mapProductImageStudioGenerationRequestRow,
  mapProductImageStudioProjectRow,
  mapProductImageStudioResultRow,
  mapProductImageStudioUsageRow,
} from "@/lib/persistence/productImageStudioPostgresRows";
import {
  listPostgresProductImageStudioProjectSummaries,
  listPostgresProductImageStudioResultArchiveItems,
} from "@/lib/persistence/productImageStudioPostgresArchiveRepository";
import type {
  AddProductImageStudioAssetInput,
  AddProductImageStudioDownloadBundleInput,
  AddProductImageStudioResultInput,
  AddProductImageStudioUsageRecordInput,
  CreateProductImageStudioGenerationRequestInput,
  CreateProductImageStudioProjectInput,
  ProductImageStudioAssetRecord,
  ProductImageStudioDownloadBundleRecord,
  ProductImageStudioGenerationRequestRecord,
  ProductImageStudioProjectRecord,
  ProductImageStudioRepository,
  ProductImageStudioResultRecord,
  ProductImageStudioUsageRecord,
} from "@/lib/persistence/productImageStudioRepository";
import type {
  ProductImageStudioProjectSummary,
  ProductImageStudioResultArchiveItem,
} from "@/lib/persistence/productImageStudioArchiveReadModels";

export type ProductImageStudioPostgresRepositoryOptions = {
  readonly createId?: () => string;
  readonly query?: ProductImageStudioSqlQuery;
};

export function createPostgresProductImageStudioRepository(
  options: ProductImageStudioPostgresRepositoryOptions = {},
): ProductImageStudioRepository {
  return new PostgresProductImageStudioRepository(options.query, options.createId ?? randomUUID);
}

class PostgresProductImageStudioRepository implements ProductImageStudioRepository {
  private schemaReady = false;

  constructor(
    private readonly runQuery: ProductImageStudioSqlQuery | undefined,
    private readonly createId: () => string,
  ) {}

  async createProject(input: CreateProductImageStudioProjectInput): Promise<ProductImageStudioProjectRecord> {
    await this.ensureSchema();
    const result = await this.query(
      `
        INSERT INTO product_image_studio_projects
          (id, name, product_type, card_format, production_settings, requested_card_poses, requested_outputs, ratios, quality_mode)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9)
        RETURNING *
      `,
      [
        this.createId(),
        input.name,
        input.productType,
        input.cardFormat,
        JSON.stringify(input.productionSettings),
        JSON.stringify(input.requestedCardPoses),
        JSON.stringify(input.requestedOutputs),
        JSON.stringify(input.ratios),
        input.qualityMode,
      ],
    );
    return mapProductImageStudioProjectRow(firstRow(result.rows, "created project missing"));
  }

  async getProject(id: string): Promise<ProductImageStudioProjectRecord | null> {
    await this.ensureSchema();
    const result = await this.query("SELECT * FROM product_image_studio_projects WHERE id = $1", [id]);
    const row = result.rows[0];
    return row ? mapProductImageStudioProjectRow(row) : null;
  }

  async addAsset(input: AddProductImageStudioAssetInput): Promise<ProductImageStudioAssetRecord> {
    await this.ensureSchema();
    const result = await this.query(
      `
        INSERT INTO product_image_studio_assets
          (id, project_id, role, original_file_name, content_type, byte_size, storage_key)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [this.createId(), input.projectId, input.role, input.originalFileName, input.contentType, input.byteSize, input.storageKey],
    );
    return mapProductImageStudioAssetRow(firstRow(result.rows, "created asset missing"));
  }

  async listAssets(projectId: string): Promise<readonly ProductImageStudioAssetRecord[]> {
    await this.ensureSchema();
    const result = await this.query("SELECT * FROM product_image_studio_assets WHERE project_id = $1 ORDER BY created_at ASC", [projectId]);
    return result.rows.map(mapProductImageStudioAssetRow);
  }

  async deleteAsset(projectId: string, assetId: string): Promise<ProductImageStudioAssetRecord | null> {
    await this.ensureSchema();
    const result = await this.query("DELETE FROM product_image_studio_assets WHERE project_id = $1 AND id = $2 RETURNING *", [projectId, assetId]);
    const row = result.rows[0];
    return row ? mapProductImageStudioAssetRow(row) : null;
  }

  async createGenerationRequest(
    input: CreateProductImageStudioGenerationRequestInput,
  ): Promise<ProductImageStudioGenerationRequestRecord> {
    await this.ensureSchema();
    const result = await this.query(
      `
        INSERT INTO product_image_studio_generation_requests
          (id, project_id, concept_id, quality_mode, requested_outputs, requested_card_poses, status, provider_request_summary)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, 'queued', $7::jsonb)
        RETURNING *
      `,
      [
        this.createId(),
        input.projectId,
        input.conceptId,
        input.qualityMode,
        JSON.stringify(input.requestedOutputs),
        JSON.stringify(input.requestedCardPoses),
        JSON.stringify(input.providerRequestSummary),
      ],
    );
    return mapProductImageStudioGenerationRequestRow(firstRow(result.rows, "created generation missing"));
  }

  async addResult(input: AddProductImageStudioResultInput): Promise<ProductImageStudioResultRecord> {
    await this.ensureSchema();
    const result = await this.query(
      `
        INSERT INTO product_image_studio_results
          (id, project_id, generation_request_id, output_type, card_pose, ratio_preset, width, height, storage_key)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        this.createId(),
        input.projectId,
        input.generationRequestId,
        input.outputType,
        input.cardPose ?? null,
        input.ratio,
        input.width,
        input.height,
        input.storageKey,
      ],
    );
    return mapProductImageStudioResultRow(firstRow(result.rows, "created result missing"));
  }

  async listResults(projectId: string): Promise<readonly ProductImageStudioResultRecord[]> {
    await this.ensureSchema();
    const result = await this.query("SELECT * FROM product_image_studio_results WHERE project_id = $1 ORDER BY created_at ASC", [projectId]);
    return result.rows.map(mapProductImageStudioResultRow);
  }

  async deleteResult(projectId: string, resultId: string): Promise<ProductImageStudioResultRecord | null> {
    await this.ensureSchema();
    const result = await this.query(
      "DELETE FROM product_image_studio_results WHERE project_id = $1 AND id = $2 RETURNING *",
      [projectId, resultId],
    );
    const row = result.rows[0];
    return row ? mapProductImageStudioResultRow(row) : null;
  }

  async listProjectSummaries(): Promise<readonly ProductImageStudioProjectSummary[]> {
    await this.ensureSchema();
    return listPostgresProductImageStudioProjectSummaries((text, values) => this.query(text, values));
  }

  async listResultArchiveItems(projectId?: string): Promise<readonly ProductImageStudioResultArchiveItem[]> {
    await this.ensureSchema();
    return listPostgresProductImageStudioResultArchiveItems((text, values) => this.query(text, values), projectId);
  }

  async addDownloadBundle(
    input: AddProductImageStudioDownloadBundleInput,
  ): Promise<ProductImageStudioDownloadBundleRecord> {
    await this.ensureSchema();
    const result = await this.query(
      `
        INSERT INTO product_image_studio_download_bundles
          (id, project_id, result_ids, manifest_json, storage_key)
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
        RETURNING *
      `,
      [this.createId(), input.projectId, JSON.stringify(input.resultIds), JSON.stringify(input.manifest), input.storageKey],
    );
    return mapProductImageStudioDownloadBundleRow(firstRow(result.rows, "created download bundle missing"));
  }

  async listDownloadBundles(projectId: string): Promise<readonly ProductImageStudioDownloadBundleRecord[]> {
    await this.ensureSchema();
    const result = await this.query("SELECT * FROM product_image_studio_download_bundles WHERE project_id = $1 ORDER BY created_at ASC", [projectId]);
    return result.rows.map(mapProductImageStudioDownloadBundleRow);
  }

  async addUsageRecord(input: AddProductImageStudioUsageRecordInput): Promise<ProductImageStudioUsageRecord> {
    await this.ensureSchema();
    const result = await this.query(
      `
        INSERT INTO product_image_studio_usage_records
          (id, project_id, generation_request_id, provider, model, quality_mode, image_count, estimated_cost_cents, usage_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
        RETURNING *
      `,
      [
        this.createId(),
        input.projectId,
        input.generationRequestId,
        input.provider,
        input.model,
        input.qualityMode,
        input.imageCount,
        input.estimatedCostCents,
        JSON.stringify(input.usageSummary),
      ],
    );
    return mapProductImageStudioUsageRow(firstRow(result.rows, "created usage record missing"));
  }

  async listUsageRecords(projectId: string): Promise<readonly ProductImageStudioUsageRecord[]> {
    await this.ensureSchema();
    const result = await this.query("SELECT * FROM product_image_studio_usage_records WHERE project_id = $1 ORDER BY created_at ASC", [projectId]);
    return result.rows.map(mapProductImageStudioUsageRow);
  }

  private async ensureSchema(): Promise<void> {
    if (this.schemaReady) {
      return;
    }
    await ensureProductImageStudioPostgresSchema((text, values) => this.query(text, values));
    this.schemaReady = true;
  }

  private query(text: string, values: unknown[] = []) {
    return (this.runQuery ?? runProductImageStudioPostgresQuery)(text, values);
  }
}

function firstRow(
  rows: readonly Readonly<Record<string, unknown>>[],
  message: string,
): Readonly<Record<string, unknown>> {
  const row = rows[0];
  if (!row) {
    throw new ProductImageStudioPostgresRepositoryError(message);
  }
  return row;
}

class ProductImageStudioPostgresRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductImageStudioPostgresRepositoryError";
  }
}
