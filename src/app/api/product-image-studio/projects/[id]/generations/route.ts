import { NextResponse } from "next/server";
import { listCardSetConceptRecommendations } from "@/features/product-image-studio/domain/concepts";
import { getDefaultProductImageStudioFileStore } from "@/features/product-image-studio/server/assetUploadApi";
import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";
import {
  buildProductImageStudioPromptContext,
  createFakeProductImageStudioImageProvider,
  resolveConfiguredProductImageStudioImageProvider,
} from "@/features/product-image-studio/server/imageProvider";
import {
  createStoredProductImageStudioGenerationResultBatch,
  createStoredProductImageStudioGenerationResults,
  readProductImageStudioReferenceImages,
  type ProductImageStudioGenerationFailure,
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
export const maxDuration = 300;

export async function POST(request: Request, context: ProductImageStudioGenerationRouteContext) {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

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
        model: "fake-product-image-studio",
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

  const resolvedProvider = await resolveConfiguredProductImageStudioImageProvider(process.env, parsed.payload.provider);
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
            provider: parsed.payload.provider ?? null,
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
      model: resolvedProvider.model,
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
    const generationResult = await createStoredProductImageStudioGenerationResultBatch({
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
    const unexpectedFailure = generationResult.failures.find((failure) => !isImageProviderError(failure.error));
    if (unexpectedFailure) {
      throw unexpectedFailure.error;
    }

    if (generationResult.failures.length > 0) {
      if (generationResult.results.length > 0) {
        return NextResponse.json(
          {
            data: {
              generation: {
                id: generation.id,
                message: buildPartialGenerationMessage(generationResult.failures),
                status: "partial",
              },
              results: generationResult.results.map((result) => toProductImageStudioResultPreviewResponse(project.id, result)),
            },
            ok: true,
          },
          { status: 207 },
        );
      }

      const firstFailure = generationResult.failures[0];
      if (firstFailure) {
        throw firstFailure.error;
      }
    }

    return NextResponse.json({
      data: {
        generation: {
          id: generation.id,
          status: "ready",
        },
        results: generationResult.results.map((result) => toProductImageStudioResultPreviewResponse(project.id, result)),
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

function isImageProviderError(error: unknown): error is OpenAiImageProviderError | GeminiImageProviderError {
  return error instanceof OpenAiImageProviderError || error instanceof GeminiImageProviderError;
}

function buildPartialGenerationMessage(failures: readonly ProductImageStudioGenerationFailure[]): string {
  return `일부 이미지만 준비되었습니다. 실패한 출력 ${failures.length}개는 provider 설정, 크레딧, 모델 권한을 확인해 주세요.`;
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
