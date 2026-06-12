import type { ProductImageStudioProviderName } from "@/features/product-image-studio/domain/types";
import type {
  ProductImageStudioProviderSettingsStorageMode,
  ProductImageStudioProviderSettingsSummary,
} from "@/features/product-image-studio/server/providerSettingsStore";

export type ProductImageStudioProviderSettingsPayload = {
  readonly apiKey: string;
  readonly generationEnabled: boolean;
  readonly model: string;
  readonly provider: ProductImageStudioProviderName;
};

export type RequestProductImageStudioProviderSettingsResult =
  | {
      readonly ok: true;
      readonly settings: ProductImageStudioProviderSettingsSummary | null;
      readonly storageMode: ProductImageStudioProviderSettingsStorageMode;
    }
  | {
      readonly message: string;
      readonly ok: false;
    };

export async function requestProductImageStudioProviderSettings(
  method: "DELETE" | "POST",
  payload: ProductImageStudioProviderSettingsPayload | null,
): Promise<RequestProductImageStudioProviderSettingsResult> {
  const response = await fetch("/api/product-image-studio/provider-settings", {
    body: payload ? JSON.stringify(payload) : undefined,
    headers: payload ? { "content-type": "application/json" } : undefined,
    method,
  });
  const body = await readJson(response);
  if (!response.ok) {
    return { message: readErrorMessage(body), ok: false };
  }

  const data = isRecord(body) ? body["data"] : null;
  if (!isRecord(data)) {
    return { message: "provider 설정 응답 형식이 올바르지 않습니다.", ok: false };
  }

  return {
    ok: true,
    settings: readSettings(data["settings"]),
    storageMode: readStorageMode(data["storageMode"]) ?? "memory",
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readSettings(value: unknown): ProductImageStudioProviderSettingsSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  const provider = readProvider(value["provider"]);
  const storageMode = readStorageMode(value["storageMode"]);
  if (!provider || !storageMode || typeof value["model"] !== "string" || typeof value["updatedAt"] !== "string") {
    return null;
  }

  return {
    generationEnabled: value["generationEnabled"] === true,
    hasCredential: value["hasCredential"] === true,
    model: value["model"],
    provider,
    storageMode,
    updatedAt: value["updatedAt"],
  };
}

function readProvider(value: unknown): ProductImageStudioProviderName | null {
  return value === "openai" || value === "gemini" ? value : null;
}

function readStorageMode(value: unknown): ProductImageStudioProviderSettingsStorageMode | null {
  return value === "memory" || value === "postgres" ? value : null;
}

function readErrorMessage(value: unknown): string {
  if (!isRecord(value)) {
    return "provider 설정을 저장하지 못했습니다.";
  }

  if (typeof value["message"] === "string") {
    return value["message"];
  }

  if (!isRecord(value["error"]) || typeof value["error"]["message"] !== "string") {
    return "provider 설정을 저장하지 못했습니다.";
  }

  return value["error"]["message"];
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
