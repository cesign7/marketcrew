import { NextResponse } from "next/server";
import { listCardSetConceptRecommendations } from "@/features/product-image-studio/domain/concepts";
import {
  buildProductImageStudioPromptContext,
  resolveProductImageStudioImageProvider,
} from "@/features/product-image-studio/server/imageProvider";
import { getProductImageStudioDimensionsForRatio } from "@/features/product-image-studio/server/downloads";
import {
  getProductImageStudioGenerationOutputBlockReason,
  parseProductImageStudioGenerationPayload,
} from "@/features/product-image-studio/server/generationRoutePayload";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";

type ProductImageStudioGenerationRouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: ProductImageStudioGenerationRouteContext) {
  const { id } = await context.params;
  const repository = getProductImageStudioProjectRepository();
  const project = await repository.getProject(normalizeRouteParam(id));
  if (!project) {
    return NextResponse.json({ error: { code: "PROJECT_NOT_FOUND", message: "프로젝트를 찾지 못했습니다." }, ok: false }, { status: 404 });
  }

  const parsed = parseProductImageStudioGenerationPayload(await readJsonPayload(request), project.cardFormat);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, ok: false }, { status: 400 });
  }

  const concept = listCardSetConceptRecommendations().find((candidate) => candidate.id === parsed.payload.conceptId);
  if (!concept) {
    return NextResponse.json({ error: { code: "CONCEPT_NOT_FOUND", message: "콘셉트를 찾지 못했습니다." }, ok: false }, { status: 404 });
  }

  const assets = await repository.listAssets(project.id);
  const assetRoles = assets.map((asset) => asset.role);
  const blockedOutput = parsed.payload.outputs
    .map((outputType) => ({
      outputType,
      reason: getProductImageStudioGenerationOutputBlockReason(
        project.cardFormat,
        assetRoles,
        parsed.payload.productionSettings,
        outputType,
      ),
    }))
    .find((result) => result.reason !== null);
  if (blockedOutput?.reason) {
    return NextResponse.json(
      { error: { code: "OUTPUT_NOT_READY", message: blockedOutput.reason }, ok: false },
      { status: 400 },
    );
  }

  const projectForGeneration = { ...project, productionSettings: parsed.payload.productionSettings };
  const promptContext = buildProductImageStudioPromptContext({
    assetRoles,
    cardPose: project.requestedCardPoses[0],
    concept,
    outputType: parsed.payload.outputs[0] ?? "set_combined",
    project: projectForGeneration,
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
