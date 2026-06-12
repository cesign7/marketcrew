import {
  readProductImageStudioGenerationResponse,
  type ProductImageStudioGenerationResultPreview,
} from "@/features/product-image-studio/domain/generationWorkflow";

type ProductImageStudioGenerationArchiveResult = {
  readonly cardPose: unknown;
  readonly generationRequestId: string;
  readonly id: string;
  readonly outputType: unknown;
  readonly previewUrl: unknown;
  readonly ratio: unknown;
};

export async function readProductImageStudioProjectResultIds(projectId: string): Promise<ReadonlySet<string>> {
  const results = await fetchProductImageStudioProjectResultPreviews(projectId);
  return new Set(results.map((result) => result.id));
}

export async function recoverProductImageStudioStoredGenerationResults(
  projectId: string,
  knownResultIds: ReadonlySet<string>,
): Promise<readonly ProductImageStudioGenerationResultPreview[]> {
  const results = await fetchProductImageStudioProjectResultPreviews(projectId);
  return results.filter((result) => !knownResultIds.has(result.id));
}

export async function readProductImageStudioJsonPayload(response: Response): Promise<unknown | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return null;
    }
    throw error;
  }
}

async function fetchProductImageStudioProjectResultPreviews(
  projectId: string,
): Promise<readonly ProductImageStudioGenerationResultPreview[]> {
  try {
    const response = await fetch(`/api/product-image-studio/projects/${encodeURIComponent(projectId)}/results`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }
    return readArchiveResultPreviews(await readProductImageStudioJsonPayload(response));
  } catch (error) {
    if (error instanceof TypeError || error instanceof DOMException) {
      return [];
    }
    throw error;
  }
}

function readArchiveResultPreviews(payload: unknown): readonly ProductImageStudioGenerationResultPreview[] {
  if (!isRecord(payload) || payload["ok"] !== true || !Array.isArray(payload["results"])) {
    return [];
  }

  const results = payload["results"].flatMap((item): readonly ProductImageStudioGenerationArchiveResult[] => {
    if (!isRecord(item)) {
      return [];
    }
    const resultId = item["resultId"];
    const generationId = item["generationId"];
    if (typeof resultId !== "string" || typeof generationId !== "string") {
      return [];
    }
    return [
      {
        cardPose: item["cardPose"],
        generationRequestId: generationId,
        id: resultId,
        outputType: item["outputType"],
        previewUrl: item["previewUrl"],
        ratio: item["ratio"],
      },
    ];
  });

  return readProductImageStudioGenerationResponse({
    data: {
      generation: { id: "archive-recovery", status: "ready" },
      results,
    },
    ok: true,
  }).results;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
