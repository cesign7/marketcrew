import { basename } from "node:path";
import type {
  ProductImageStudioOutputType,
  ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";
import {
  getExtensionForContentType,
  type ProductImageStudioGeneratedImageMimeType,
} from "@/features/product-image-studio/server/fileStoreMime";

export type GeneratedProductImageFileNameInput = {
  readonly contentType: ProductImageStudioGeneratedImageMimeType;
  readonly outputType: ProductImageStudioOutputType;
  readonly ratio: ProductImageStudioRatioPreset;
  readonly sequence?: number;
  readonly suffix?: string;
};

export function sanitizeOriginalFileName(originalFileName: string): string {
  const fileName = basename(originalFileName).replaceAll(/[^A-Za-z0-9._-]/g, "-");
  return fileName || "upload";
}

export function toSafePathSegment(value: string): string {
  const segment = value.replaceAll(/[^A-Za-z0-9._-]/g, "-");
  if (segment === "." || segment === "..") {
    return "item";
  }
  return segment || "item";
}

export function buildStorageKey(...segments: readonly string[]): string {
  return ["product-image-studio", ...segments.map(toSafePathSegment)].join("/");
}

export function toRelativeStoragePath(storageKey: string): string | null {
  const prefix = "product-image-studio/";
  if (!storageKey.startsWith(prefix)) {
    return null;
  }

  const relativePath = storageKey.slice(prefix.length);
  const segments = relativePath.split("/");
  if (
    segments.length === 0 ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === ".." || toSafePathSegment(segment) !== segment)
  ) {
    return null;
  }

  return relativePath;
}

export function toGeneratedProductImageFileName(input: GeneratedProductImageFileNameInput): string {
  const suffix = toGeneratedResultSuffix(input.sequence, input.suffix);
  const parts = [toSafePathSegment(input.outputType), suffix, toSafePathSegment(input.ratio.replace(":", "x"))].filter(isString);
  return `${parts.join("-")}.${getExtensionForContentType(input.contentType)}`;
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
