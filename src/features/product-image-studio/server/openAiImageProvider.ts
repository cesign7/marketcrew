import type {
  ImageGenerationProvider,
  ProductImageStudioProviderCallInput,
  ProductImageStudioProviderImageResult,
  ProductImageStudioProviderReferenceImage,
} from "@/features/product-image-studio/server/imageProvider";
import type { ProductImageStudioQualityMode, ProductImageStudioRatioPreset } from "@/features/product-image-studio/domain/types";

export type OpenAiImageProviderOptions = {
  readonly apiKey: string;
  readonly fetchImpl?: (input: string, init: RequestInit) => Promise<Response>;
  readonly model: string;
};

export class OpenAiImageProviderError extends Error {
  readonly requestId: string | null;
  readonly status: number;

  constructor(status: number, requestId: string | null, message: string) {
    super(message);
    this.name = "OpenAiImageProviderError";
    this.requestId = requestId;
    this.status = status;
  }
}

export function createOpenAiImageProvider(options: OpenAiImageProviderOptions): ImageGenerationProvider {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    name: "openai",
    async editWithReferences(input) {
      const formData = buildOpenAiEditFormData(input, options.model);
      return requestOpenAiImage(fetchImpl, options.apiKey, "https://api.openai.com/v1/images/edits", formData, options.model);
    },
    async generateScene(input) {
      return requestOpenAiImage(
        fetchImpl,
        options.apiKey,
        "https://api.openai.com/v1/images/generations",
        JSON.stringify(buildOpenAiGenerationRequestBody(input, options.model)),
        options.model,
      );
    },
    async regenerateRatio(input) {
      return requestOpenAiImage(
        fetchImpl,
        options.apiKey,
        "https://api.openai.com/v1/images/generations",
        JSON.stringify(buildOpenAiGenerationRequestBody(input, options.model)),
        options.model,
      );
    },
  };
}

export type OpenAiGenerationRequestBody = {
  readonly model: string;
  readonly n: 1;
  readonly output_format: "png";
  readonly prompt: string;
  readonly quality: "low" | "high";
  readonly size: string;
};

export function buildOpenAiGenerationRequestBody(
  input: ProductImageStudioProviderCallInput,
  model: string,
): OpenAiGenerationRequestBody {
  return {
    model,
    n: 1,
    output_format: "png",
    prompt: input.promptContext.prompt,
    quality: toOpenAiQuality(input.promptContext.qualityMode),
    size: toOpenAiSize(input.promptContext.ratio),
  };
}

function buildOpenAiEditFormData(input: ProductImageStudioProviderCallInput, model: string): FormData {
  const formData = new FormData();
  formData.set("model", model);
  formData.set("prompt", input.promptContext.prompt);
  formData.set("quality", toOpenAiQuality(input.promptContext.qualityMode));
  formData.set("size", toOpenAiSize(input.promptContext.ratio));

  for (const image of input.referenceImages) {
    formData.append("image[]", toFile(image));
  }

  return formData;
}

async function requestOpenAiImage(
  fetchImpl: (input: string, init: RequestInit) => Promise<Response>,
  apiKey: string,
  url: string,
  body: BodyInit,
  model: string,
): Promise<ProductImageStudioProviderImageResult> {
  const headers = new Headers();
  headers.set("authorization", `Bearer ${apiKey}`);
  if (typeof body === "string") {
    headers.set("content-type", "application/json");
  }

  const response = await fetchImpl(url, {
    body,
    headers,
    method: "POST",
  });
  const requestId = response.headers.get("x-request-id");
  if (!response.ok) {
    throw new OpenAiImageProviderError(response.status, requestId, "OpenAI 이미지 생성 요청이 실패했습니다.");
  }

  return {
    b64Json: readB64Json(await response.json()),
    contentType: "image/png",
    height: 0,
    model,
    provider: "openai",
    requestId: requestId ?? undefined,
    width: 0,
  };
}

function readB64Json(value: unknown): string {
  if (!isRecord(value) || !Array.isArray(value["data"])) {
    throw new OpenAiImageProviderError(502, null, "OpenAI 이미지 응답 형식이 올바르지 않습니다.");
  }

  const first = value["data"][0];
  if (!isRecord(first) || typeof first["b64_json"] !== "string") {
    throw new OpenAiImageProviderError(502, null, "OpenAI 이미지 데이터가 비어 있습니다.");
  }

  return first["b64_json"];
}

function toFile(image: ProductImageStudioProviderReferenceImage): File {
  return new File([image.bytes], image.fileName, { type: image.contentType });
}

function toOpenAiQuality(qualityMode: ProductImageStudioQualityMode): "low" | "high" {
  switch (qualityMode) {
    case "draft":
      return "low";
    case "high":
      return "high";
  }
}

function toOpenAiSize(ratio: ProductImageStudioRatioPreset): string {
  switch (ratio) {
    case "1:1":
      return "1024x1024";
    case "4:5":
    case "3:4":
      return "1024x1536";
    case "16:9":
      return "1536x1024";
    case "custom":
      return "auto";
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
