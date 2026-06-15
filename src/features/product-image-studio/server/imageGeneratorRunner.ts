import { NextResponse } from "next/server";
import type { ProductImageStudioImageGeneratorPayload } from "@/features/product-image-studio/domain/imageGenerator";
import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";
import { getDefaultProductImageStudioFileStore } from "@/features/product-image-studio/server/assetUploadApi";
import {
  createFakeProductImageStudioImageProvider,
  resolveConfiguredProductImageStudioImageProvider,
  type ImageGenerationProvider,
  type ProductImageStudioProviderImageResult,
  type ProductImageStudioProviderReferenceImage,
  type ProductImageStudioPromptContext,
  type ResolvedProductImageStudioImageProvider,
} from "@/features/product-image-studio/server/imageProvider";
import type { ProductImageStudioProviderEnv } from "@/features/product-image-studio/server/providerConfig";
import {
  IMAGE_GENERATOR_QUALITY_MODE,
  persistProductImageStudioImageGeneratorSuccess,
} from "@/features/product-image-studio/server/imageGeneratorPersistence";
import { toPublicImageGeneratorProviderFailure } from "@/features/product-image-studio/server/imageGeneratorProviderFailure";
import {
  buildProductImageStudioImageGeneratorPromptSummary,
  buildProductImageStudioImageGeneratorProviderPrompt,
} from "@/features/product-image-studio/server/imageGeneratorPrompt";
import {
  parseProductImageStudioImageGeneratorMultipartRequest,
  type ProductImageStudioImageGeneratorPreparedReference,
  type ProductImageStudioImageGeneratorRoutePayloadOptions,
} from "@/features/product-image-studio/server/imageGeneratorRoutePayload";
import { toProductImageStudioResultPreviewResponse } from "@/features/product-image-studio/server/generationResultPreview";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";
import type { ProductImageStudioRepository } from "@/lib/persistence/productImageStudioRepository";
import type { ProductImageFileStore } from "@/features/product-image-studio/server/fileStore";

export type ProductImageStudioImageGeneratorProviderResolver = (
  env: ProductImageStudioProviderEnv,
  provider: ProductImageStudioProviderName,
) => Promise<ResolvedProductImageStudioImageProvider>;

export type ProductImageStudioImageGeneratorRunnerDependencies =
  ProductImageStudioImageGeneratorRoutePayloadOptions & {
    readonly env?: ProductImageStudioProviderEnv;
    readonly fileStore?: ProductImageFileStore;
    readonly repository?: ProductImageStudioRepository;
    readonly resolveProvider?: ProductImageStudioImageGeneratorProviderResolver;
  };

type ProviderAttempt =
  | {
      readonly image: ProductImageStudioProviderImageResult;
      readonly kind: "fulfilled";
      readonly sequence: number;
    }
  | {
      readonly error: unknown;
      readonly kind: "rejected";
      readonly sequence: number;
    };

export async function handleProductImageStudioImageGeneratorGeneration(
  request: Request,
  dependencies: ProductImageStudioImageGeneratorRunnerDependencies = {},
): Promise<Response> {
  if (!isMultipartFormDataRequest(request)) {
    return NextResponse.json(
      {
        data: {
          generation: {
            message: "이미지 생성 차단됨: 운영 백엔드 proxy 연결 후 실행할 수 있습니다.",
            reason: "generation_disabled",
            status: "blocked",
          },
        },
        ok: true,
      },
      { status: 423 },
    );
  }

  const parsed = await parseProductImageStudioImageGeneratorMultipartRequest(request, dependencies);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, ok: false }, { status: 400 });
  }

  const env = dependencies.env ?? process.env;
  const resolvedProvider = await resolveImageGeneratorProvider(parsed.request.payload, env, dependencies.resolveProvider);
  if (resolvedProvider.kind === "blocked") {
    return NextResponse.json(
      {
        data: {
          generation: {
            modelLabel: parsed.request.payload.modelLabel,
            provider: parsed.request.payload.provider,
            reason: resolvedProvider.reason,
            status: "blocked",
          },
          promptSummary: buildProductImageStudioImageGeneratorPromptSummary(parsed.request.payload, parsed.request.references.length),
        },
        ok: true,
      },
      { status: 423 },
    );
  }

  const providerReferences = parsed.request.references.map(toProviderReferenceImage);
  const attempts = await createProviderAttempts(parsed.request.payload, parsed.request.references.length, resolvedProvider.provider, providerReferences);
  const successes = attempts.filter(isFulfilledAttempt);
  const failures = attempts.filter(isRejectedAttempt);
  if (successes.length === 0) {
    return NextResponse.json({ error: toPublicImageGeneratorProviderFailure(failures[0]?.error), ok: false }, { status: 502 });
  }

  const repository = dependencies.repository ?? getProductImageStudioProjectRepository();
  const fileStore = dependencies.fileStore ?? getDefaultProductImageStudioFileStore();
  const persisted = await persistProductImageStudioImageGeneratorSuccess({
    failedCount: failures.length,
    fileStore,
    payload: parsed.request.payload,
    references: parsed.request.references,
    repository,
    resolvedProvider,
    successes,
  });

  return NextResponse.json(
    {
      data: {
        generation: {
          completedCount: successes.length,
          id: persisted.generation.id,
          model: resolvedProvider.model,
          projectId: persisted.project.id,
          provider: resolvedProvider.provider.name,
          requestedCount: parsed.request.payload.count,
          status: failures.length > 0 ? "partial" : "ready",
          ...(failures.length > 0 ? { message: "일부 이미지만 생성되었습니다. 실패한 이미지는 provider 설정과 크레딧을 확인해 주세요." } : {}),
        },
        results: persisted.results.map((result) => toProductImageStudioResultPreviewResponse(persisted.project.id, result)),
      },
      ok: true,
    },
    { status: failures.length > 0 ? 207 : 200 },
  );
}

async function resolveImageGeneratorProvider(
  payload: ProductImageStudioImageGeneratorPayload,
  env: ProductImageStudioProviderEnv,
  resolveProvider: ProductImageStudioImageGeneratorProviderResolver = resolveConfiguredProductImageStudioImageProvider,
): Promise<ResolvedProductImageStudioImageProvider> {
  if (env.PRODUCT_IMAGE_STUDIO_FAKE_PROVIDER_ENABLED === "1") {
    return { kind: "enabled", model: "fake-product-image-studio", provider: createFakeProductImageStudioImageProvider() };
  }
  return resolveProvider(withDefaultModel(env, payload.provider, payload.defaultModel), payload.provider);
}

async function createProviderAttempts(
  payload: ProductImageStudioImageGeneratorPayload,
  referenceCount: number,
  provider: ImageGenerationProvider,
  referenceImages: readonly ProductImageStudioProviderReferenceImage[],
): Promise<readonly ProviderAttempt[]> {
  return Promise.all(
    Array.from({ length: payload.count }, (_value, index) => callProvider({ payload, provider, referenceCount, referenceImages, sequence: index + 1 })),
  );
}

async function callProvider(input: {
  readonly payload: ProductImageStudioImageGeneratorPayload;
  readonly provider: ImageGenerationProvider;
  readonly referenceCount: number;
  readonly referenceImages: readonly ProductImageStudioProviderReferenceImage[];
  readonly sequence: number;
}): Promise<ProviderAttempt> {
  const promptContext: ProductImageStudioPromptContext = {
    assetRoles: input.referenceImages.map((image) => image.role),
    prompt: buildProductImageStudioImageGeneratorProviderPrompt(input.payload, input.referenceCount),
    qualityMode: IMAGE_GENERATOR_QUALITY_MODE,
    ratio: input.payload.ratio,
    resolution: input.payload.resolution,
    resultIndex: input.sequence - 1,
  };
  try {
    const image = input.referenceImages.length > 0
      ? await input.provider.editWithReferences({ promptContext, referenceImages: input.referenceImages })
      : await input.provider.generateScene({ promptContext, referenceImages: [] });
    return { image, kind: "fulfilled", sequence: input.sequence };
  } catch (error) {
    return { error, kind: "rejected", sequence: input.sequence };
  }
}

function toProviderReferenceImage(reference: ProductImageStudioImageGeneratorPreparedReference): ProductImageStudioProviderReferenceImage {
  return {
    bytes: toArrayBuffer(reference.providerBytes),
    contentType: reference.providerContentType,
    fileName: reference.providerFileName,
    role: "reference_mood",
  };
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function withDefaultModel(
  env: ProductImageStudioProviderEnv,
  provider: ProductImageStudioProviderName,
  defaultModel: string,
): ProductImageStudioProviderEnv {
  switch (provider) {
    case "openai":
      return env.PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL ? env : { ...env, PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL: defaultModel };
    case "gemini":
      return env.PRODUCT_IMAGE_STUDIO_GEMINI_IMAGE_MODEL ? env : { ...env, PRODUCT_IMAGE_STUDIO_GEMINI_IMAGE_MODEL: defaultModel };
  }
}

function isFulfilledAttempt(attempt: ProviderAttempt): attempt is Extract<ProviderAttempt, { readonly kind: "fulfilled" }> {
  return attempt.kind === "fulfilled";
}

function isRejectedAttempt(attempt: ProviderAttempt): attempt is Extract<ProviderAttempt, { readonly kind: "rejected" }> {
  return attempt.kind === "rejected";
}

function isMultipartFormDataRequest(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").toLowerCase().includes("multipart/form-data");
}
