import { NextResponse } from "next/server";
import {
  PRODUCT_IMAGE_STUDIO_PROVIDERS,
  type ProductImageStudioProviderName,
} from "@/features/product-image-studio/domain/types";
import { getConfiguredProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import {
  deleteProductImageStudioProviderSettings,
  getProductImageStudioProviderSettingsStorageMode,
  getProductImageStudioProviderSettingsSummary,
  saveProductImageStudioProviderSettings,
  type SaveProductImageStudioProviderSettingsInput,
} from "@/features/product-image-studio/server/providerSettingsStore";

export const dynamic = "force-dynamic";

export async function GET(_request: Request) {
  return providerSettingsResponse();
}

export async function POST(request: Request) {
  const parsed = parseProviderSettingsPayload(await readJsonPayload(request));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, ok: false }, { status: 400 });
  }

  const saved = await saveProductImageStudioProviderSettings(parsed.input);
  if (!saved.ok) {
    return NextResponse.json({ error: saved.error, ok: false }, { status: 400 });
  }

  return providerSettingsResponse();
}

export async function DELETE(_request: Request) {
  await deleteProductImageStudioProviderSettings();
  return providerSettingsResponse();
}

async function providerSettingsResponse() {
  return NextResponse.json({
    data: {
      settings: await getProductImageStudioProviderSettingsSummary(),
      status: await getConfiguredProductImageStudioProviderStatus(),
      storageMode: getProductImageStudioProviderSettingsStorageMode(),
    },
    ok: true,
  });
}

function parseProviderSettingsPayload(
  payload: unknown,
):
  | {
      readonly input: SaveProductImageStudioProviderSettingsInput;
      readonly ok: true;
    }
  | {
      readonly error: {
        readonly code: string;
        readonly message: string;
      };
      readonly ok: false;
    } {
  if (!isRecord(payload)) {
    return invalidPayload("INVALID_JSON", "provider 설정 요청 형식이 올바르지 않습니다.");
  }

  const provider = parseProviderName(payload["provider"]);
  if (!provider) {
    return invalidPayload("INVALID_PROVIDER", "OpenAI 또는 Gemini provider를 선택해 주세요.");
  }

  const model = typeof payload["model"] === "string" ? payload["model"].trim() : "";
  if (!model) {
    return invalidPayload("MODEL_REQUIRED", "이미지 생성 모델을 입력해 주세요.");
  }

  const apiKey = typeof payload["apiKey"] === "string" && payload["apiKey"].trim() ? payload["apiKey"].trim() : null;
  return {
    input: {
      apiKey,
      generationEnabled: payload["generationEnabled"] === true,
      model,
      provider,
    },
    ok: true,
  };
}

async function readJsonPayload(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseProviderName(value: unknown): ProductImageStudioProviderName | null {
  for (const provider of PRODUCT_IMAGE_STUDIO_PROVIDERS) {
    if (provider === value) {
      return provider;
    }
  }
  return null;
}

function invalidPayload(
  code: string,
  message: string,
): { readonly error: { readonly code: string; readonly message: string }; readonly ok: false } {
  return { error: { code, message }, ok: false };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
