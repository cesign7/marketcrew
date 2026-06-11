import {
  CARD_FORMATS,
  PRODUCT_IMAGE_STUDIO_ASSET_ROLES,
  PRODUCT_IMAGE_STUDIO_GENERATION_STATUSES,
  PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES,
  PRODUCT_IMAGE_STUDIO_PRODUCT_TYPES,
  PRODUCT_IMAGE_STUDIO_QUALITY_MODES,
  PRODUCT_IMAGE_STUDIO_RATIO_PRESETS,
  type CardDisplayPose,
} from "@/features/product-image-studio/domain/types";
import { getAllowedCardPosesForFormat } from "@/features/product-image-studio/domain/outputContracts";
import { parseProductImageStudioProductionSettings } from "@/features/product-image-studio/domain/productionSettings";
import type {
  ProductImageStudioAssetRecord,
  ProductImageStudioDownloadBundleRecord,
  ProductImageStudioGenerationRequestRecord,
  ProductImageStudioJsonSummary,
  ProductImageStudioProjectRecord,
  ProductImageStudioResultRecord,
  ProductImageStudioUsageRecord,
} from "@/lib/persistence/productImageStudioRepository";

export class ProductImageStudioPostgresRowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductImageStudioPostgresRowError";
  }
}

export function mapProductImageStudioProjectRow(row: Readonly<Record<string, unknown>>): ProductImageStudioProjectRecord {
  const cardFormat = readOneOf(row, "card_format", CARD_FORMATS);
  const productionSettings = parseProductImageStudioProductionSettings(row["production_settings"], cardFormat);
  if (!productionSettings.ok) {
    throw new ProductImageStudioPostgresRowError("product image studio project production settings are invalid");
  }
  return {
    cardFormat,
    createdAt: readIso(row, "created_at"),
    id: readString(row, "id"),
    name: readString(row, "name"),
    productType: readOneOf(row, "product_type", PRODUCT_IMAGE_STUDIO_PRODUCT_TYPES),
    productionSettings: productionSettings.settings,
    qualityMode: readOneOf(row, "quality_mode", PRODUCT_IMAGE_STUDIO_QUALITY_MODES),
    ratios: readStringArray(row, "ratios", PRODUCT_IMAGE_STUDIO_RATIO_PRESETS),
    requestedCardPoses: readStringArray(row, "requested_card_poses", getAllowedCardPosesForFormat(cardFormat)),
    requestedOutputs: readStringArray(row, "requested_outputs", PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES),
    updatedAt: readIso(row, "updated_at"),
  };
}

export function mapProductImageStudioAssetRow(row: Readonly<Record<string, unknown>>): ProductImageStudioAssetRecord {
  return {
    byteSize: readInteger(row, "byte_size"),
    contentType: readString(row, "content_type"),
    createdAt: readIso(row, "created_at"),
    id: readString(row, "id"),
    originalFileName: readString(row, "original_file_name"),
    projectId: readString(row, "project_id"),
    role: readOneOf(row, "role", PRODUCT_IMAGE_STUDIO_ASSET_ROLES),
    storageKey: readString(row, "storage_key"),
  };
}

export function mapProductImageStudioGenerationRequestRow(
  row: Readonly<Record<string, unknown>>,
): ProductImageStudioGenerationRequestRecord {
  const requestedCardPoses = readCardPoseArray(row, "requested_card_poses");
  return {
    conceptId: readString(row, "concept_id"),
    createdAt: readIso(row, "created_at"),
    errorMessage: readOptionalString(row, "error_message"),
    id: readString(row, "id"),
    projectId: readString(row, "project_id"),
    providerRequestSummary: readJsonSummary(row, "provider_request_summary"),
    providerResponseSummary: readJsonSummary(row, "provider_response_summary"),
    qualityMode: readOneOf(row, "quality_mode", PRODUCT_IMAGE_STUDIO_QUALITY_MODES),
    requestedCardPoses,
    requestedOutputs: readStringArray(row, "requested_outputs", PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES),
    status: readOneOf(row, "status", PRODUCT_IMAGE_STUDIO_GENERATION_STATUSES),
    updatedAt: readIso(row, "updated_at"),
  };
}

export function mapProductImageStudioResultRow(row: Readonly<Record<string, unknown>>): ProductImageStudioResultRecord {
  return {
    cardPose: readOptionalCardPose(row, "card_pose"),
    createdAt: readIso(row, "created_at"),
    generationRequestId: readString(row, "generation_request_id"),
    height: readInteger(row, "height"),
    id: readString(row, "id"),
    outputType: readOneOf(row, "output_type", PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES),
    projectId: readString(row, "project_id"),
    ratio: readOneOf(row, "ratio_preset", PRODUCT_IMAGE_STUDIO_RATIO_PRESETS),
    storageKey: readString(row, "storage_key"),
    width: readInteger(row, "width"),
  };
}

export function mapProductImageStudioDownloadBundleRow(
  row: Readonly<Record<string, unknown>>,
): ProductImageStudioDownloadBundleRecord {
  return {
    createdAt: readIso(row, "created_at"),
    id: readString(row, "id"),
    manifest: readJsonSummary(row, "manifest_json"),
    projectId: readString(row, "project_id"),
    resultIds: readPlainStringArray(row, "result_ids"),
    storageKey: readString(row, "storage_key"),
  };
}

export function mapProductImageStudioUsageRow(row: Readonly<Record<string, unknown>>): ProductImageStudioUsageRecord {
  return {
    createdAt: readIso(row, "created_at"),
    estimatedCostCents: readNumber(row, "estimated_cost_cents"),
    generationRequestId: readString(row, "generation_request_id"),
    id: readString(row, "id"),
    imageCount: readInteger(row, "image_count"),
    model: readString(row, "model"),
    projectId: readString(row, "project_id"),
    provider: readString(row, "provider"),
    qualityMode: readOneOf(row, "quality_mode", PRODUCT_IMAGE_STUDIO_QUALITY_MODES),
    usageSummary: readJsonSummary(row, "usage_json"),
  };
}

function readString(row: Readonly<Record<string, unknown>>, key: string): string {
  const value = row[key];
  if (typeof value === "string") {
    return value;
  }
  throw new ProductImageStudioPostgresRowError(`expected string column ${key}`);
}

function readOptionalString(row: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = row[key];
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  throw new ProductImageStudioPostgresRowError(`expected optional string column ${key}`);
}

function readInteger(row: Readonly<Record<string, unknown>>, key: string): number {
  const value = row[key];
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return value;
  }
  throw new ProductImageStudioPostgresRowError(`expected integer column ${key}`);
}

function readNumber(row: Readonly<Record<string, unknown>>, key: string): number {
  const value = row[key];
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed === "number" && Number.isFinite(parsed)) {
    return parsed;
  }
  throw new ProductImageStudioPostgresRowError(`expected numeric column ${key}`);
}

function readIso(row: Readonly<Record<string, unknown>>, key: string): string {
  const value = row[key];
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return new Date(value).toISOString();
  }
  throw new ProductImageStudioPostgresRowError(`expected date column ${key}`);
}

function readOneOf<Value extends string>(
  row: Readonly<Record<string, unknown>>,
  key: string,
  allowedValues: readonly Value[],
): Value {
  const value = row[key];
  if (typeof value === "string") {
    const matched = allowedValues.find((allowedValue) => allowedValue === value);
    if (matched) {
      return matched;
    }
  }
  throw new ProductImageStudioPostgresRowError(`unexpected enum column ${key}`);
}

function readStringArray<Value extends string>(
  row: Readonly<Record<string, unknown>>,
  key: string,
  allowedValues: readonly Value[],
): readonly Value[] {
  const value = row[key];
  if (!Array.isArray(value)) {
    throw new ProductImageStudioPostgresRowError(`expected json array column ${key}`);
  }
  const parsed: Value[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      throw new ProductImageStudioPostgresRowError(`expected string array item ${key}`);
    }
    const matched = allowedValues.find((allowedValue) => allowedValue === item);
    if (!matched) {
      throw new ProductImageStudioPostgresRowError(`unexpected string array item ${key}`);
    }
    parsed.push(matched);
  }
  return parsed;
}

function readPlainStringArray(row: Readonly<Record<string, unknown>>, key: string): readonly string[] {
  const value = row[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new ProductImageStudioPostgresRowError(`expected plain string array column ${key}`);
  }
  return value;
}

function readCardPoseArray(row: Readonly<Record<string, unknown>>, key: string): readonly CardDisplayPose[] {
  const value = row[key];
  if (!Array.isArray(value)) {
    throw new ProductImageStudioPostgresRowError(`expected card pose array column ${key}`);
  }
  const parsed: CardDisplayPose[] = [];
  for (const item of value) {
    const matched = readCardPoseValue(item);
    parsed.push(matched);
  }
  return parsed;
}

function readOptionalCardPose(row: Readonly<Record<string, unknown>>, key: string): CardDisplayPose | undefined {
  const value = row[key];
  return value === null || value === undefined ? undefined : readCardPoseValue(value);
}

function readCardPoseValue(value: unknown): CardDisplayPose {
  for (const format of CARD_FORMATS) {
    const matched = getAllowedCardPosesForFormat(format).find((pose) => pose === value);
    if (matched) {
      return matched;
    }
  }
  throw new ProductImageStudioPostgresRowError("unexpected card pose value");
}

function readJsonSummary(row: Readonly<Record<string, unknown>>, key: string): ProductImageStudioJsonSummary {
  const value = row[key];
  if (isJsonSummary(value)) {
    return value;
  }
  throw new ProductImageStudioPostgresRowError(`expected json summary column ${key}`);
}

function isJsonSummary(value: unknown): value is ProductImageStudioJsonSummary {
  return isRecord(value) && Object.values(value).every(isJsonSummaryValue);
}

function isJsonSummaryValue(value: unknown): value is ProductImageStudioJsonSummary[string] {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
