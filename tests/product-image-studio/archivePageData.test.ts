import { describe, expect, it } from "vitest";
import {
  createProductImageStudioArchivePageRequestOptions,
  loadProductImageStudioProjectArchivePageData,
  loadProductImageStudioProjectDetailArchivePageData,
  loadProductImageStudioResultArchivePageData,
} from "@/features/product-image-studio/server/archivePageData";
import { manualProductionSettings } from "./manualProductionSettings";

describe("product image studio archive page data", () => {
  it("loads project summaries through the local API route and forwards cookies", async () => {
    const calls: FetchCall[] = [];

    const projects = await loadProductImageStudioProjectArchivePageData({
      cookie: "archive_session=fixture",
      fetcher: archiveFetch(calls, { ok: true, projects: [projectSummary()] }),
      origin: "https://marketcrew.app",
    });

    expect(calls).toEqual([
      expect.objectContaining({
        cookie: "archive_session=fixture",
        url: "https://marketcrew.app/api/product-image-studio/projects",
      }),
    ]);
    expect(projects).toEqual([expect.objectContaining({ name: "봄 초대장 세트", resultCount: 2 })]);
  });

  it("loads all results and project detail through archive API routes", async () => {
    const calls: FetchCall[] = [];
    const options = {
      fetcher: archiveFetch(calls, {
        ok: true,
        project: projectRecord(),
        results: [archiveItem()],
      }),
      origin: "https://marketcrew.app",
    };

    const results = await loadProductImageStudioResultArchivePageData({
      ...options,
      fetcher: archiveFetch(calls, { ok: true, results: [archiveItem()] }),
    });
    const detail = await loadProductImageStudioProjectDetailArchivePageData("project-1", options);

    expect(calls.map((call) => call.url)).toEqual([
      "https://marketcrew.app/api/product-image-studio/results",
      "https://marketcrew.app/api/product-image-studio/projects/project-1/results",
    ]);
    expect(results[0]?.resultId).toBe("result-1");
    expect(detail?.project.name).toBe("봄 초대장 세트");
    expect(detail?.results[0]?.provider).toBe("openai");
  });

  it("derives origin and cookie from request headers", () => {
    const options = createProductImageStudioArchivePageRequestOptions(headerStore());

    expect(options.origin).toBe("https://marketcrew.app");
    expect(options.cookie).toBe("archive_session=fixture");
  });
});

type FetchCall = {
  readonly cookie: string | null;
  readonly url: string;
};

function archiveFetch(calls: FetchCall[], body: unknown) {
  return async (url: string, init: RequestInit) => {
    const headers = new Headers(init.headers);
    calls.push({ cookie: headers.get("cookie"), url });
    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  };
}

function headerStore() {
  const headers = new Map([
    ["cookie", "archive_session=fixture"],
    ["x-forwarded-host", "marketcrew.app"],
    ["x-forwarded-proto", "https"],
  ]);
  return { get: (key: string) => headers.get(key) ?? null };
}

function projectSummary() {
  return {
    cardFormat: "folded_card",
    createdAt: "2026-06-11T00:00:00.000Z",
    id: "project-1",
    latestResultAt: "2026-06-11T00:04:00.000Z",
    name: "봄 초대장 세트",
    productType: "card_envelope_seal_set",
    resultCount: 2,
    updatedAt: "2026-06-11T00:01:00.000Z",
    zipDownloadUrl: "/api/product-image-studio/projects/project-1/downloads.zip",
  };
}

function projectRecord() {
  return {
    cardFormat: "folded_card",
    createdAt: "2026-06-11T00:00:00.000Z",
    id: "project-1",
    name: "봄 초대장 세트",
    productType: "card_envelope_seal_set",
    productionSettings: manualProductionSettings("folded_card"),
    qualityMode: "draft",
    ratios: ["1:1"],
    requestedCardPoses: ["folded_closed"],
    requestedOutputs: ["card_single"],
    updatedAt: "2026-06-11T00:01:00.000Z",
  };
}

function archiveItem() {
  return {
    cardPose: "folded_closed",
    createdAt: "2026-06-11T00:04:00.000Z",
    downloadUrl: "/api/product-image-studio/projects/project-1/results/result-1/download",
    generationId: "generation-1",
    height: 1200,
    model: "gpt-image-1",
    outputType: "card_single",
    previewUrl: "/api/product-image-studio/projects/project-1/results/result-1/preview",
    projectId: "project-1",
    projectName: "봄 초대장 세트",
    projectZipUrl: "/api/product-image-studio/projects/project-1/downloads.zip",
    provider: "openai",
    ratio: "1:1",
    resultId: "result-1",
    width: 1200,
  };
}
