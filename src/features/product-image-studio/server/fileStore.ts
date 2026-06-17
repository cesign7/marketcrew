import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  ProductImageStudioAssetRole,
  ProductImageStudioOutputType,
  ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";
import { PRODUCT_IMAGE_STUDIO_SVG_MIME_TYPE } from "@/features/product-image-studio/server/svgAssetSanitizer";
import {
  getExtensionForContentType,
  parseGeneratedImageMimeType,
  parseImageMimeTypeFromStorageKey,
  prepareProductImageAssetForStorage,
  type ProductImageStudioGeneratedImageMimeType,
  type ProductImageStudioImageMimeType,
} from "@/features/product-image-studio/server/fileStoreMime";
import { ProductImageStudioFileStoreError } from "@/features/product-image-studio/server/fileStoreErrors";
import {
  buildStorageKey,
  sanitizeOriginalFileName,
  toGeneratedProductImageFileName,
  toRelativeStoragePath,
  toSafePathSegment,
} from "@/features/product-image-studio/server/fileStorePaths";

export {
  PRODUCT_IMAGE_STUDIO_ALLOWED_IMAGE_MIME_TYPES,
  PRODUCT_IMAGE_STUDIO_GENERATED_IMAGE_MIME_TYPES,
  getExtensionForContentType,
  parseGeneratedImageMimeType,
  parseImageMimeType,
  parseImageMimeTypeFromStorageKey,
  prepareProductImageAssetForStorage,
  type ProductImageStudioGeneratedImageMimeType,
  type ProductImageStudioImageMimeType,
} from "@/features/product-image-studio/server/fileStoreMime";
export {
  buildStorageKey,
  sanitizeOriginalFileName,
  toGeneratedProductImageFileName,
  toRelativeStoragePath,
  toSafePathSegment,
} from "@/features/product-image-studio/server/fileStorePaths";
export {
  ProductImageStudioFileStoreError,
  type ProductImageStudioFileStoreErrorCode,
} from "@/features/product-image-studio/server/fileStoreErrors";

export type SaveProductImageInput = {
  readonly bytes: Uint8Array;
  readonly contentType: string;
  readonly originalFileName: string;
  readonly projectId: string;
  readonly role: ProductImageStudioAssetRole;
};

export type ProductImageStudioGeneratedArtifactMimeType =
  | ProductImageStudioGeneratedImageMimeType
  | typeof PRODUCT_IMAGE_STUDIO_SVG_MIME_TYPE;

export type SaveGeneratedProductImageInput = {
  readonly bytes: Uint8Array;
  readonly contentType: ProductImageStudioGeneratedArtifactMimeType;
  readonly generationRequestId: string;
  readonly outputType: ProductImageStudioOutputType;
  readonly projectId: string;
  readonly ratio: ProductImageStudioRatioPreset;
  readonly sequence?: number;
  readonly suffix?: string;
};

export type SavedProductImageFile = {
  readonly absolutePath?: string;
  readonly byteSize: number;
  readonly contentType: ProductImageStudioImageMimeType;
  readonly originalFileName: string;
  readonly previewUrl: string;
  readonly storageKey: string;
};

export type StoredProductImageFile = {
  readonly bytes: Uint8Array;
  readonly contentType: ProductImageStudioImageMimeType;
};

export interface ProductImageFileStore {
  saveImage(input: SaveProductImageInput): Promise<SavedProductImageFile>;
  saveGeneratedImage(input: SaveGeneratedProductImageInput): Promise<SavedProductImageFile>;
  readImage(storageKey: string): Promise<StoredProductImageFile | null>;
}

export function parseGeneratedProductImageArtifactMimeType(
  contentType: ProductImageStudioGeneratedArtifactMimeType,
): ProductImageStudioImageMimeType {
  return contentType === PRODUCT_IMAGE_STUDIO_SVG_MIME_TYPE ? contentType : parseGeneratedImageMimeType(contentType);
}

export function toGeneratedProductImageArtifactFileName(input: {
  readonly contentType: ProductImageStudioImageMimeType;
  readonly outputType: ProductImageStudioOutputType;
  readonly ratio: ProductImageStudioRatioPreset;
  readonly sequence?: number;
  readonly suffix?: string;
}): string {
  const suffix = toGeneratedResultSuffix(input.sequence, input.suffix);
  const parts = [toSafePathSegment(input.outputType), suffix, toSafePathSegment(input.ratio.replace(":", "x"))].filter(isString);
  return `${parts.join("-")}.${getExtensionForContentType(input.contentType)}`;
}

export type LocalProductImageFileStoreOptions = {
  readonly createId?: () => string;
  readonly maxBytes: number;
  readonly publicBasePath: string;
  readonly rootDirectory: string;
};

export function createLocalProductImageFileStore(options: LocalProductImageFileStoreOptions): ProductImageFileStore {
  return new LocalProductImageFileStore(options);
}

export type ProductImageStudioFixtureImage = {
  readonly absolutePath: string;
  readonly fileName: string;
};

const FIXTURE_IMAGE_DEFINITIONS = [
  {
    fileName: "card-front.png",
    base64:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  },
  {
    fileName: "envelope-front.png",
    base64:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN49+4dAAUyAq5VfYjOAAAAAElFTkSuQmCC",
  },
  {
    fileName: "seal-sticker.png",
    base64:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNkaGgAAAQAAht6b5kAAAAASUVORK5CYII=",
  },
] as const;

export async function createProductImageStudioFixtureImages(
  rootDirectory: string,
): Promise<readonly ProductImageStudioFixtureImage[]> {
  await mkdir(rootDirectory, { recursive: true });
  const fixtures = await Promise.all(
    FIXTURE_IMAGE_DEFINITIONS.map(async (fixture) => {
      const absolutePath = join(rootDirectory, fixture.fileName);
      await writeFile(absolutePath, Buffer.from(fixture.base64, "base64"));
      return { absolutePath, fileName: fixture.fileName };
    }),
  );

  return fixtures;
}

class LocalProductImageFileStore implements ProductImageFileStore {
  private readonly createId: () => string;
  private readonly maxBytes: number;
  private readonly publicBasePath: string;
  private readonly rootDirectory: string;

  constructor(options: LocalProductImageFileStoreOptions) {
    this.createId = options.createId ?? randomUUID;
    this.maxBytes = options.maxBytes;
    this.publicBasePath = trimTrailingSlash(options.publicBasePath);
    this.rootDirectory = options.rootDirectory;
  }

  async saveImage(input: SaveProductImageInput): Promise<SavedProductImageFile> {
    const prepared = prepareProductImageAssetForStorage(input.bytes, input.contentType);
    if (prepared.bytes.byteLength > this.maxBytes) {
      throw new ProductImageStudioFileStoreError("IMAGE_TOO_LARGE", "이미지 파일이 허용 용량을 넘었습니다.");
    }

    const extension = getExtensionForContentType(prepared.contentType);
    const safeProjectId = toSafePathSegment(input.projectId);
    const safeRole = toSafePathSegment(input.role);
    const fileName = `${toSafePathSegment(this.createId())}.${extension}`;
    return this.writeImage({
      bytes: prepared.bytes,
      contentType: prepared.contentType,
      originalFileName: sanitizeOriginalFileName(input.originalFileName),
      storageKey: buildStorageKey(safeProjectId, safeRole, fileName),
    });
  }

  async saveGeneratedImage(input: SaveGeneratedProductImageInput): Promise<SavedProductImageFile> {
    const contentType = parseGeneratedProductImageArtifactMimeType(input.contentType);
    const safeProjectId = toSafePathSegment(input.projectId);
    const safeGenerationId = toSafePathSegment(input.generationRequestId);
    const fileName = toGeneratedProductImageArtifactFileName({ ...input, contentType });
    return this.writeImage({
      bytes: input.bytes,
      contentType,
      originalFileName: fileName,
      storageKey: buildStorageKey(safeProjectId, "results", safeGenerationId, fileName),
    });
  }

  async readImage(storageKey: string): Promise<StoredProductImageFile | null> {
    const relativePath = toRelativeStoragePath(storageKey);
    if (!relativePath) {
      return null;
    }

    try {
      return {
        bytes: await readFile(join(this.rootDirectory, relativePath)),
        contentType: parseImageMimeTypeFromStorageKey(storageKey),
      };
    } catch (error) {
      if (isNodeErrorCode(error, "ENOENT")) {
        return null;
      }
      throw error;
    }
  }

  private async writeImage(input: {
    readonly bytes: Uint8Array;
    readonly contentType: ProductImageStudioImageMimeType;
    readonly originalFileName: string;
    readonly storageKey: string;
  }): Promise<SavedProductImageFile> {
    const relativePath = toRelativeStoragePath(input.storageKey);
    if (!relativePath) {
      throw new ProductImageStudioFileStoreError("UNSUPPORTED_IMAGE_TYPE", "이미지 저장 경로가 올바르지 않습니다.");
    }
    const absolutePath = join(this.rootDirectory, relativePath);
    await mkdir(join(absolutePath, ".."), { recursive: true });
    await writeFile(absolutePath, input.bytes);

    return {
      absolutePath,
      byteSize: input.bytes.byteLength,
      contentType: input.contentType,
      originalFileName: input.originalFileName,
      previewUrl: `${this.publicBasePath}/${relativePath}`,
      storageKey: input.storageKey,
    };
  }
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function toGeneratedResultSuffix(sequence: number | undefined, suffix: string | undefined): string | null {
  if (typeof sequence === "number" && Number.isSafeInteger(sequence) && sequence > 0) {
    return String(sequence);
  }
  if (suffix && suffix.trim().length > 0) {
    return toSafePathSegment(suffix);
  }
  return null;
}

function isString(value: string | null): value is string {
  return value !== null;
}
