import { Buffer } from "node:buffer";
import type {
  ProductImageStudioOutputType,
  ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";
import { createStoredZipArchive, type ProductImageStudioZipEntry } from "@/features/product-image-studio/server/zipArchive";
import {
  getExtensionForContentType,
  parseImageMimeTypeFromStorageKey,
  type ProductImageFileStore,
  type ProductImageStudioImageMimeType,
} from "@/features/product-image-studio/server/fileStore";
import type {
  ProductImageStudioProjectRecord,
  ProductImageStudioRepository,
  ProductImageStudioResultRecord,
} from "@/lib/persistence/productImageStudioRepository";

export type ProductImageStudioImageDimensions = {
  readonly height: number;
  readonly width: number;
};

export type ProductImageStudioDownloadItem = {
  readonly cardPose?: string;
  readonly contentType: ProductImageStudioImageMimeType;
  readonly downloadUrl: string;
  readonly fileName: string;
  readonly height: number;
  readonly outputType: ProductImageStudioOutputType;
  readonly ratio: ProductImageStudioRatioPreset;
  readonly resultId: string;
  readonly storageKey: string;
  readonly width: number;
};

export type ProductImageStudioDownloadManifest = {
  readonly files: readonly ProductImageStudioDownloadItem[];
  readonly projectId: string;
  readonly projectName: string;
};

export type ProductImageStudioZipArchive = {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly manifest: ProductImageStudioDownloadManifest;
};

export type ProductImageStudioCustomRatioResult =
  | {
      readonly dimensions: ProductImageStudioImageDimensions;
      readonly ok: true;
    }
  | {
      readonly error: { readonly code: "CUSTOM_RATIO_SIZE_INVALID"; readonly message: string };
      readonly ok: false;
    };

export type RegenerateProductImageStudioRatioInput = {
  readonly customDimensions?: ProductImageStudioImageDimensions;
  readonly projectId: string;
  readonly ratio: ProductImageStudioRatioPreset;
  readonly repository: ProductImageStudioRepository;
  readonly sourceResultId: string;
};

export function toProductImageStudioDownloadItems(
  project: ProductImageStudioProjectRecord,
  results: readonly ProductImageStudioResultRecord[],
): readonly ProductImageStudioDownloadItem[] {
  return results.map((result) => ({
    cardPose: result.cardPose,
    contentType: parseImageMimeTypeFromStorageKey(result.storageKey),
    downloadUrl: `/api/product-image-studio/projects/${encodeURIComponent(project.id)}/results/${encodeURIComponent(result.id)}/download`,
    fileName: toResultFileName(project.id, result),
    height: result.height,
    outputType: result.outputType,
    ratio: result.ratio,
    resultId: result.id,
    storageKey: result.storageKey,
    width: result.width,
  }));
}

export function buildProductImageStudioDownloadManifest(
  project: ProductImageStudioProjectRecord,
  results: readonly ProductImageStudioResultRecord[],
): ProductImageStudioDownloadManifest {
  return {
    files: toProductImageStudioDownloadItems(project, results),
    projectId: project.id,
    projectName: project.name,
  };
}

export function createProductImageStudioZipArchive(
  project: ProductImageStudioProjectRecord,
  results: readonly ProductImageStudioResultRecord[],
): ProductImageStudioZipArchive {
  const manifest = buildProductImageStudioDownloadManifest(project, results);
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
  const entries: readonly ProductImageStudioZipEntry[] = [
    { bytes: manifestBytes, path: "manifest.json" },
    ...manifest.files.map((file) => ({
      bytes: Buffer.from(`storageKey=${file.storageKey}\noutputType=${file.outputType}\n`, "utf8"),
      path: `files/${file.fileName}`,
    })),
  ];

  return {
    bytes: createStoredZipArchive(entries),
    fileName: `${sanitizeFileSegment(project.id)}-product-image-studio.zip`,
    manifest,
  };
}

export async function createProductImageStudioZipArchiveFromStore(
  project: ProductImageStudioProjectRecord,
  results: readonly ProductImageStudioResultRecord[],
  fileStore: ProductImageFileStore,
): Promise<ProductImageStudioZipArchive> {
  const manifest = buildProductImageStudioDownloadManifest(project, results);
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
  const imageEntries = await Promise.all(
    manifest.files.map(async (file) => {
      const storedImage = await fileStore.readImage(file.storageKey);
      if (!storedImage) {
        throw new ProductImageStudioDownloadError("RESULT_FILE_NOT_FOUND", "생성 이미지 파일을 찾지 못했습니다.");
      }
      return {
        bytes: storedImage.bytes,
        path: `files/${file.fileName}`,
      };
    }),
  );
  return {
    bytes: createStoredZipArchive([{ bytes: manifestBytes, path: "manifest.json" }, ...imageEntries]),
    fileName: `${sanitizeFileSegment(project.id)}-product-image-studio.zip`,
    manifest,
  };
}

export function parseProductImageStudioCustomRatio(input: ProductImageStudioImageDimensions): ProductImageStudioCustomRatioResult {
  if (!isValidDimension(input.width) || !isValidDimension(input.height)) {
    return {
      error: {
        code: "CUSTOM_RATIO_SIZE_INVALID",
        message: "사용자 지정 비율은 64px 이상 4096px 이하의 정수 크기여야 합니다.",
      },
      ok: false,
    };
  }

  return { dimensions: input, ok: true };
}

export async function regenerateProductImageStudioRatio(
  input: RegenerateProductImageStudioRatioInput,
): Promise<ProductImageStudioResultRecord> {
  const source = (await input.repository.listResults(input.projectId)).find((result) => result.id === input.sourceResultId);
  if (!source) {
    throw new ProductImageStudioDownloadError("RESULT_NOT_FOUND", "기준 이미지를 찾지 못했습니다.");
  }

  const dimensions = getProductImageStudioDimensionsForRatio(input.ratio, input.customDimensions);
  return input.repository.addResult({
    cardPose: source.cardPose,
    generationRequestId: source.generationRequestId,
    height: dimensions.height,
    outputType: source.outputType,
    projectId: source.projectId,
    ratio: input.ratio,
    storageKey: toRegeneratedStorageKey(source, input.ratio, dimensions),
    width: dimensions.width,
  });
}

export function getProductImageStudioDimensionsForRatio(
  ratio: ProductImageStudioRatioPreset,
  customDimensions?: ProductImageStudioImageDimensions,
): ProductImageStudioImageDimensions {
  switch (ratio) {
    case "1:1":
      return { height: 1200, width: 1200 };
    case "4:5":
      return { height: 1500, width: 1200 };
    case "3:4":
      return { height: 1600, width: 1200 };
    case "16:9":
      return { height: 900, width: 1600 };
    case "custom": {
      const parsed = customDimensions ? parseProductImageStudioCustomRatio(customDimensions) : null;
      if (parsed?.ok) {
        return parsed.dimensions;
      }
      throw new ProductImageStudioDownloadError("CUSTOM_RATIO_SIZE_INVALID", "사용자 지정 비율 크기를 확인해 주세요.");
    }
  }
}

export class ProductImageStudioDownloadError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ProductImageStudioDownloadError";
    this.code = code;
  }
}

function toResultFileName(projectId: string, result: ProductImageStudioResultRecord): string {
  const stem = [
    sanitizeFileSegment(projectId),
    result.outputType,
    result.cardPose ? sanitizeFileSegment(result.cardPose) : null,
    toRatioSegment(result.ratio),
  ]
    .filter((segment) => typeof segment === "string" && segment.length > 0)
    .join("-");
  return `${stem}.${getExtensionForContentType(parseImageMimeTypeFromStorageKey(result.storageKey))}`;
}

function toRegeneratedStorageKey(
  source: ProductImageStudioResultRecord,
  ratio: ProductImageStudioRatioPreset,
  dimensions: ProductImageStudioImageDimensions,
): string {
  const base = source.storageKey.replace(/\.[A-Za-z0-9]+$/, "");
  return `${base}-${toRatioSegment(ratio)}-${dimensions.width}x${dimensions.height}.png`;
}

function toRatioSegment(ratio: ProductImageStudioRatioPreset): string {
  return ratio.replace(":", "x");
}

function sanitizeFileSegment(value: string): string {
  const segment = value.replaceAll(/[^A-Za-z0-9_-]/g, "-").replaceAll(/-+/g, "-").replace(/^-|-$/g, "");
  return segment || "item";
}

function isValidDimension(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 64 && value <= 4096;
}
