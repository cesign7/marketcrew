import { NextResponse } from "next/server";
import {
  parseProductImageStudioCustomRatio,
  ProductImageStudioDownloadError,
  regenerateProductImageStudioRatio,
} from "@/features/product-image-studio/server/downloads";
import { PRODUCT_IMAGE_STUDIO_RATIO_PRESETS, type ProductImageStudioRatioPreset } from "@/features/product-image-studio/domain/types";
import { toProductImageStudioResultPreviewResponse } from "@/features/product-image-studio/server/generationResultPreview";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";

type ProductImageStudioRegenerateRatioRouteContext = {
  readonly params: Promise<{ readonly id: string; readonly resultId: string }>;
};

type ParsedRegenerateRatioPayload = {
  readonly customDimensions?: { readonly height: number; readonly width: number };
  readonly ratio: ProductImageStudioRatioPreset;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: ProductImageStudioRegenerateRatioRouteContext) {
  const { id, resultId } = await context.params;
  const projectId = normalizeRouteParam(id);
  const sourceResultId = normalizeRouteParam(resultId);
  const repository = getProductImageStudioProjectRepository();
  const project = await repository.getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: { code: "PROJECT_NOT_FOUND", message: "프로젝트를 찾지 못했습니다." }, ok: false }, { status: 404 });
  }

  const parsed = parsePayload(await readJsonPayload(request));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, ok: false }, { status: 400 });
  }

  try {
    const result = await regenerateProductImageStudioRatio({
      customDimensions: parsed.payload.customDimensions,
      projectId: project.id,
      ratio: parsed.payload.ratio,
      repository,
      sourceResultId,
    });
    return NextResponse.json({
      data: {
        generation: {
          id: result.generationRequestId,
          status: "ready",
        },
        results: [toProductImageStudioResultPreviewResponse(project.id, result)],
      },
      ok: true,
    });
  } catch (error) {
    if (error instanceof ProductImageStudioDownloadError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message }, ok: false },
        { status: error.code === "RESULT_NOT_FOUND" ? 404 : 400 },
      );
    }
    throw error;
  }
}

async function readJsonPayload(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof Error) {
      return null;
    }
    throw error;
  }
}

function parsePayload(payload: unknown):
  | {
      readonly ok: true;
      readonly payload: ParsedRegenerateRatioPayload;
    }
  | {
      readonly error: { readonly code: string; readonly message: string };
      readonly ok: false;
    } {
  if (!isRecord(payload)) {
    return invalidPayload("INVALID_JSON", "비율 변경 요청 형식이 올바르지 않습니다.");
  }

  const ratio = parseRatio(payload["ratio"]);
  if (!ratio) {
    return invalidPayload("INVALID_RATIO", "출력 비율을 선택해 주세요.");
  }

  if (ratio !== "custom") {
    return { ok: true, payload: { ratio } };
  }

  const customDimensions = parseDimensions(payload["customDimensions"]);
  if (!customDimensions) {
    return invalidPayload("CUSTOM_RATIO_SIZE_INVALID", "사용자 지정 크기를 입력해 주세요.");
  }

  const parsedDimensions = parseProductImageStudioCustomRatio(customDimensions);
  if (!parsedDimensions.ok) {
    return invalidPayload(parsedDimensions.error.code, parsedDimensions.error.message);
  }

  return { ok: true, payload: { customDimensions: parsedDimensions.dimensions, ratio: "custom" } };
}

function parseRatio(value: unknown): ProductImageStudioRatioPreset | null {
  if (typeof value !== "string") {
    return null;
  }

  return PRODUCT_IMAGE_STUDIO_RATIO_PRESETS.find((ratio) => ratio === value) ?? null;
}

function parseDimensions(value: unknown): { readonly height: number; readonly width: number } | null {
  if (!isRecord(value)) {
    return null;
  }

  const width = value["width"];
  const height = value["height"];
  if (typeof width !== "number" || typeof height !== "number") {
    return null;
  }

  return { height, width };
}

function invalidPayload(code: string, message: string): {
  readonly error: { readonly code: string; readonly message: string };
  readonly ok: false;
} {
  return { error: { code, message }, ok: false };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    if (error instanceof URIError) {
      return value;
    }
    throw error;
  }
}
