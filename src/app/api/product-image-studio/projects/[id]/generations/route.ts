import { NextResponse } from "next/server";
import { listCardSetConceptRecommendations } from "@/features/product-image-studio/domain/concepts";
import {
  PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES,
  PRODUCT_IMAGE_STUDIO_QUALITY_MODES,
  type ProductImageStudioOutputType,
  type ProductImageStudioQualityMode,
} from "@/features/product-image-studio/domain/types";
import {
  buildProductImageStudioPromptContext,
  resolveProductImageStudioImageProvider,
} from "@/features/product-image-studio/server/imageProvider";
import { getProductImageStudioDimensionsForRatio } from "@/features/product-image-studio/server/downloads";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";

type ProductImageStudioGenerationRouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

type ParsedGenerationPayload = {
  readonly conceptId: string;
  readonly outputs: readonly ProductImageStudioOutputType[];
  readonly qualityMode: ProductImageStudioQualityMode;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: ProductImageStudioGenerationRouteContext) {
  const { id } = await context.params;
  const repository = getProductImageStudioProjectRepository();
  const project = await repository.getProject(normalizeRouteParam(id));
  if (!project) {
    return NextResponse.json({ error: { code: "PROJECT_NOT_FOUND", message: "프로젝트를 찾지 못했습니다." }, ok: false }, { status: 404 });
  }

  const parsed = parseGenerationPayload(await readJsonPayload(request));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, ok: false }, { status: 400 });
  }

  const concept = listCardSetConceptRecommendations().find((candidate) => candidate.id === parsed.payload.conceptId);
  if (!concept) {
    return NextResponse.json({ error: { code: "CONCEPT_NOT_FOUND", message: "콘셉트를 찾지 못했습니다." }, ok: false }, { status: 404 });
  }

  const assets = await repository.listAssets(project.id);
  const promptContext = buildProductImageStudioPromptContext({
    assetRoles: assets.map((asset) => asset.role),
    cardPose: project.requestedCardPoses[0],
    concept,
    outputType: parsed.payload.outputs[0] ?? "set_combined",
    project,
    qualityMode: parsed.payload.qualityMode,
    ratio: project.ratios[0] ?? "1:1",
  });
  if (isFakeGenerationEnabled()) {
    const generation = await repository.createGenerationRequest({
      conceptId: concept.id,
      projectId: project.id,
      providerRequestSummary: {
        assetRoleCount: promptContext.assetRoles.length,
        outputCount: parsed.payload.outputs.length,
        provider: "fake",
      },
      qualityMode: parsed.payload.qualityMode,
      requestedCardPoses: project.requestedCardPoses,
      requestedOutputs: parsed.payload.outputs,
    });
    const ratio = project.ratios[0] ?? "1:1";
    const dimensions = getProductImageStudioDimensionsForRatio(ratio);
    const results = await Promise.all(
      parsed.payload.outputs.map((outputType) =>
        repository.addResult({
          cardPose: outputType === "set_combined" || outputType === "card_single" ? project.requestedCardPoses[0] : undefined,
          generationRequestId: generation.id,
          height: dimensions.height,
          outputType,
          projectId: project.id,
          ratio,
          storageKey: `product-image-studio/${project.id}/results/${generation.id}/${outputType}-${ratio.replace(":", "x")}.png`,
          width: dimensions.width,
        }),
      ),
    );

    return NextResponse.json({
      data: {
        generation: {
          id: generation.id,
          status: "ready",
        },
        results,
      },
      ok: true,
    });
  }

  const resolvedProvider = resolveProductImageStudioImageProvider();
  if (resolvedProvider.kind === "blocked") {
    return NextResponse.json(
      {
        data: {
          generation: {
            reason: resolvedProvider.reason,
            status: "blocked",
          },
          promptSummary: {
            assetRoleCount: promptContext.assetRoles.length,
            cardFormat: project.cardFormat,
            conceptId: concept.id,
            outputCount: parsed.payload.outputs.length,
          },
        },
        ok: true,
      },
      { status: 423 },
    );
  }

  const generation = await repository.createGenerationRequest({
    conceptId: concept.id,
    projectId: project.id,
    providerRequestSummary: {
      assetRoleCount: promptContext.assetRoles.length,
      outputCount: parsed.payload.outputs.length,
      provider: resolvedProvider.provider.name,
    },
    qualityMode: parsed.payload.qualityMode,
    requestedCardPoses: project.requestedCardPoses,
    requestedOutputs: parsed.payload.outputs,
  });

  return NextResponse.json({
    data: {
      generation: {
        id: generation.id,
        status: generation.status,
      },
    },
    ok: true,
  });
}

async function readJsonPayload(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseGenerationPayload(payload: unknown):
  | {
      readonly ok: true;
      readonly payload: ParsedGenerationPayload;
    }
  | {
      readonly error: { readonly code: string; readonly message: string };
      readonly ok: false;
    } {
  if (!isRecord(payload)) {
    return invalidPayload("INVALID_JSON", "생성 요청 형식이 올바르지 않습니다.");
  }

  const conceptId = payload["conceptId"];
  const outputs = parseOutputs(payload["outputs"]);
  const qualityMode = parseQualityMode(payload["qualityMode"]);
  if (typeof conceptId !== "string" || conceptId.length === 0) {
    return invalidPayload("CONCEPT_REQUIRED", "생성할 콘셉트를 선택해 주세요.");
  }

  if (outputs.length === 0) {
    return invalidPayload("OUTPUTS_REQUIRED", "생성할 이미지 종류를 선택해 주세요.");
  }

  if (!qualityMode) {
    return invalidPayload("QUALITY_MODE_REQUIRED", "생성 품질을 선택해 주세요.");
  }

  return {
    ok: true,
    payload: {
      conceptId,
      outputs,
      qualityMode,
    },
  };
}

function parseOutputs(value: unknown): readonly ProductImageStudioOutputType[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const outputs: ProductImageStudioOutputType[] = [];
  for (const item of value) {
    const output = parseOutputType(item);
    if (!output) {
      return [];
    }
    outputs.push(output);
  }
  return outputs;
}

function parseOutputType(value: unknown): ProductImageStudioOutputType | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const outputType of PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES) {
    if (outputType === value) {
      return outputType;
    }
  }

  return null;
}

function parseQualityMode(value: unknown): ProductImageStudioQualityMode | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const qualityMode of PRODUCT_IMAGE_STUDIO_QUALITY_MODES) {
    if (qualityMode === value) {
      return qualityMode;
    }
  }

  return null;
}

function invalidPayload(code: string, message: string): {
  readonly error: { readonly code: string; readonly message: string };
  readonly ok: false;
} {
  return { error: { code, message }, ok: false };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function isFakeGenerationEnabled(): boolean {
  return process.env.PRODUCT_IMAGE_STUDIO_FAKE_PROVIDER_ENABLED === "1";
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
