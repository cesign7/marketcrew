export type ProductImageStudioImageGeneratorProviderFailure = {
  readonly code: "IMAGE_PROVIDER_FAILED";
  readonly message: string;
  readonly requestId?: string;
};

const IMAGE_GENERATOR_PROVIDER_FAILURE_MESSAGE = "이미지 provider 요청이 실패했습니다. provider 설정, 크레딧, 모델 권한을 확인해 주세요.";

export function toPublicImageGeneratorProviderFailure(
  error: unknown,
): ProductImageStudioImageGeneratorProviderFailure {
  const requestId = readProviderRequestId(error);
  return requestId
    ? { code: "IMAGE_PROVIDER_FAILED", message: IMAGE_GENERATOR_PROVIDER_FAILURE_MESSAGE, requestId }
    : { code: "IMAGE_PROVIDER_FAILED", message: IMAGE_GENERATOR_PROVIDER_FAILURE_MESSAGE };
}

function readProviderRequestId(error: unknown): string | null {
  if (!isRecord(error)) {
    return null;
  }
  const value = error["requestId"];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
