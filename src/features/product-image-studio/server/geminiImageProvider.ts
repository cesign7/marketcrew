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
  readonly generationConfig?: {
    readonly imageConfig: GeminiImageConfig;
    readonly responseModalities: readonly ["IMAGE"];
  };
};

type GeminiImageConfig = {
  readonly aspectRatio: string;
  readonly imageSize?: "512" | "1K" | "2K";
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
  includeGenerationConfig = true,
): GeminiGenerateContentRequestBody {
  const contents: GeminiGenerateContentRequestBody["contents"] = [
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
  ];

  if (!includeGenerationConfig) {
    return { contents };
  }

  return {
    contents,
    generationConfig: {
      imageConfig: toGeminiImageConfig(model, input.promptContext.qualityMode, input.promptContext.ratio),
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

  const response = await postGeminiGenerateContent(fetchImpl, headers, model, buildGeminiGenerateContentRequestBody(input, model));
  const requestId = response.headers.get("x-request-id") ?? response.headers.get("x-goog-request-id");
  if (!response.ok) {
    const providerMessage = readGeminiProviderErrorMessage(await readGeminiResponseJson(response));
    if (shouldRetryGeminiWithoutGenerationConfig(providerMessage)) {
      const fallbackResponse = await postGeminiGenerateContent(
        fetchImpl,
        headers,
        model,
        buildGeminiGenerateContentRequestBody(input, model, false),
      );
      return readGeminiImageResponse(fallbackResponse, model);
    }

    const suffix = providerMessage ? `: ${providerMessage}` : "";
    throw new GeminiImageProviderError(response.status, requestId, `Gemini 이미지 생성 요청이 실패했습니다${suffix}`);
  }

  return readGeminiImageResponse(response, model);
}

function postGeminiGenerateContent(
  fetchImpl: (input: string, init: RequestInit) => Promise<Response>,
  headers: Headers,
  model: string,
  body: GeminiGenerateContentRequestBody,
): Promise<Response> {
  return fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    body: JSON.stringify(body),
    headers,
    method: "POST",
  });
}

async function readGeminiImageResponse(response: Response, model: string): Promise<ProductImageStudioProviderImageResult> {
  const requestId = response.headers.get("x-request-id") ?? response.headers.get("x-goog-request-id");
  if (!response.ok) {
    const providerMessage = readGeminiProviderErrorMessage(await readGeminiResponseJson(response));
    const suffix = providerMessage ? `: ${providerMessage}` : "";
    throw new GeminiImageProviderError(response.status, requestId, `Gemini 이미지 생성 요청이 실패했습니다${suffix}`);
  }

  return {
    b64Json: readGeminiImageB64(await readGeminiSuccessJson(response)),
    contentType: "image/png",
    height: 0,
    model,
    provider: "gemini",
    requestId: requestId ?? undefined,
    width: 0,
  };
}

async function readGeminiSuccessJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      throw new GeminiImageProviderError(502, null, "Gemini 이미지 응답 JSON을 읽지 못했습니다.");
    }
    throw error;
  }
}

async function readGeminiResponseJson(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return null;
    }
    throw error;
  }
}

function readGeminiProviderErrorMessage(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const error = value["error"];
  if (isRecord(error) && typeof error["message"] === "string") {
    return normalizeGeminiProviderMessage(error["message"]);
  }

  const message = value["message"];
  return typeof message === "string" ? normalizeGeminiProviderMessage(message) : null;
}

function normalizeGeminiProviderMessage(message: string): string | null {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return null;
  }
  if (normalized.includes("API key not valid")) {
    return "Gemini API 키가 유효하지 않습니다. 설정에서 AI Studio의 AIza... 키를 다시 저장해 주세요.";
  }

  return normalized.length > 240 ? `${normalized.slice(0, 240)}...` : normalized;
}

function shouldRetryGeminiWithoutGenerationConfig(message: string | null): boolean {
  return (
    message?.includes("generation_config") === true &&
    (message.includes("Unknown name") || message.includes("Invalid value at"))
  );
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
): GeminiImageConfig {
  const base = { aspectRatio: toGeminiAspectRatio(ratio) };
  if (model === "gemini-3.1-flash-image") {
    return { ...base, imageSize: "512" };
  }
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
