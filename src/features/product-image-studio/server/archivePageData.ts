import type {
  CardDisplayPose,
  CardFormat,
  ProductImageStudioOutputType,
  ProductImageStudioProductType,
  ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";
import type {
  ProductImageStudioProjectSummary,
  ProductImageStudioResultArchiveItem,
} from "@/lib/persistence/productImageStudioArchiveReadModels";

export type ProductImageStudioArchivePageProject = {
  readonly cardFormat: CardFormat;
  readonly createdAt: string;
  readonly id: string;
  readonly name: string;
  readonly productType: ProductImageStudioProductType;
};

export type ProductImageStudioProjectDetailArchivePageData = {
  readonly project: ProductImageStudioArchivePageProject;
  readonly results: readonly ProductImageStudioResultArchiveItem[];
};

export type ProductImageStudioArchiveFetcher = (url: string, init: RequestInit) => Promise<Response>;

export type ProductImageStudioArchivePageRequestOptions = {
  readonly cookie?: string;
  readonly fetcher?: ProductImageStudioArchiveFetcher;
  readonly origin: string;
};

type ProductImageStudioArchiveHeaderStore = {
  readonly get: (key: string) => string | null;
};

export function createProductImageStudioArchivePageRequestOptions(
  headers: ProductImageStudioArchiveHeaderStore,
): ProductImageStudioArchivePageRequestOptions {
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "127.0.0.1:3000";
  const protocol = headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const cookie = headers.get("cookie");
  return cookie ? { cookie, origin: `${protocol}://${host}` } : { origin: `${protocol}://${host}` };
}

export async function loadProductImageStudioProjectArchivePageData(
  options: ProductImageStudioArchivePageRequestOptions,
): Promise<readonly ProductImageStudioProjectSummary[]> {
  const body = await requestArchiveJson("/api/product-image-studio/projects", options);
  if (!isRecord(body) || body["ok"] !== true || !Array.isArray(body["projects"])) {
    return [];
  }

  return body["projects"].flatMap((project) => {
    const parsed = readProjectSummary(project);
    return parsed ? [parsed] : [];
  });
}

export async function loadProductImageStudioResultArchivePageData(
  options: ProductImageStudioArchivePageRequestOptions,
): Promise<readonly ProductImageStudioResultArchiveItem[]> {
  const body = await requestArchiveJson("/api/product-image-studio/results", options);
  if (!isRecord(body) || body["ok"] !== true || !Array.isArray(body["results"])) {
    return [];
  }

  return readArchiveItems(body["results"]);
}

export async function loadProductImageStudioProjectDetailArchivePageData(
  projectId: string,
  options: ProductImageStudioArchivePageRequestOptions,
): Promise<ProductImageStudioProjectDetailArchivePageData | null> {
  const path = `/api/product-image-studio/projects/${encodeURIComponent(projectId)}/results`;
  const body = await requestArchiveJson(path, options);
  if (!isRecord(body) || body["ok"] !== true) {
    return null;
  }

  const project = readProjectDetail(body["project"]);
  const results = Array.isArray(body["results"]) ? readArchiveItems(body["results"]) : [];
  return project ? { project, results } : null;
}

async function requestArchiveJson(path: string, options: ProductImageStudioArchivePageRequestOptions): Promise<unknown> {
  const fetcher = options.fetcher ?? defaultArchiveFetch;
  const response = await fetcher(`${trimTrailingSlash(options.origin)}${path}`, {
    cache: "no-store",
    headers: buildArchiveHeaders(options.cookie),
  });
  return response.ok ? response.json() : null;
}

function defaultArchiveFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, init);
}

function buildArchiveHeaders(cookie?: string): Headers {
  const headers = new Headers({ accept: "application/json" });
  if (cookie && cookie.trim().length > 0) {
    headers.set("cookie", cookie);
  }
  return headers;
}

function readArchiveItems(values: readonly unknown[]): readonly ProductImageStudioResultArchiveItem[] {
  return values.flatMap((value) => {
    const parsed = readArchiveItem(value);
    return parsed ? [parsed] : [];
  });
}

function readProjectSummary(value: unknown): ProductImageStudioProjectSummary | null {
  if (!isRecord(value) || !isCardFormat(value["cardFormat"]) || !isProductType(value["productType"])) {
    return null;
  }
  if (!isString(value["id"]) || !isString(value["name"]) || !isString(value["createdAt"]) || !isString(value["updatedAt"])) {
    return null;
  }
  if (!isNullableString(value["latestResultAt"]) || !isNumber(value["resultCount"]) || !isString(value["zipDownloadUrl"])) {
    return null;
  }
  return {
    cardFormat: value["cardFormat"],
    createdAt: value["createdAt"],
    id: value["id"],
    latestResultAt: value["latestResultAt"],
    name: value["name"],
    productType: value["productType"],
    resultCount: value["resultCount"],
    updatedAt: value["updatedAt"],
    zipDownloadUrl: value["zipDownloadUrl"],
  };
}

function readProjectDetail(value: unknown): ProductImageStudioArchivePageProject | null {
  if (!isRecord(value) || !isCardFormat(value["cardFormat"]) || !isProductType(value["productType"])) {
    return null;
  }
  if (!isString(value["id"]) || !isString(value["name"]) || !isString(value["createdAt"])) {
    return null;
  }
  return {
    cardFormat: value["cardFormat"],
    createdAt: value["createdAt"],
    id: value["id"],
    name: value["name"],
    productType: value["productType"],
  };
}

function readArchiveItem(value: unknown): ProductImageStudioResultArchiveItem | null {
  if (!isRecord(value) || !isOutputType(value["outputType"]) || !isRatio(value["ratio"])) {
    return null;
  }
  if (!isString(value["createdAt"]) || !isString(value["downloadUrl"]) || !isString(value["generationId"])) {
    return null;
  }
  if (!isNumber(value["height"]) || !isNullableString(value["model"]) || !isString(value["previewUrl"])) {
    return null;
  }
  if (!isString(value["projectId"]) || !isString(value["projectName"]) || !isString(value["projectZipUrl"])) {
    return null;
  }
  if (!isNullableString(value["provider"]) || !isString(value["resultId"]) || !isNumber(value["width"])) {
    return null;
  }
  const base: Omit<ProductImageStudioResultArchiveItem, "cardPose"> = {
    createdAt: value["createdAt"],
    downloadUrl: value["downloadUrl"],
    generationId: value["generationId"],
    height: value["height"],
    model: value["model"],
    outputType: value["outputType"],
    previewUrl: value["previewUrl"],
    projectId: value["projectId"],
    projectName: value["projectName"],
    projectZipUrl: value["projectZipUrl"],
    provider: value["provider"],
    ratio: value["ratio"],
    resultId: value["resultId"],
    width: value["width"],
  };
  const cardPose = value["cardPose"];
  return isCardDisplayPose(cardPose) ? { ...base, cardPose } : base;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCardFormat(value: unknown): value is CardFormat {
  return value === "folded_card" || value === "postcard_flat";
}

function isProductType(value: unknown): value is ProductImageStudioProductType {
  return value === "card_envelope_seal_set";
}

function isOutputType(value: unknown): value is ProductImageStudioOutputType {
  return value === "set_combined" || value === "card_single" || value === "envelope_single" || value === "seal_sticker_single";
}

function isRatio(value: unknown): value is ProductImageStudioRatioPreset {
  return value === "1:1" || value === "4:5" || value === "3:4" || value === "16:9" || value === "custom";
}

function isCardDisplayPose(value: unknown): value is CardDisplayPose {
  return (
    value === "folded_closed" ||
    value === "folded_open_spread" ||
    value === "folded_half_open" ||
    value === "folded_standing" ||
    value === "postcard_front_flat" ||
    value === "postcard_back_flat" ||
    value === "postcard_lifestyle_stack"
  );
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
