import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { ProductImageStudioAssetRole } from "@/features/product-image-studio/domain/types";

export const PRODUCT_IMAGE_STUDIO_ALLOWED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type ProductImageStudioImageMimeType = (typeof PRODUCT_IMAGE_STUDIO_ALLOWED_IMAGE_MIME_TYPES)[number];

export type SaveProductImageInput = {
  readonly bytes: Uint8Array;
  readonly contentType: string;
  readonly originalFileName: string;
  readonly projectId: string;
  readonly role: ProductImageStudioAssetRole;
};

export type SavedProductImageFile = {
  readonly absolutePath: string;
  readonly byteSize: number;
  readonly contentType: ProductImageStudioImageMimeType;
  readonly originalFileName: string;
  readonly previewUrl: string;
  readonly storageKey: string;
};

export interface ProductImageFileStore {
  saveImage(input: SaveProductImageInput): Promise<SavedProductImageFile>;
}

export type LocalProductImageFileStoreOptions = {
  readonly createId?: () => string;
  readonly maxBytes: number;
  readonly publicBasePath: string;
  readonly rootDirectory: string;
};

export type ProductImageStudioFileStoreErrorCode = "UNSUPPORTED_IMAGE_TYPE" | "IMAGE_TOO_LARGE";

export class ProductImageStudioFileStoreError extends Error {
  readonly code: ProductImageStudioFileStoreErrorCode;

  constructor(code: ProductImageStudioFileStoreErrorCode, message: string) {
    super(message);
    this.name = "ProductImageStudioFileStoreError";
    this.code = code;
  }
}

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
    const contentType = parseImageMimeType(input.contentType);
    if (input.bytes.byteLength > this.maxBytes) {
      throw new ProductImageStudioFileStoreError("IMAGE_TOO_LARGE", "이미지 파일이 허용 용량을 넘었습니다.");
    }

    const extension = getExtensionForContentType(contentType);
    const safeProjectId = toSafePathSegment(input.projectId);
    const safeRole = toSafePathSegment(input.role);
    const fileName = `${toSafePathSegment(this.createId())}.${extension}`;
    const absolutePath = join(this.rootDirectory, safeProjectId, safeRole, fileName);
    await mkdir(join(this.rootDirectory, safeProjectId, safeRole), { recursive: true });
    await writeFile(absolutePath, input.bytes);

    return {
      absolutePath,
      byteSize: input.bytes.byteLength,
      contentType,
      originalFileName: sanitizeOriginalFileName(input.originalFileName),
      previewUrl: `${this.publicBasePath}/${safeProjectId}/${safeRole}/${fileName}`,
      storageKey: `product-image-studio/${safeProjectId}/${safeRole}/${fileName}`,
    };
  }
}

function parseImageMimeType(contentType: string): ProductImageStudioImageMimeType {
  switch (contentType) {
    case "image/png":
    case "image/jpeg":
    case "image/webp":
      return contentType;
    default:
      throw new ProductImageStudioFileStoreError("UNSUPPORTED_IMAGE_TYPE", "지원하지 않는 이미지 형식입니다.");
  }
}

function getExtensionForContentType(contentType: ProductImageStudioImageMimeType): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
  }
}

function sanitizeOriginalFileName(originalFileName: string): string {
  const fileName = basename(originalFileName).replaceAll(/[^A-Za-z0-9._-]/g, "-");
  return fileName || "upload";
}

function toSafePathSegment(value: string): string {
  const segment = value.replaceAll(/[^A-Za-z0-9_-]/g, "-");
  return segment || "item";
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
