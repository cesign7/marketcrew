import {
  CARD_FORMATS,
  FOLDED_CARD_DISPLAY_POSES,
  PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES,
  PRODUCT_IMAGE_STUDIO_PRODUCT_TYPES,
  PRODUCT_IMAGE_STUDIO_RATIO_PRESETS,
  POSTCARD_DISPLAY_POSES,
  type CardDisplayPose,
} from "@/features/product-image-studio/domain/types";
import {
  readSummaryString,
  toProjectZipUrl,
  toResultDownloadUrl,
  toResultPreviewUrl,
  type ProductImageStudioProjectSummary,
  type ProductImageStudioResultArchiveItem,
} from "@/lib/persistence/productImageStudioArchiveReadModels";
import type { ProductImageStudioJsonSummary } from "@/lib/persistence/productImageStudioRepository";
import type { ProductImageStudioSqlQuery } from "@/lib/persistence/productImageStudioPostgresSchema";

export async function listPostgresProductImageStudioProjectSummaries(
  query: ProductImageStudioSqlQuery,
): Promise<readonly ProductImageStudioProjectSummary[]> {
  const result = await query(`
    SELECT
      p.id,
      p.name,
      p.product_type,
      p.card_format,
      p.created_at,
      p.updated_at,
      COUNT(r.id) AS result_count,
      MAX(r.created_at) AS latest_result_at
    FROM product_image_studio_projects p
    LEFT JOIN product_image_studio_results r ON r.project_id = p.id
    GROUP BY p.id, p.name, p.product_type, p.card_format, p.created_at, p.updated_at
    ORDER BY COALESCE(MAX(r.created_at), p.updated_at, p.created_at) DESC
  `);
  return result.rows.map((row) => ({
    cardFormat: readOneOf(row, "card_format", CARD_FORMATS),
    createdAt: readIso(row, "created_at"),
    id: readString(row, "id"),
    latestResultAt: readOptionalIso(row, "latest_result_at"),
    name: readString(row, "name"),
    productType: readOneOf(row, "product_type", PRODUCT_IMAGE_STUDIO_PRODUCT_TYPES),
    resultCount: readIntegerLike(row, "result_count"),
    updatedAt: readIso(row, "updated_at"),
    zipDownloadUrl: toProjectZipUrl(readString(row, "id")),
  }));
}

export async function listPostgresProductImageStudioResultArchiveItems(
  query: ProductImageStudioSqlQuery,
  projectId?: string,
): Promise<readonly ProductImageStudioResultArchiveItem[]> {
  const result = await query(
    `
      SELECT
        r.id AS result_id,
        r.project_id,
        p.name AS project_name,
        r.generation_request_id,
        r.output_type,
        r.card_pose,
        r.ratio_preset,
        r.width,
        r.height,
        r.created_at,
        g.provider_request_summary
      FROM product_image_studio_results r
      JOIN product_image_studio_projects p ON p.id = r.project_id
      JOIN product_image_studio_generation_requests g ON g.id = r.generation_request_id
      WHERE ($1::text IS NULL OR r.project_id = $1)
      ORDER BY r.created_at DESC
    `,
    [projectId ?? null],
  );
  return result.rows.map(toResultArchiveItem);
}

function toResultArchiveItem(row: Readonly<Record<string, unknown>>): ProductImageStudioResultArchiveItem {
  const projectId = readString(row, "project_id");
  const resultId = readString(row, "result_id");
  const summary = readJsonSummary(row, "provider_request_summary");
  return {
    cardPose: readOptionalCardPose(row, "card_pose"),
    createdAt: readIso(row, "created_at"),
    downloadUrl: toResultDownloadUrl(projectId, resultId),
    generationId: readString(row, "generation_request_id"),
    height: readIntegerLike(row, "height"),
    model: readSummaryString(summary, "model"),
    outputType: readOneOf(row, "output_type", PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES),
    previewUrl: toResultPreviewUrl(projectId, resultId),
    projectId,
    projectName: readString(row, "project_name"),
    projectZipUrl: toProjectZipUrl(projectId),
    provider: readSummaryString(summary, "provider"),
    ratio: readOneOf(row, "ratio_preset", PRODUCT_IMAGE_STUDIO_RATIO_PRESETS),
    resultId,
    width: readIntegerLike(row, "width"),
  };
}

function readString(row: Readonly<Record<string, unknown>>, key: string): string {
  const value = row[key];
  if (typeof value === "string") {
    return value;
  }
  throw new Error(`expected string column ${key}`);
}

function readIso(row: Readonly<Record<string, unknown>>, key: string): string {
  const value = row[key];
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return new Date(value).toISOString();
  }
  throw new Error(`expected date column ${key}`);
}

function readOptionalIso(row: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  return readIso(row, key);
}

function readIntegerLike(row: Readonly<Record<string, unknown>>, key: string): number {
  const value = row[key];
  const parsed = typeof value === "string" || typeof value === "bigint" ? Number(value) : value;
  if (typeof parsed === "number" && Number.isSafeInteger(parsed)) {
    return parsed;
  }
  throw new Error(`expected integer column ${key}`);
}

function readOneOf<Value extends string>(
  row: Readonly<Record<string, unknown>>,
  key: string,
  allowedValues: readonly Value[],
): Value {
  const value = row[key];
  if (typeof value === "string") {
    const parsed = allowedValues.find((candidate) => candidate === value);
    if (parsed) {
      return parsed;
    }
  }
  throw new Error(`expected supported value column ${key}`);
}

function readOptionalCardPose(row: Readonly<Record<string, unknown>>, key: string): CardDisplayPose | undefined {
  const value = row[key];
  if (typeof value !== "string") {
    return undefined;
  }
  return [...FOLDED_CARD_DISPLAY_POSES, ...POSTCARD_DISPLAY_POSES].find((candidate) => candidate === value);
}

function readJsonSummary(row: Readonly<Record<string, unknown>>, key: string): ProductImageStudioJsonSummary {
  const value = row[key];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as ProductImageStudioJsonSummary)
    : {};
}
