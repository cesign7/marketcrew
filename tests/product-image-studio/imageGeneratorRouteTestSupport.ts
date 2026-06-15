import { Buffer } from "node:buffer";
import { expect } from "vitest";
import type {
  ProductImageStudioImageGeneratorProviderResolver,
} from "@/features/product-image-studio/server/imageGeneratorRunner";
import type {
  ImageGenerationProvider,
  ProductImageStudioProviderCallInput,
  ProductImageStudioProviderImageResult,
} from "@/features/product-image-studio/server/imageProvider";
import type {
  ProductImageFileStore,
  SaveGeneratedProductImageInput,
  SaveProductImageInput,
  SavedProductImageFile,
  StoredProductImageFile,
} from "@/features/product-image-studio/server/fileStore";
import { parseImageMimeType } from "@/features/product-image-studio/server/fileStore";
import {
  createInMemoryProductImageStudioRepository,
  type ProductImageStudioRepository,
} from "@/lib/persistence/productImageStudioRepository";

export type ImageGeneratorRouteTestState = {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly fileStore: RecordingImageGeneratorRouteFileStore;
  readonly repository: ProductImageStudioRepository;
};

export type RecordingImageGeneratorRouteProvider = ImageGenerationProvider & {
  readonly calls: ProductImageStudioProviderCallInput[];
};

export class RecordingImageGeneratorRouteFileStore implements ProductImageFileStore {
  readonly savedGenerated: SaveGeneratedProductImageInput[] = [];
  readonly savedOriginals: SaveProductImageInput[] = [];
  private index = 0;

  async saveImage(input: SaveProductImageInput): Promise<SavedProductImageFile> {
    this.savedOriginals.push(input);
    this.index += 1;
    return savedFile(input.projectId, `${input.role}/${this.index}`, parseImageMimeType(input.contentType), input.bytes.byteLength, input.originalFileName);
  }

  async saveGeneratedImage(input: SaveGeneratedProductImageInput): Promise<SavedProductImageFile> {
    this.savedGenerated.push(input);
    this.index += 1;
    return savedFile(input.projectId, `results/${input.generationRequestId}/${this.index}.png`, input.contentType, input.bytes.byteLength, "result.png");
  }

  async readImage(): Promise<StoredProductImageFile | null> {
    return null;
  }
}

export function imageGeneratorRouteTestState(): ImageGeneratorRouteTestState {
  return {
    env: {
      MARKETCREW_API_BASE_URL: "",
      MARKETCREW_API_TOKEN: "",
      MARKETCREW_BACKEND_API_TOKEN: "",
      MARKETCREW_BACKEND_API_URL: "",
      PRODUCT_IMAGE_STUDIO_PROVIDER_SETTINGS_STORE: "memory",
    },
    fileStore: new RecordingImageGeneratorRouteFileStore(),
    repository: createInMemoryProductImageStudioRepository(),
  };
}

export function recordingImageGeneratorRouteProvider(
  name: "fake" | "gemini" | "openai",
  failingIndexes: readonly number[] = [],
): RecordingImageGeneratorRouteProvider {
  const calls: ProductImageStudioProviderCallInput[] = [];
  const run = async (input: ProductImageStudioProviderCallInput): Promise<ProductImageStudioProviderImageResult> => {
    const index = calls.length;
    calls.push(input);
    if (failingIndexes.includes(index)) {
      throw new Error(`provider failed ${index}`);
    }
    return {
      b64Json: Buffer.from(`${name}-${index}`).toString("base64"),
      contentType: "image/png",
      height: 64,
      model: `${name}-model`,
      provider: name,
      width: 64,
    };
  };
  return {
    calls,
    editWithReferences: run,
    generateScene: run,
    name,
    regenerateRatio: run,
  };
}

export function enabledImageGeneratorRouteResolver(
  model: string,
  provider: ImageGenerationProvider,
): ProductImageStudioImageGeneratorProviderResolver {
  return async () => ({ kind: "enabled", model, provider });
}

export function multipartImageGeneratorRouteRequest(
  payload: string | Readonly<Record<string, unknown>>,
  references: readonly File[] = [],
): Request {
  const formData = new FormData();
  formData.set("payload", typeof payload === "string" ? payload : JSON.stringify(payload));
  for (const reference of references) {
    formData.append("referenceImages", reference);
  }
  return new Request("http://127.0.0.1:3000/api/product-image-studio/image-generator/generations", {
    body: formData,
    method: "POST",
  });
}

export function validImageGeneratorRoutePayload(overrides: Readonly<Record<string, unknown>> = {}): Readonly<Record<string, unknown>> {
  return {
    count: 1,
    modelLabel: "gpt2",
    prompt: "premium stationery flatlay",
    ratio: "1:1",
    resolution: "1k",
    ...overrides,
  };
}

export function imageGeneratorRouteFile(name: string, type: string, content: string | ArrayBuffer): File {
  return new File([content], name, { type });
}

export function safeImageGeneratorRouteSvg(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#111"/></svg>';
}

export function readImageGeneratorRouteProjectId(body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "data" in body &&
    typeof body.data === "object" &&
    body.data !== null &&
    "generation" in body.data &&
    typeof body.data.generation === "object" &&
    body.data.generation !== null &&
    "projectId" in body.data.generation &&
    typeof body.data.generation.projectId === "string"
  ) {
    return body.data.generation.projectId;
  }
  throw new Error("project id missing");
}

export async function expectNoImageGeneratorRouteArchiveWrites(state: ImageGeneratorRouteTestState): Promise<void> {
  expect(await state.repository.listProjectSummaries()).toHaveLength(0);
  expect(state.fileStore.savedGenerated).toHaveLength(0);
  expect(state.fileStore.savedOriginals).toHaveLength(0);
}

export function openAiImageGeneratorRouteResponse(text: string): Response {
  return new Response(JSON.stringify({ data: [{ b64_json: Buffer.from(text).toString("base64") }] }), {
    headers: { "content-type": "application/json", "x-request-id": "openai-request" },
    status: 200,
  });
}

export function geminiImageGeneratorRouteResponse(text: string): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ inlineData: { data: Buffer.from(text).toString("base64"), mimeType: "image/png" } }] } }],
    }),
    { headers: { "content-type": "application/json", "x-goog-request-id": "gemini-request" }, status: 200 },
  );
}

function savedFile(
  projectId: string,
  path: string,
  contentType: SavedProductImageFile["contentType"],
  byteSize: number,
  originalFileName: string,
): SavedProductImageFile {
  return {
    byteSize,
    contentType,
    originalFileName,
    previewUrl: `/studio-assets/${projectId}/${path}`,
    storageKey: `product-image-studio/${projectId}/${path}`,
  };
}
