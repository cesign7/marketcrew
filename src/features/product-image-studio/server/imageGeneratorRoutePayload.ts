import {
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_SVG_REFERENCE_MIME_TYPE,
  parseProductImageStudioImageGeneratorPayloadJson,
  parseProductImageStudioImageGeneratorReferenceImages,
  type ProductImageStudioImageGeneratorPayload,
  type ProductImageStudioImageGeneratorReferenceMimeType,
} from "@/features/product-image-studio/domain/imageGenerator";
import { sanitizeProductImageStudioSvgAsset } from "@/features/product-image-studio/server/svgAssetSanitizer";
import {
  ProductImageStudioSvgRasterizationError,
  rasterizeSanitizedSvgToPng,
  type RasterizedProductImageStudioSvgAsset,
} from "@/features/product-image-studio/server/svgAssetRasterizer";

export type ProductImageStudioImageGeneratorRouteError = {
  readonly code: string;
  readonly message: string;
};

export type ProductImageStudioImageGeneratorPreparedReference = {
  readonly originalBytes: Uint8Array;
  readonly originalFileName: string;
  readonly providerBytes: Uint8Array;
  readonly providerContentType: "image/jpeg" | "image/png" | "image/webp";
  readonly providerFileName: string;
  readonly storageContentType: ProductImageStudioImageGeneratorReferenceMimeType;
};

export type ProductImageStudioImageGeneratorParsedRequest = {
  readonly payload: ProductImageStudioImageGeneratorPayload;
  readonly references: readonly ProductImageStudioImageGeneratorPreparedReference[];
};

export type ProductImageStudioImageGeneratorRoutePayloadResult =
  | {
      readonly ok: true;
      readonly request: ProductImageStudioImageGeneratorParsedRequest;
    }
  | {
      readonly error: ProductImageStudioImageGeneratorRouteError;
      readonly ok: false;
    };

export type ProductImageStudioImageGeneratorRoutePayloadOptions = {
  readonly maxReferenceBytes?: number;
  readonly rasterizeSvg?: (bytes: Uint8Array) => Promise<RasterizedProductImageStudioSvgAsset>;
};

type MultipartImageFile = File;

type PreparedReferencesResult =
  | { readonly ok: true; readonly references: readonly ProductImageStudioImageGeneratorPreparedReference[] }
  | { readonly error: ProductImageStudioImageGeneratorRouteError; readonly ok: false };

type PreparedSvgReferenceResult =
  | { readonly ok: true; readonly reference: ProductImageStudioImageGeneratorPreparedReference }
  | { readonly error: ProductImageStudioImageGeneratorRouteError; readonly ok: false };

const DEFAULT_MAX_REFERENCE_BYTES = 20 * 1024 * 1024;

export async function parseProductImageStudioImageGeneratorMultipartRequest(
  request: Request,
  options: ProductImageStudioImageGeneratorRoutePayloadOptions = {},
): Promise<ProductImageStudioImageGeneratorRoutePayloadResult> {
  const formData = await readFormData(request);
  if (!formData) {
    return routeError("MALFORMED_MULTIPART", "이미지 생성 요청 형식이 올바르지 않습니다.");
  }

  return parseProductImageStudioImageGeneratorFormData(formData, options);
}

export async function parseProductImageStudioImageGeneratorFormData(
  formData: FormData,
  options: ProductImageStudioImageGeneratorRoutePayloadOptions = {},
): Promise<ProductImageStudioImageGeneratorRoutePayloadResult> {
  const payloadField = formData.get("payload");
  if (typeof payloadField !== "string") {
    return routeError("PAYLOAD_REQUIRED", "생성 요청 내용을 확인해 주세요.");
  }

  const payloadResult = parseProductImageStudioImageGeneratorPayloadJson(payloadField);
  if (!payloadResult.ok) {
    return { error: payloadResult.error, ok: false };
  }

  const filesResult = parseReferenceFiles(formData.getAll("referenceImages"), options.maxReferenceBytes ?? DEFAULT_MAX_REFERENCE_BYTES);
  if (!filesResult.ok) {
    return filesResult;
  }

  const referenceResult = parseProductImageStudioImageGeneratorReferenceImages(
    filesResult.files.map((file) => ({ mimeType: file.type })),
  );
  if (!referenceResult.ok) {
    return { error: referenceResult.error, ok: false };
  }

  const preparedReferences = await prepareReferenceFiles(filesResult.files, referenceResult.references, options);
  if (!preparedReferences.ok) {
    return preparedReferences;
  }

  return {
    ok: true,
    request: {
      payload: payloadResult.payload,
      references: preparedReferences.references,
    },
  };
}

function parseReferenceFiles(
  values: readonly FormDataEntryValue[],
  maxReferenceBytes: number,
):
  | { readonly files: readonly MultipartImageFile[]; readonly ok: true }
  | { readonly error: ProductImageStudioImageGeneratorRouteError; readonly ok: false } {
  const files: MultipartImageFile[] = [];
  for (const value of values) {
    if (!isMultipartImageFile(value)) {
      return routeError("REFERENCE_IMAGE_FILE_INVALID", "참고 이미지 파일을 다시 선택해 주세요.");
    }
    if (value.size > maxReferenceBytes) {
      return routeError("REFERENCE_IMAGE_TOO_LARGE", "참고 이미지 파일이 허용 용량을 넘었습니다.");
    }
    files.push(value);
  }
  return { files, ok: true };
}

async function prepareReferenceFiles(
  files: readonly MultipartImageFile[],
  references: readonly { readonly mimeType: ProductImageStudioImageGeneratorReferenceMimeType; readonly sanitizerRequired: boolean }[],
  options: ProductImageStudioImageGeneratorRoutePayloadOptions,
): Promise<PreparedReferencesResult> {
  const prepared: ProductImageStudioImageGeneratorPreparedReference[] = [];
  for (const [index, file] of files.entries()) {
    const reference = references[index];
    if (!reference) {
      return routeError("REFERENCE_IMAGE_FILE_INVALID", "참고 이미지 파일을 다시 선택해 주세요.");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (reference.sanitizerRequired) {
      const svg = await prepareSvgReference(file.name, bytes, options.rasterizeSvg ?? rasterizeSanitizedSvgToPng);
      if (!svg.ok) {
        return svg;
      }
      prepared.push(svg.reference);
    } else {
      prepared.push({
        originalBytes: bytes,
        originalFileName: safeOriginalName(file.name),
        providerBytes: bytes,
        providerContentType: toProviderRasterContentType(reference.mimeType),
        providerFileName: safeOriginalName(file.name),
        storageContentType: reference.mimeType,
      });
    }
  }
  return { ok: true, references: prepared };
}

async function prepareSvgReference(
  fileName: string,
  bytes: Uint8Array,
  rasterizeSvg: (bytes: Uint8Array) => Promise<RasterizedProductImageStudioSvgAsset>,
): Promise<PreparedSvgReferenceResult> {
  const sanitized = sanitizeProductImageStudioSvgAsset(bytes);
  if (!sanitized.ok) {
    return { error: sanitized.error, ok: false };
  }

  try {
    const rasterized = await rasterizeSvg(sanitized.bytes);
    return {
      ok: true,
      reference: {
        originalBytes: sanitized.bytes,
        originalFileName: safeOriginalName(fileName),
        providerBytes: rasterized.bytes,
        providerContentType: "image/png",
        providerFileName: toProviderPngFileName(fileName),
        storageContentType: PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_SVG_REFERENCE_MIME_TYPE,
      },
    };
  } catch (error) {
    if (error instanceof ProductImageStudioSvgRasterizationError || error instanceof Error) {
      return routeError("SVG_RASTERIZATION_FAILED", "SVG를 provider용 PNG로 변환하지 못했습니다.");
    }
    throw error;
  }
}

async function readFormData(request: Request): Promise<FormData | null> {
  try {
    return await request.formData();
  } catch (error) {
    if (error instanceof TypeError) {
      return null;
    }
    throw error;
  }
}

function isMultipartImageFile(value: FormDataEntryValue): value is MultipartImageFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function" &&
    "name" in value &&
    typeof value.name === "string" &&
    "size" in value &&
    typeof value.size === "number" &&
    "type" in value &&
    typeof value.type === "string"
  );
}

function toProviderRasterContentType(
  mimeType: ProductImageStudioImageGeneratorReferenceMimeType,
): "image/jpeg" | "image/png" | "image/webp" {
  switch (mimeType) {
    case "image/png":
    case "image/jpeg":
    case "image/webp":
      return mimeType;
    case "image/svg+xml":
      return "image/png";
  }
}

function safeOriginalName(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "reference-image";
}

function toProviderPngFileName(fileName: string): string {
  return `${safeOriginalName(fileName).replace(/\.[A-Za-z0-9]+$/, "")}.png`;
}

function routeError(
  code: string,
  message: string,
): { readonly error: ProductImageStudioImageGeneratorRouteError; readonly ok: false } {
  return { error: { code, message }, ok: false };
}
