import type {
  CardDisplayPose,
  CardFormat,
  ProductImageStudioOutputType,
  ProductImageStudioProductType,
  ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";
import type {
  ProductImageStudioGenerationRequestRecord,
  ProductImageStudioJsonSummary,
  ProductImageStudioProjectRecord,
  ProductImageStudioResultRecord,
} from "@/lib/persistence/productImageStudioRepository";
import type { ProductImageStudioImageMimeType } from "@/features/product-image-studio/server/fileStore";

export type ProductImageStudioProjectSummary = {
  readonly cardFormat: CardFormat;
  readonly createdAt: string;
  readonly id: string;
  readonly latestResultAt: string | null;
  readonly name: string;
  readonly productType: ProductImageStudioProductType;
  readonly resultCount: number;
  readonly updatedAt: string;
  readonly zipDownloadUrl: string;
};

export type ProductImageStudioResultArchiveItem = {
  readonly cardPose?: CardDisplayPose;
  readonly contentType?: ProductImageStudioImageMimeType;
  readonly createdAt: string;
  readonly downloadUrl: string;
  readonly generationId: string;
  readonly height: number;
  readonly model: string | null;
  readonly outputType: ProductImageStudioOutputType;
  readonly previewUrl: string;
  readonly promptPreview: string | null;
  readonly projectId: string;
  readonly projectName: string;
  readonly projectZipUrl: string;
  readonly provider: string | null;
  readonly ratio: ProductImageStudioRatioPreset;
  readonly resultId: string;
  readonly workflow: string | null;
  readonly width: number;
};

export function buildProductImageStudioProjectSummary(
  project: ProductImageStudioProjectRecord,
  results: readonly ProductImageStudioResultRecord[],
): ProductImageStudioProjectSummary {
  return {
    cardFormat: project.cardFormat,
    createdAt: project.createdAt,
    id: project.id,
    latestResultAt: readLatestResultAt(results),
    name: project.name,
    productType: project.productType,
    resultCount: results.length,
    updatedAt: project.updatedAt,
    zipDownloadUrl: toProjectZipUrl(project.id),
  };
}

export function buildProductImageStudioResultArchiveItem(
  project: Pick<ProductImageStudioProjectRecord, "id" | "name">,
  generation: Pick<ProductImageStudioGenerationRequestRecord, "id" | "providerRequestSummary">,
  result: ProductImageStudioResultRecord,
): ProductImageStudioResultArchiveItem {
  return {
    cardPose: result.cardPose,
    contentType: inferImageContentTypeFromStorageKey(result.storageKey),
    createdAt: result.createdAt,
    downloadUrl: toResultDownloadUrl(project.id, result.id),
    generationId: generation.id,
    height: result.height,
    model: readSummaryString(generation.providerRequestSummary, "model"),
    outputType: result.outputType,
    previewUrl: toResultPreviewUrl(project.id, result.id),
    promptPreview: readSummaryString(generation.providerRequestSummary, "promptPreview"),
    projectId: project.id,
    projectName: project.name,
    projectZipUrl: toProjectZipUrl(project.id),
    provider: readSummaryString(generation.providerRequestSummary, "provider"),
    ratio: result.ratio,
    resultId: result.id,
    workflow: readSummaryString(generation.providerRequestSummary, "workflow"),
    width: result.width,
  };
}

export function compareProductImageStudioArchiveActivity(
  left: { readonly createdAt?: string; readonly latestResultAt?: string | null; readonly updatedAt?: string },
  right: { readonly createdAt?: string; readonly latestResultAt?: string | null; readonly updatedAt?: string },
): number {
  return readActivityTime(right).localeCompare(readActivityTime(left));
}

export function toProjectZipUrl(projectId: string): string {
  return `/api/product-image-studio/projects/${encodeURIComponent(projectId)}/downloads.zip`;
}

export function toResultDownloadUrl(projectId: string, resultId: string): string {
  return `/api/product-image-studio/projects/${encodeURIComponent(projectId)}/results/${encodeURIComponent(resultId)}/download`;
}

export function toResultPreviewUrl(projectId: string, resultId: string): string {
  return `/api/product-image-studio/projects/${encodeURIComponent(projectId)}/results/${encodeURIComponent(resultId)}/preview`;
}

export function readSummaryString(summary: ProductImageStudioJsonSummary, key: string): string | null {
  const value = summary[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readLatestResultAt(results: readonly ProductImageStudioResultRecord[]): string | null {
  return results.reduce<string | null>((latest, result) => (
    latest === null || result.createdAt > latest ? result.createdAt : latest
  ), null);
}

function readActivityTime(value: {
  readonly createdAt?: string;
  readonly latestResultAt?: string | null;
  readonly updatedAt?: string;
}): string {
  return value.latestResultAt ?? value.updatedAt ?? value.createdAt ?? "";
}

function inferImageContentTypeFromStorageKey(storageKey: string): ProductImageStudioImageMimeType {
  if (storageKey.endsWith(".jpg") || storageKey.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (storageKey.endsWith(".webp")) {
    return "image/webp";
  }
  if (storageKey.endsWith(".svg")) {
    return "image/svg+xml";
  }
  return "image/png";
}
