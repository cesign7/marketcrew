import type {
  ImageGenerationProvider,
  ProductImageStudioProviderCallInput,
  ProductImageStudioProviderImageResult,
  ProductImageStudioProviderReferenceImage,
} from "@/features/product-image-studio/server/imageProvider";
import type { ProductImageStudioQualityMode, ProductImageStudioRatioPreset } from "@/features/product-image-studio/domain/types";
import { readOpenAiProviderErrorMessage } from "@/features/product-image-studio/server/openAiProviderErrorMessage";

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
    const providerMessage = await readOpenAiProviderErrorMessage(response);
    throw new OpenAiImageProviderError(response.status, requestId, buildOpenAiProviderFailureMessage(response.status, requestId, providerMessage));
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

function buildOpenAiProviderFailureMessage(status: number, requestId: string | null, providerMessage: string | null): string {
  const detail = providerMessage ?? buildOpenAiProviderFallbackMessage(status, requestId);
  return `OpenAI 이미지 생성 요청이 실패했습니다: ${detail}`;
}

function buildOpenAiProviderFallbackMessage(status: number, requestId: string | null): string {
  const requestLabel = requestId ? ` 요청 ID: ${requestId}` : " 요청 ID 없음";
  if (status === 400) {
    return `OpenAI가 오류 본문 없이 HTTP 400을 반환했습니다. 모델명, 이미지 크기, 업로드 이미지 형식, 요청 설정을 확인해 주세요.${requestLabel}`;
  }
  if (status === 401) {
    return `OpenAI가 오류 본문 없이 HTTP 401을 반환했습니다. API 키가 올바른지, 저장된 키가 현재 프로젝트에 연결되어 있는지 확인해 주세요.${requestLabel}`;
  }
  if (status === 403) {
    return `OpenAI가 오류 본문 없이 HTTP 403을 반환했습니다. 이미지 모델 권한, 프로젝트 권한, 조직 인증 상태를 확인해 주세요.${requestLabel}`;
  }
  if (status === 429) {
    return `OpenAI가 오류 본문 없이 HTTP 429를 반환했습니다. 크레딧, 사용 한도, 속도 제한을 확인해 주세요.${requestLabel}`;
  }
  if (status >= 500) {
    return `OpenAI가 오류 본문 없이 HTTP ${status}을 반환했습니다. OpenAI 일시 장애 또는 provider 응답 문제일 수 있습니다.${requestLabel}`;
  }
  return `OpenAI가 오류 본문 없이 HTTP ${status}을 반환했습니다. OpenAI provider 상태와 설정을 확인해 주세요.${requestLabel}`;
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
