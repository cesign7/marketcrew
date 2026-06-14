import { PRODUCT_IMAGE_STUDIO_ASSET_ROLES, type ProductImageStudioAssetRole } from "@/features/product-image-studio/domain/types";
import type { ProductImageStudioArchivePageRequestOptions } from "@/features/product-image-studio/server/archivePageData";
import type { ProductImageStudioUploadArchiveItem } from "@/features/product-image-studio/server/uploadArchive";

export async function loadProductImageStudioUploadArchivePageData(
  options: ProductImageStudioArchivePageRequestOptions,
): Promise<readonly ProductImageStudioUploadArchiveItem[]> {
  const body = await requestUploadArchiveJson("/api/product-image-studio/uploads", options);
  if (!isRecord(body) || body["ok"] !== true || !Array.isArray(body["uploads"])) {
    return [];
  }

  return body["uploads"].flatMap((upload) => {
    const parsed = readUploadArchiveItem(upload);
    return parsed ? [parsed] : [];
  });
}

async function requestUploadArchiveJson(
  path: string,
  options: ProductImageStudioArchivePageRequestOptions,
): Promise<unknown> {
  const fetcher = options.fetcher ?? defaultUploadArchiveFetch;
  const response = await fetcher(`${trimTrailingSlash(options.origin)}${path}`, {
    cache: "no-store",
    headers: buildUploadArchiveHeaders(options.cookie),
  });
  return response.ok ? response.json() : null;
}

function defaultUploadArchiveFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, init);
}

function buildUploadArchiveHeaders(cookie?: string): Headers {
  const headers = new Headers({ accept: "application/json" });
  if (cookie && cookie.trim().length > 0) {
    headers.set("cookie", cookie);
  }
  return headers;
}

function readUploadArchiveItem(value: unknown): ProductImageStudioUploadArchiveItem | null {
  if (!isRecord(value) || !isAssetRole(value["role"])) {
    return null;
  }
  if (
    !isString(value["assetId"]) ||
    !isNumber(value["byteSize"]) ||
    !isString(value["contentType"]) ||
    !isString(value["createdAt"]) ||
    !isString(value["designUseUrl"]) ||
    !isString(value["originalFileName"]) ||
    !isString(value["previewUrl"]) ||
    !isString(value["projectId"]) ||
    !isString(value["projectName"]) ||
    !isString(value["storageKey"]) ||
    !isString(value["templateUseUrl"])
  ) {
    return null;
  }

  return {
    assetId: value["assetId"],
    byteSize: value["byteSize"],
    contentType: value["contentType"],
    createdAt: value["createdAt"],
    designUseUrl: value["designUseUrl"],
    originalFileName: value["originalFileName"],
    previewUrl: value["previewUrl"],
    projectId: value["projectId"],
    projectName: value["projectName"],
    role: value["role"],
    storageKey: value["storageKey"],
    templateUseUrl: value["templateUseUrl"],
  };
}

function isAssetRole(value: unknown): value is ProductImageStudioAssetRole {
  return typeof value === "string" && PRODUCT_IMAGE_STUDIO_ASSET_ROLES.some((role) => role === value);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
