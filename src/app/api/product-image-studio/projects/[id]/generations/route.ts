import { NextResponse } from "next/server";
import { listCardSetConceptRecommendations } from "@/features/product-image-studio/domain/concepts";
import { getDefaultProductImageStudioFileStore } from "@/features/product-image-studio/server/assetUploadApi";
import {
  buildProductImageStudioPromptContext,
  createFakeProductImageStudioImageProvider,
  resolveConfiguredProductImageStudioImageProvider,
} from "@/features/product-image-studio/server/imageProvider";
import {
  createStoredProductImageStudioGenerationResults,
  readProductImageStudioReferenceImages,
} from "@/features/product-image-studio/server/generationRunner";
import { GeminiImageProviderError } from "@/features/product-image-studio/server/geminiImageProvider";
import { toProductImageStudioResultPreviewResponse } from "@/features/product-image-studio/server/generationResultPreview";
import { OpenAiImageProviderError } from "@/features/product-image-studio/server/openAiImageProvider";
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
  if (isFakeGenerationEnabled()) {
    const generation = await repository.createGenerationRequest({
      conceptId: concept.id,
      projectId: project.id,
      providerRequestSummary: {
        assetRoleCount: assetRoles.length,
        outputCount: parsed.payload.outputs.length,
        provider: "fake",
      },
      qualityMode: parsed.payload.qualityMode,
      requestedCardPoses: project.requestedCardPoses,
      requestedOutputs: parsed.payload.outputs,
    });
    const results = await createStoredProductImageStudioGenerationResults({
      assets,
      concept,
      fileStore: getDefaultProductImageStudioFileStore(),
      generation,
      project: projectForGeneration,
      provider: createFakeProductImageStudioImageProvider(),
      referenceImages: [],
      repository,
      requestedOutputs: parsed.payload.outputs,
    });

    return NextResponse.json({
      data: {
        generation: {
          id: generation.id,
          status: "ready",
        },
        results: results.map((result) => toProductImageStudioResultPreviewResponse(project.id, result)),
      },
      ok: true,
    });
  }

  const resolvedProvider = await resolveConfiguredProductImageStudioImageProvider();
  if (resolvedProvider.kind === "blocked") {
    const promptContext = buildProductImageStudioPromptContext({
      assetRoles,
      cardPose: project.requestedCardPoses[0],
      concept,
      outputType: parsed.payload.outputs[0] ?? "set_combined",
      project: projectForGeneration,
      qualityMode: parsed.payload.qualityMode,
      ratio: project.ratios[0] ?? "1:1",
    });
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
      assetRoleCount: assetRoles.length,
      outputCount: parsed.payload.outputs.length,
      provider: resolvedProvider.provider.name,
    },
    qualityMode: parsed.payload.qualityMode,
    requestedCardPoses: project.requestedCardPoses,
    requestedOutputs: parsed.payload.outputs,
  });

  const fileStore = getDefaultProductImageStudioFileStore();
  const referenceImages = await readProductImageStudioReferenceImages(assets, fileStore);
  if (!referenceImages.ok) {
    return NextResponse.json({ error: referenceImages.error, ok: false }, { status: 400 });
  }

  try {
    const results = await createStoredProductImageStudioGenerationResults({
      assets,
      concept,
      fileStore,
      generation,
      project: projectForGeneration,
      provider: resolvedProvider.provider,
      referenceImages: referenceImages.images,
      repository,
      requestedOutputs: parsed.payload.outputs,
    });

    return NextResponse.json({
      data: {
        generation: {
          id: generation.id,
          status: "ready",
        },
        results: results.map((result) => toProductImageStudioResultPreviewResponse(project.id, result)),
      },
      ok: true,
    });
  } catch (error) {
    if (error instanceof OpenAiImageProviderError || error instanceof GeminiImageProviderError) {
      return NextResponse.json(
        {
          error: {
            code: "IMAGE_PROVIDER_FAILED",
            message: error.message,
            requestId: error.requestId,
          },
          ok: false,
        },
        { status: 502 },
      );
    }
    throw error;
  }
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
