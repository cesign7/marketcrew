import { join } from "node:path";
import { tmpdir } from "node:os";
import { getAssetRolesForCardFormat } from "@/features/product-image-studio/domain/outputContracts";
import {
  PRODUCT_IMAGE_STUDIO_ASSET_ROLES,
  type ProductImageStudioAssetRole,
} from "@/features/product-image-studio/domain/types";
import { createBlobProductImageFileStore } from "@/features/product-image-studio/server/blobFileStore";
import {
  ProductImageStudioFileStoreError,
  createLocalProductImageFileStore,
  type ProductImageFileStore,
} from "@/features/product-image-studio/server/fileStore";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";
import type {
  ProductImageStudioAssetRecord,
  ProductImageStudioProjectRecord,
  ProductImageStudioRepository,
} from "@/lib/persistence/productImageStudioRepository";

export type ProductImageStudioUploadedAsset = ProductImageStudioAssetRecord & {
  readonly previewUrl: string;
};

export type ProductImageStudioAssetUploadError = {
  readonly code: string;
  readonly message: string;
  readonly status: number;
};

export type ProductImageStudioAssetUploadResult =
  | {
      readonly asset: ProductImageStudioUploadedAsset;
      readonly ok: true;
    }
  | {
      readonly error: ProductImageStudioAssetUploadError;
      readonly ok: false;
    };

export type ProductImageStudioAssetUploadInput = {
  readonly fileStore?: ProductImageFileStore;
  readonly formData: FormData;
  readonly projectId: string;
  readonly repository?: ProductImageStudioRepository;
};

const DEFAULT_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
const DEFAULT_ASSET_ROOT_DIRECTORY = join(tmpdir(), "marketcrew-product-image-studio-assets");
let defaultFileStore: ProductImageFileStore | null = null;

export async function uploadProductImageStudioAssetFromFormData(
  input: ProductImageStudioAssetUploadInput,
): Promise<ProductImageStudioAssetUploadResult> {
  const repository = input.repository ?? getProductImageStudioProjectRepository();
  const project = await repository.getProject(input.projectId);
  if (!project) {
    return uploadError("PROJECT_NOT_FOUND", "프로젝트를 찾지 못했습니다.", 404);
  }

  const role = parseAssetRole(input.formData.get("role"));
  if (!role) {
    return uploadError("INVALID_ASSET_ROLE", "업로드할 디자인 위치를 선택해 주세요.", 400);
  }

  if (!isAssetRoleAllowedForProject(project, role)) {
    return uploadError("ASSET_ROLE_NOT_ALLOWED", "선택한 카드 형식에 맞지 않는 디자인 위치입니다.", 400);
  }

  const file = input.formData.get("file");
  if (!isUploadFile(file)) {
    return uploadError("IMAGE_FILE_REQUIRED", "업로드할 이미지 파일을 선택해 주세요.", 400);
  }

  try {
    const savedFile = await (input.fileStore ?? getDefaultProductImageStudioFileStore()).saveImage({
      bytes: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type,
      originalFileName: file.name,
      projectId: project.id,
      role,
    });
    const asset = await repository.addAsset({
      byteSize: savedFile.byteSize,
      contentType: savedFile.contentType,
      originalFileName: savedFile.originalFileName,
      projectId: project.id,
      role,
      storageKey: savedFile.storageKey,
    });

    return { asset: { ...asset, previewUrl: savedFile.previewUrl }, ok: true };
  } catch (error) {
    if (error instanceof ProductImageStudioFileStoreError) {
      return uploadError(error.code, error.message, 400);
    }
    throw error;
  }
}

export function getDefaultProductImageStudioFileStore(): ProductImageFileStore {
  if (!defaultFileStore) {
    const maxBytes = parsePositiveInteger(process.env.PRODUCT_IMAGE_STUDIO_MAX_UPLOAD_BYTES, DEFAULT_UPLOAD_MAX_BYTES);
    defaultFileStore = process.env.BLOB_READ_WRITE_TOKEN
      ? createBlobProductImageFileStore({
          maxBytes,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        })
      : createLocalProductImageFileStore({
          maxBytes,
          publicBasePath: process.env.PRODUCT_IMAGE_STUDIO_ASSET_PUBLIC_BASE_PATH ?? "/studio-assets",
          rootDirectory: process.env.PRODUCT_IMAGE_STUDIO_ASSET_ROOT ?? DEFAULT_ASSET_ROOT_DIRECTORY,
        });
  }

  return defaultFileStore;
}

function parseAssetRole(value: unknown): ProductImageStudioAssetRole | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const role of PRODUCT_IMAGE_STUDIO_ASSET_ROLES) {
    if (role === value) {
      return role;
    }
  }

  return null;
}

function isAssetRoleAllowedForProject(
  project: ProductImageStudioProjectRecord,
  role: ProductImageStudioAssetRole,
): boolean {
  const contract = getAssetRolesForCardFormat(project.cardFormat);
  return hasRole(contract.required, role) || hasRole(contract.optional, role);
}

function hasRole(roles: readonly ProductImageStudioAssetRole[], role: ProductImageStudioAssetRole): boolean {
  return roles.some((candidate) => candidate === role);
}

type UploadFile = {
  readonly arrayBuffer: () => Promise<ArrayBuffer>;
  readonly name: string;
  readonly type: string;
};

function isUploadFile(value: unknown): value is UploadFile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value["arrayBuffer"] === "function" &&
    typeof value["name"] === "string" &&
    typeof value["type"] === "string"
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function uploadError(code: string, message: string, status: number): ProductImageStudioAssetUploadResult {
  return { error: { code, message, status }, ok: false };
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
