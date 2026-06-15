import { randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";
import {
  ProductImageStudioFileStoreError,
  buildStorageKey,
  getExtensionForContentType,
  parseGeneratedImageMimeType,
  parseImageMimeType,
  prepareProductImageAssetForStorage,
  sanitizeOriginalFileName,
  toGeneratedProductImageFileName,
  toRelativeStoragePath,
  toSafePathSegment,
  type ProductImageFileStore,
  type ProductImageStudioImageMimeType,
  type SaveGeneratedProductImageInput,
  type SaveProductImageInput,
  type SavedProductImageFile,
  type StoredProductImageFile,
} from "@/features/product-image-studio/server/fileStore";

export type BlobProductImageFileStoreOptions = {
  readonly createId?: () => string;
  readonly getBlob?: BlobProductImageGet;
  readonly maxBytes: number;
  readonly putBlob?: BlobProductImagePut;
  readonly token?: string;
};

type BlobProductImagePutOptions = {
  readonly access: "public";
  readonly contentType: ProductImageStudioImageMimeType;
  readonly token?: string;
};

type BlobProductImagePutResult = {
  readonly contentType: string;
  readonly pathname: string;
  readonly url: string;
};

type BlobProductImagePut = (
  pathname: string,
  body: Buffer,
  options: BlobProductImagePutOptions,
) => Promise<BlobProductImagePutResult>;

type BlobProductImageGetOptions = {
  readonly access: "public";
  readonly token?: string;
};

type BlobProductImageGet = (
  pathname: string,
  options: BlobProductImageGetOptions,
) => Promise<StoredProductImageFile | null>;

export function createBlobProductImageFileStore(options: BlobProductImageFileStoreOptions): ProductImageFileStore {
  return new BlobProductImageFileStore(options);
}

class BlobProductImageFileStore implements ProductImageFileStore {
  private readonly createId: () => string;
  private readonly getBlob: BlobProductImageGet;
  private readonly maxBytes: number;
  private readonly putBlob: BlobProductImagePut;
  private readonly token?: string;

  constructor(options: BlobProductImageFileStoreOptions) {
    this.createId = options.createId ?? randomUUID;
    this.getBlob = options.getBlob ?? defaultGetBlob;
    this.maxBytes = options.maxBytes;
    this.putBlob = options.putBlob ?? defaultPutBlob;
    if (options.token) {
      this.token = options.token;
    }
  }

  async saveImage(input: SaveProductImageInput): Promise<SavedProductImageFile> {
    const prepared = prepareProductImageAssetForStorage(input.bytes, input.contentType);
    const extension = getExtensionForContentType(prepared.contentType);
    return this.putImage({
      bytes: prepared.bytes,
      contentType: prepared.contentType,
      originalFileName: sanitizeOriginalFileName(input.originalFileName),
      storageKey: buildStorageKey(input.projectId, input.role, `${toSafePathSegment(this.createId())}.${extension}`),
    });
  }

  async saveGeneratedImage(input: SaveGeneratedProductImageInput): Promise<SavedProductImageFile> {
    const contentType = parseGeneratedImageMimeType(input.contentType);
    const fileName = toGeneratedProductImageFileName({ ...input, contentType });
    return this.putImage({
      bytes: input.bytes,
      contentType,
      originalFileName: fileName,
      storageKey: buildStorageKey(input.projectId, "results", input.generationRequestId, fileName),
    });
  }

  async readImage(storageKey: string): Promise<StoredProductImageFile | null> {
    if (!toRelativeStoragePath(storageKey)) {
      return null;
    }
    return this.getBlob(storageKey, this.token ? { access: "public", token: this.token } : { access: "public" });
  }

  private async putImage(input: {
    readonly bytes: Uint8Array;
    readonly contentType: ProductImageStudioImageMimeType;
    readonly originalFileName: string;
    readonly storageKey: string;
  }): Promise<SavedProductImageFile> {
    if (input.bytes.byteLength > this.maxBytes) {
      throw new ProductImageStudioFileStoreError("IMAGE_TOO_LARGE", "이미지 파일이 허용 용량을 넘었습니다.");
    }
    const options: BlobProductImagePutOptions = this.token
      ? { access: "public", contentType: input.contentType, token: this.token }
      : { access: "public", contentType: input.contentType };
    const blob = await this.putBlob(input.storageKey, Buffer.from(input.bytes), options);
    return {
      byteSize: input.bytes.byteLength,
      contentType: parseImageMimeType(blob.contentType),
      originalFileName: input.originalFileName,
      previewUrl: blob.url,
      storageKey: blob.pathname,
    };
  }
}

async function defaultPutBlob(
  pathname: string,
  body: Buffer,
  options: BlobProductImagePutOptions,
): Promise<BlobProductImagePutResult> {
  return put(pathname, body, options);
}

async function defaultGetBlob(
  pathname: string,
  options: BlobProductImageGetOptions,
): Promise<StoredProductImageFile | null> {
  const result = await get(pathname, options);
  if (!result || result.statusCode !== 200) {
    return null;
  }

  return {
    bytes: new Uint8Array(await new Response(result.stream).arrayBuffer()),
    contentType: parseImageMimeType(result.blob.contentType),
  };
}
