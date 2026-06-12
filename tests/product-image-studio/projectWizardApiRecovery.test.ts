import { afterEach, describe, expect, it, vi } from "vitest";
import { startProductImageStudioGeneration } from "@/features/product-image-studio/client/projectWizardApi";
import { manualCardOnlyProductionSettings } from "./manualProductionSettings";

describe("product image studio project wizard API recovery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("recovers newly stored results when the generation response is not JSON", async () => {
    const oldResult = archiveResult("old-result", "old-generation", "card_single");
    const newResult = archiveResult("new-result", "new-generation", "card_single");
    let resultListCallCount = 0;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/product-image-studio/projects/project-1/results")) {
        resultListCallCount += 1;
        return jsonResponse({ ok: true, results: resultListCallCount === 1 ? [oldResult] : [oldResult, newResult] });
      }
      if (url.endsWith("/api/product-image-studio/projects/project-1/generations")) {
        return new Response("Application failed to respond", {
          headers: { "content-type": "text/plain" },
          status: 504,
        });
      }
      return jsonResponse({ ok: false }, 404);
    });

    const state = await startProductImageStudioGeneration("project-1", {
      conceptId: "minimal-studio",
      outputs: ["card_single"],
      productionSettings: manualCardOnlyProductionSettings(),
      provider: "openai",
      qualityMode: "draft",
    });

    expect(state.phase).toBe("ready");
    expect(state.message).toBe("생성 응답은 끊겼지만 저장된 이미지를 불러왔습니다.");
    expect(state.results.map((result) => result.id)).toEqual(["new-result"]);
    expect(resultListCallCount).toBe(2);
  });
});

function archiveResult(resultId: string, generationId: string, outputType: "card_single") {
  return {
    createdAt: "2026-06-12T08:00:00.000Z",
    downloadUrl: `/api/product-image-studio/projects/project-1/results/${resultId}/download`,
    generationId,
    height: 1024,
    model: "gpt-image-2",
    outputType,
    previewUrl: `/api/product-image-studio/projects/project-1/results/${resultId}/preview`,
    projectId: "project-1",
    projectName: "봄 초대장 세트",
    projectZipUrl: "/api/product-image-studio/projects/project-1/downloads.zip",
    provider: "openai",
    ratio: "1:1",
    resultId,
    width: 1024,
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status,
  });
}
