import type {
  ProductImageStudioAssetRole,
  ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";
import {
  buildProductImageStudioCreateProjectPayload,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import {
  readProductImageStudioJsonPayload,
  readProductImageStudioProjectResultIds,
  recoverProductImageStudioStoredGenerationResults,
} from "@/features/product-image-studio/client/generationResultRecovery";
import {
  readProductImageStudioGenerationResponse,
  type ProductImageStudioGenerationPayload,
  type ProductImageStudioGenerationResultPreview,
  type ProductImageStudioGenerationState,
} from "@/features/product-image-studio/domain/generationWorkflow";

export type ProductImageStudioConceptCard = {
  readonly id: string;
  readonly label: string;
  readonly styleTags: readonly string[];
  readonly summary: string;
};

export type ProductImageStudioClientResult<Value> =
  | {
      readonly ok: true;
      readonly value: Value;
    }
  | {
      readonly message: string;
      readonly ok: false;
    };

export type ProductImageStudioRegenerateRatioPayload = {
  readonly customDimensions?: { readonly height: number; readonly width: number };
  readonly ratio: ProductImageStudioRatioPreset;
};

export async function createProductImageStudioProject(
  state: ProductImageStudioWizardState,
): Promise<ProductImageStudioClientResult<string>> {
  const response = await fetch("/api/product-image-studio/projects", {
    body: JSON.stringify(buildProductImageStudioCreateProjectPayload(state)),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload: unknown = await response.json();
  const projectId = readProjectId(payload);
  if (!response.ok || !projectId) {
    return { message: "프로젝트를 만들지 못했습니다. 입력값을 확인해 주세요.", ok: false };
  }

  return { ok: true, value: projectId };
}

export async function uploadProductImageStudioAsset(
  projectId: string,
  role: ProductImageStudioAssetRole,
  file: File,
): Promise<ProductImageStudioClientResult<ProductImageStudioAssetRole>> {
  const formData = new FormData();
  formData.append("role", role);
  formData.append("file", file);

  const response = await fetch(`/api/product-image-studio/projects/${encodeURIComponent(projectId)}/assets`, {
    body: formData,
    method: "POST",
  });

  if (!response.ok) {
    return { message: "이미지를 업로드하지 못했습니다. 파일 형식과 카드 형식을 확인해 주세요.", ok: false };
  }

  return { ok: true, value: role };
}

export async function fetchProductImageStudioConcepts(): Promise<
  ProductImageStudioClientResult<readonly ProductImageStudioConceptCard[]>
> {
  const response = await fetch("/api/product-image-studio/concepts?productType=card_envelope_seal_set", {
    cache: "no-store",
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    return { message: "추천 콘셉트를 불러오지 못했습니다.", ok: false };
  }

  return { ok: true, value: readProductImageStudioConceptCards(payload) };
}

export async function startProductImageStudioGeneration(
  projectId: string,
  payload: ProductImageStudioGenerationPayload,
): Promise<ProductImageStudioGenerationState> {
  const knownResultIds = await readProductImageStudioProjectResultIds(projectId);
  try {
    const response = await fetch(`/api/product-image-studio/projects/${encodeURIComponent(projectId)}/generations`, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const responsePayload = await readProductImageStudioJsonPayload(response);
    const state = readProductImageStudioGenerationResponse(responsePayload);
    if (state.phase !== "failed") {
      return state;
    }
    return recoverGenerationState(projectId, knownResultIds, payload, state.message);
  } catch (error) {
    if (error instanceof TypeError || error instanceof DOMException) {
      return recoverGenerationState(projectId, knownResultIds, payload, "생성 응답을 읽지 못했습니다.");
    }
    throw error;
  }
}

export async function regenerateProductImageStudioResultRatio(
  projectId: string,
  resultId: string,
  payload: ProductImageStudioRegenerateRatioPayload,
): Promise<ProductImageStudioClientResult<ProductImageStudioGenerationResultPreview>> {
  const response = await fetch(
    `/api/product-image-studio/projects/${encodeURIComponent(projectId)}/results/${encodeURIComponent(resultId)}/regenerate-ratio`,
    {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  const responsePayload: unknown = await response.json();
  if (!response.ok) {
    return { message: "비율 변경 이미지를 만들지 못했습니다. 크기와 결과를 확인해 주세요.", ok: false };
  }

  const state = readProductImageStudioGenerationResponse(responsePayload);
  const result = state.results.length > 0 ? state.results[0] : undefined;
  if (state.phase !== "ready" || !result) {
    return { message: "비율 변경 결과를 읽지 못했습니다.", ok: false };
  }

  return { ok: true, value: result };
}

function readProjectId(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const id = payload["id"];
  return typeof id === "string" ? id : null;
}

async function recoverGenerationState(
  projectId: string,
  knownResultIds: ReadonlySet<string>,
  payload: ProductImageStudioGenerationPayload,
  fallbackMessage: string,
): Promise<ProductImageStudioGenerationState> {
  const recoveredResults = await recoverProductImageStudioStoredGenerationResults(projectId, knownResultIds);
  if (recoveredResults.length > 0) {
    return {
      message: "생성 응답은 끊겼지만 저장된 이미지를 불러왔습니다.",
      phase: "ready",
      results: recoveredResults,
      selectedConceptId: null,
      selectedProvider: payload.provider,
    };
  }

  return {
    message: fallbackMessage,
    phase: "failed",
    results: [],
    selectedConceptId: null,
    selectedProvider: payload.provider,
  };
}

export function readProductImageStudioConceptCards(payload: unknown): readonly ProductImageStudioConceptCard[] {
  const concepts = readConceptArray(payload);
  if (!concepts) {
    return [];
  }

  return concepts.flatMap((concept) => {
    if (!isRecord(concept)) {
      return [];
    }
    const id = concept["id"];
    const label = concept["label"];
    const summary = concept["summary"];
    const tags = concept["styleTags"];
    if (typeof id !== "string" || typeof label !== "string" || typeof summary !== "string" || !Array.isArray(tags)) {
      return [];
    }
    return [{ id, label, styleTags: tags.filter((tag): tag is string => typeof tag === "string"), summary }];
  });
}

function readConceptArray(payload: unknown): readonly unknown[] | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (Array.isArray(payload["concepts"])) {
    return payload["concepts"];
  }

  const data = payload["data"];
  if (isRecord(data) && Array.isArray(data["concepts"])) {
    return data["concepts"];
  }

  return null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
