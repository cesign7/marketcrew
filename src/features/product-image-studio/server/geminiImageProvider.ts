import type { ProductImageStudioQualityMode, ProductImageStudioRatioPreset } from "@/features/product-image-studio/domain/types";
import type {
  ImageGenerationProvider,
  ProductImageStudioProviderCallInput,
  ProductImageStudioProviderImageResult,
} from "@/features/product-image-studio/server/imageProvider";

export type GeminiImageProviderOptions = {
  readonly apiKey: string;
  readonly fetchImpl?: (input: string, init: RequestInit) => Promise<Response>;
  readonly model: string;
};

export class GeminiImageProviderError extends Error {
  readonly requestId: string | null;
  readonly status: number;

  constructor(status: number, requestId: string | null, message: string) {
    super(message);
    this.name = "GeminiImageProviderError";
    this.requestId = requestId;
    this.status = status;
  }
}

export function createGeminiImageProvider(options: GeminiImageProviderOptions): ImageGenerationProvider {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    name: "gemini",
    async editWithReferences(input) {
      return requestGeminiImage(fetchImpl, options.apiKey, options.model, input);
    },
    async generateScene(input) {
      return requestGeminiImage(fetchImpl, options.apiKey, options.model, input);
    },
    async regenerateRatio(input) {
      return requestGeminiImage(fetchImpl, options.apiKey, options.model, input);
    },
  };
}

export type GeminiGenerateContentRequestBody = {
  readonly contents: readonly [
    {
      readonly parts: readonly GeminiRequestPart[];
    },
  ];
  readonly generationConfig: {
    readonly responseFormat: {
      readonly image: {
        readonly aspectRatio: string;
        readonly imageSize?: "1K" | "2K";
      };
    };
    readonly responseModalities: readonly ["IMAGE"];
  };
};

type GeminiRequestPart =
  | {
      readonly text: string;
    }
  | {
      readonly inline_data: {
        readonly data: string;
        readonly mime_type: string;
      };
    };

export function buildGeminiGenerateContentRequestBody(
  input: ProductImageStudioProviderCallInput,
  model: string,
): GeminiGenerateContentRequestBody {
  return {
    contents: [
      {
        parts: [
          { text: input.promptContext.prompt },
          ...input.referenceImages.map((image) => ({
            inline_data: {
              data: Buffer.from(image.bytes).toString("base64"),
              mime_type: image.contentType,
            },
          })),
        ],
      },
    ],
    generationConfig: {
      responseFormat: {
        image: toGeminiImageConfig(model, input.promptContext.qualityMode, input.promptContext.ratio),
      },
      responseModalities: ["IMAGE"],
    },
  };
}

async function requestGeminiImage(
  fetchImpl: (input: string, init: RequestInit) => Promise<Response>,
  apiKey: string,
  model: string,
  input: ProductImageStudioProviderCallInput,
): Promise<ProductImageStudioProviderImageResult> {
  const headers = new Headers();
  headers.set("content-type", "application/json");
  headers.set("x-goog-api-key", apiKey);

  const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`, {
    body: JSON.stringify(buildGeminiGenerateContentRequestBody(input, model)),
    headers,
    method: "POST",
  });
  const requestId = response.headers.get("x-request-id") ?? response.headers.get("x-goog-request-id");
  if (!response.ok) {
    throw new GeminiImageProviderError(response.status, requestId, "Gemini 이미지 생성 요청이 실패했습니다.");
  }

  return {
    b64Json: readGeminiImageB64(await response.json()),
    contentType: "image/png",
    height: 0,
    model,
    provider: "gemini",
    requestId: requestId ?? undefined,
    width: 0,
  };
}

function readGeminiImageB64(value: unknown): string {
  if (!isRecord(value) || !Array.isArray(value["candidates"])) {
    throw new GeminiImageProviderError(502, null, "Gemini 이미지 응답 형식이 올바르지 않습니다.");
  }

  for (const candidate of value["candidates"]) {
    const content = isRecord(candidate) ? candidate["content"] : null;
    const parts = isRecord(content) && Array.isArray(content["parts"]) ? content["parts"] : [];
    for (const part of parts) {
      const inlineData = readInlineData(part);
      if (inlineData) {
        return inlineData;
      }
    }
  }

  throw new GeminiImageProviderError(502, null, "Gemini 이미지 데이터가 비어 있습니다.");
}

function readInlineData(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const inlineData = value["inlineData"] ?? value["inline_data"];
  if (!isRecord(inlineData) || typeof inlineData["data"] !== "string") {
    return null;
  }

  return inlineData["data"];
}

function toGeminiImageConfig(
  model: string,
  qualityMode: ProductImageStudioQualityMode,
  ratio: ProductImageStudioRatioPreset,
): GeminiGenerateContentRequestBody["generationConfig"]["responseFormat"]["image"] {
  const base = { aspectRatio: toGeminiAspectRatio(ratio) };
  if (model.startsWith("gemini-2.5")) {
    return base;
  }
  return qualityMode === "high" ? { ...base, imageSize: "2K" } : { ...base, imageSize: "1K" };
}

function toGeminiAspectRatio(ratio: ProductImageStudioRatioPreset): string {
  switch (ratio) {
    case "1:1":
      return "1:1";
    case "4:5":
      return "4:5";
    case "3:4":
      return "3:4";
    case "16:9":
      return "16:9";
    case "custom":
      return "1:1";
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
