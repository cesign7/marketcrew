import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";
import { getProductImageStudioProviderApiKeyAssignmentNames } from "@/features/product-image-studio/server/providerEnvCredential";

type ProviderApiKeyInputResult =
  | { readonly apiKey: string | null; readonly ok: true }
  | { readonly error: { readonly code: string; readonly message: string }; readonly ok: false };

type ProviderApiKeyInputRule = {
  readonly assignmentNames: readonly string[];
  readonly invalidMessage: string;
  readonly prefix: string;
};

const OPENAI_SECRET_PREFIX = ["s", "k-"].join("");

const PROVIDER_API_KEY_INPUT_RULES: Record<ProductImageStudioProviderName, ProviderApiKeyInputRule> = {
  gemini: {
    assignmentNames: getProductImageStudioProviderApiKeyAssignmentNames("gemini"),
    invalidMessage: "Gemini API 키는 Google AI Studio에서 발급한 AIza... 형식이어야 합니다.",
    prefix: "AIza",
  },
  openai: {
    assignmentNames: getProductImageStudioProviderApiKeyAssignmentNames("openai"),
    invalidMessage: `OpenAI API 키는 ${OPENAI_SECRET_PREFIX}로 시작하는 OpenAI 키여야 합니다.`,
    prefix: OPENAI_SECRET_PREFIX,
  },
};

export function parseProductImageStudioProviderApiKeyInput(
  provider: ProductImageStudioProviderName,
  value: unknown,
): ProviderApiKeyInputResult {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { apiKey: null, ok: true };
  }

  const extracted = extractProviderApiKey(provider, value);
  if (!extracted.ok) {
    return extracted;
  }

  const apiKey = extracted.apiKey;
  if (!apiKey) {
    return providerApiKeyInputError("API_KEY_REQUIRED", "API 키를 입력해 주세요.");
  }

  if (isMaskedProviderKey(apiKey)) {
    return providerApiKeyInputError(
      "MASKED_API_KEY",
      "마스킹된 키는 저장할 수 없습니다. provider에서 복사한 원본 API 키를 입력해 주세요.",
    );
  }

  const rule = PROVIDER_API_KEY_INPUT_RULES[provider];
  if (!apiKey.startsWith(rule.prefix) || /\s|=/.test(apiKey) || apiKey.length < 20) {
    return providerApiKeyInputError("INVALID_API_KEY_FORMAT", rule.invalidMessage);
  }

  return { apiKey, ok: true };
}

function extractProviderApiKey(provider: ProductImageStudioProviderName, rawValue: string): ProviderApiKeyInputResult {
  const lines = rawValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const providerRule = PROVIDER_API_KEY_INPUT_RULES[provider];
  const knownAssignmentNames = new Set(
    Object.values(PROVIDER_API_KEY_INPUT_RULES).flatMap((rule) => rule.assignmentNames),
  );

  for (const line of lines) {
    const assignment = readAssignment(line);
    if (!assignment) {
      continue;
    }
    if (providerRule.assignmentNames.includes(assignment.name)) {
      return { apiKey: cleanApiKeyValue(assignment.value), ok: true };
    }
    if (knownAssignmentNames.has(assignment.name)) {
      return providerApiKeyInputError(
        "WRONG_PROVIDER_API_KEY",
        `${providerLabel(provider)} 입력칸에는 ${providerLabel(provider)} API 키만 넣어 주세요.`,
      );
    }
  }

  return { apiKey: cleanApiKeyValue(lines[0] ?? ""), ok: true };
}

function readAssignment(line: string): { readonly name: string; readonly value: string } | null {
  const normalized = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
  const match = /^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/.exec(normalized);
  if (!match) {
    return null;
  }
  return { name: match[1] ?? "", value: match[2] ?? "" };
}

function cleanApiKeyValue(value: string): string {
  let cleaned = value.trim();
  if (cleaned.endsWith(";")) {
    cleaned = cleaned.slice(0, -1).trim();
  }
  const first = cleaned.at(0);
  const last = cleaned.at(-1);
  if ((first === "\"" && last === "\"") || (first === "'" && last === "'") || (first === "`" && last === "`")) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

function isMaskedProviderKey(value: string): boolean {
  return /[*•…]/.test(value) || value.includes("****");
}

function providerLabel(provider: ProductImageStudioProviderName): string {
  switch (provider) {
    case "gemini":
      return "Gemini";
    case "openai":
      return "OpenAI";
  }
}

function providerApiKeyInputError(code: string, message: string): Extract<ProviderApiKeyInputResult, { readonly ok: false }> {
  return { error: { code, message }, ok: false };
}
