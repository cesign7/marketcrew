import { NextResponse } from "next/server";
import { createDefaultProductImageStudioProductionSettings } from "@/features/product-image-studio/domain/productionSettings";
import { getDefaultProductImageStudioFileStore } from "@/features/product-image-studio/server/assetUploadApi";
import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";
import {
  PRODUCT_IMAGE_STUDIO_PNG_TO_VECTOR_MAX_BYTES,
  convertPngToProductImageStudioVectorSvg,
  type ProductImageStudioPngToVectorSvgErrorCode,
} from "@/features/product-image-studio/server/pngToVectorSvg";
import { parseProductImageStudioVectorSvgStyle } from "@/features/product-image-studio/server/vectorSvg";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";
import type { ProductImageStudioRepository } from "@/lib/persistence/productImageStudioRepository";

export const dynamic = "force-dynamic";

type SvgConversionUploadFile = {
  readonly arrayBuffer: () => Promise<ArrayBuffer>;
  readonly name: string;
  readonly size: number;
  readonly type: string;
};

export async function POST(request: Request) {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

  if (isRequestBodyTooLarge(request)) {
    return svgConversionError("SVG_CONVERSION_FILE_TOO_LARGE", "PNG 파일은 20MB 이하만 SVG로 변환할 수 있습니다.", 400);
  }

  const formData = await readFormData(request);
  if (!formData.ok) {
    return svgConversionError("SVG_CONVERSION_FORM_INVALID", formData.error.message, 400);
  }

  const file = formData.value.get("file");
  if (!isUploadFile(file)) {
    return svgConversionError("SVG_CONVERSION_FILE_REQUIRED", "SVG로 변환할 PNG 파일을 선택해 주세요.", 400);
  }
  if (file.type !== "image/png") {
    return svgConversionError("SVG_CONVERSION_PNG_REQUIRED", "PNG 파일만 SVG로 변환할 수 있습니다.", 400);
  }
  if (file.size === 0) {
    return svgConversionError("SVG_CONVERSION_FILE_EMPTY", "SVG로 변환할 PNG 파일을 선택해 주세요.", 400);
  }
  if (file.size > PRODUCT_IMAGE_STUDIO_PNG_TO_VECTOR_MAX_BYTES) {
    return svgConversionError("SVG_CONVERSION_FILE_TOO_LARGE", "PNG 파일은 20MB 이하만 SVG로 변환할 수 있습니다.", 400);
  }

  const title = readFormString(formData.value.get("title")) ?? file.name;
  const style = parseProductImageStudioVectorSvgStyle(readFormString(formData.value.get("style")));
  const converted = await convertPngToProductImageStudioVectorSvg({
    bytes: new Uint8Array(await file.arrayBuffer()),
    fileName: file.name,
    style,
    title,
  });
  if (!converted.ok) {
    return svgConversionError(converted.error.code, converted.error.message, statusForConversionError(converted.error.code));
  }

  const saved = await saveSvgConversionResult({
    fileName: file.name,
    svgBytes: converted.bytes,
    svgFileName: converted.fileName,
    style,
    title,
    repository: getProductImageStudioProjectRepository(),
  });

  return NextResponse.json({
    data: {
      contentType: converted.contentType,
      archiveDownloadUrl: saved.archiveDownloadUrl,
      downloadUrl: `/api/product-image-studio/projects/${encodeURIComponent(saved.projectId)}/results/${encodeURIComponent(saved.resultId)}/download`,
      fileName: converted.fileName,
      generationId: saved.generationId,
      previewUrl: `/api/product-image-studio/projects/${encodeURIComponent(saved.projectId)}/results/${encodeURIComponent(saved.resultId)}/preview`,
      projectId: saved.projectId,
      resultId: saved.resultId,
      sourceHash: converted.sourceHash,
      storageKey: saved.storageKey,
      svg: new TextDecoder().decode(converted.bytes),
    },
    ok: true,
  });
}

async function saveSvgConversionResult(input: {
  readonly fileName: string;
  readonly repository: ProductImageStudioRepository;
  readonly style: string;
  readonly svgBytes: Uint8Array;
  readonly svgFileName: string;
  readonly title: string;
}): Promise<{
  readonly archiveDownloadUrl: string | null;
  readonly generationId: string;
  readonly projectId: string;
  readonly resultId: string;
  readonly storageKey: string;
}> {
  const project = await input.repository.createProject({
    cardFormat: "postcard_flat",
    name: input.title.trim() || "SVG 변환 결과",
    productType: "card_envelope_seal_set",
    productionSettings: createDefaultProductImageStudioProductionSettings("postcard_flat"),
    qualityMode: "draft",
    ratios: ["1:1"],
    requestedCardPoses: ["postcard_front_flat"],
    requestedOutputs: ["seal_sticker_single"],
  });
  const generation = await input.repository.createGenerationRequest({
    conceptId: "local-png-to-vector-svg",
    projectId: project.id,
    providerRequestSummary: {
      model: "sharp-local-vectorizer",
      promptPreview: input.title.trim() || input.fileName,
      provider: "local",
      sourceFileName: input.fileName,
      style: input.style,
      workflow: "svg_conversion",
    },
    qualityMode: "draft",
    requestedCardPoses: ["postcard_front_flat"],
    requestedOutputs: ["seal_sticker_single"],
  });
  const savedFile = await getDefaultProductImageStudioFileStore().saveGeneratedImage({
    bytes: input.svgBytes,
    contentType: "image/svg+xml",
    generationRequestId: generation.id,
    outputType: "seal_sticker_single",
    projectId: project.id,
    ratio: "1:1",
    suffix: input.style,
  });
  const result = await input.repository.addResult({
    generationRequestId: generation.id,
    height: 1200,
    outputType: "seal_sticker_single",
    projectId: project.id,
    ratio: "1:1",
    storageKey: savedFile.storageKey,
    width: 1200,
  });
  const archiveItem = (await input.repository.listResultArchiveItems(project.id)).find((item) => item.resultId === result.id);
  return {
    archiveDownloadUrl: archiveItem?.downloadUrl ?? null,
    generationId: generation.id,
    projectId: project.id,
    resultId: result.id,
    storageKey: savedFile.storageKey,
  };
}

async function readFormData(
  request: Request,
): Promise<{ readonly ok: true; readonly value: FormData } | { readonly error: { readonly message: string }; readonly ok: false }> {
  try {
    return { ok: true, value: await request.formData() };
  } catch (error) {
    if (error instanceof Error) {
      return { error: { message: "업로드 요청 형식이 올바르지 않습니다." }, ok: false };
    }
    throw error;
  }
}

function isUploadFile(value: unknown): value is SvgConversionUploadFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "size" in value &&
    "type" in value &&
    typeof value.arrayBuffer === "function" &&
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    typeof value.type === "string"
  );
}

function readFormString(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isRequestBodyTooLarge(request: Request): boolean {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return false;
  }
  const parsed = Number.parseInt(contentLength, 10);
  return Number.isSafeInteger(parsed) && parsed > PRODUCT_IMAGE_STUDIO_PNG_TO_VECTOR_MAX_BYTES + 4096;
}

function statusForConversionError(code: ProductImageStudioPngToVectorSvgErrorCode): number {
  switch (code) {
    case "SVG_CONVERSION_FILE_EMPTY":
    case "SVG_CONVERSION_FILE_TOO_LARGE":
    case "SVG_CONVERSION_PNG_MALFORMED":
      return 400;
    case "SVG_CONVERSION_UNSAFE":
      return 422;
  }
}

function svgConversionError(code: string, message: string, status: number): Response {
  return NextResponse.json({ error: { code, message }, ok: false }, { status });
}
