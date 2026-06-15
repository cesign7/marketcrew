type OpenAiProviderErrorData = {
  readonly code: string | null;
  readonly message: string | null;
  readonly status: number;
  readonly type: string | null;
};

const OPENAI_SECRET_PREFIX = ["s", "k-"].join("");
const MASKED_OPENAI_SECRET_PREFIX = `${OPENAI_SECRET_PREFIX}...`;
const OPENAI_SECRET_PATTERN = new RegExp(`\\b${OPENAI_SECRET_PREFIX}[A-Za-z0-9_-]{6,}\\b`, "g");

export async function readOpenAiProviderErrorMessage(response: Response): Promise<string | null> {
  return readOpenAiProviderErrorMessageFromBody(await readOpenAiResponseBody(response), response.status);
}

async function readOpenAiResponseBody(response: Response): Promise<unknown | null> {
  const contentType = response.headers.get("content-type") ?? "";
  try {
    return contentType.includes("application/json") ? await response.json() : await response.text();
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return null;
    }
    throw error;
  }
}

function readOpenAiProviderErrorMessageFromBody(value: unknown, status: number): string | null {
  if (typeof value === "string") {
    return normalizeOpenAiProviderMessage({ code: null, message: value, status, type: null });
  }
  if (!isRecord(value)) {
    return null;
  }

  const error = value["error"];
  if (isRecord(error)) {
    return normalizeOpenAiProviderMessage({
      code: readStringField(error, "code"),
      message: readStringField(error, "message"),
      status,
      type: readStringField(error, "type"),
    });
  }

  return normalizeOpenAiProviderMessage({
    code: readStringField(value, "code"),
    message: readStringField(value, "message"),
    status,
    type: readStringField(value, "type"),
  });
}

function normalizeOpenAiProviderMessage(error: OpenAiProviderErrorData): string | null {
  const safeMessage = sanitizeOpenAiErrorMessage(error.message ?? "");
  const lowerMessage = safeMessage.toLowerCase();
  const lowerCode = error.code?.toLowerCase() ?? "";
  const lowerType = error.type?.toLowerCase() ?? "";

  if (
    error.status === 401 ||
    lowerCode === "invalid_api_key" ||
    lowerMessage.includes("incorrect api key") ||
    lowerMessage.includes("invalid api key")
  ) {
    return `OpenAI API 키가 유효하지 않습니다. 설정에서 ${MASKED_OPENAI_SECRET_PREFIX} 키를 다시 저장해 주세요.`;
  }

  if (
    lowerCode === "insufficient_quota" ||
    lowerType === "insufficient_quota" ||
    lowerMessage.includes("current quota") ||
    lowerMessage.includes("billing") ||
    lowerMessage.includes("credits") ||
    lowerMessage.includes("no balance")
  ) {
    return "OpenAI API 크레딧 또는 사용 한도가 부족합니다. OpenAI Platform의 Billing/Usage Limits를 확인해 주세요.";
  }

  if (
    error.status === 403 ||
    lowerCode === "model_not_found" ||
    lowerMessage.includes("organization must be verified") ||
    lowerMessage.includes("must be verified") ||
    lowerMessage.includes("does not have access to model") ||
    lowerMessage.includes("model access")
  ) {
    return "OpenAI 조직 인증 또는 이미지 모델 권한이 필요합니다. Platform에서 Organization Verification, 프로젝트 권한, 모델 설정을 확인해 주세요.";
  }

  return safeMessage.length > 0 ? safeMessage : null;
}

function sanitizeOpenAiErrorMessage(message: string): string {
  const normalized = message
    .replace(/\s+/g, " ")
    .replace(OPENAI_SECRET_PATTERN, MASKED_OPENAI_SECRET_PREFIX)
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ...")
    .trim();
  return normalized.length > 240 ? `${normalized.slice(0, 240)}...` : normalized;
}

function readStringField(record: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
