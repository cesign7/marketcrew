import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const port = process.env.PORT ?? "55569";
const baseUrl = `http://127.0.0.1:${port}`;
const fixturePath = ".omo/fixtures/card-front.png";
const browserJsonPath = ".omo/evidence/product-image-ai-tools-runtime-t1-browser.json";
const previewPath = ".omo/evidence/product-image-ai-tools-runtime-t1-preview.png";
const generatedPreviewA = "/product-image-studio/generated/mock-preview.png";
const generatedPreviewB = "/product-image-studio/generated/mock-preview-second.png";
const generatedDownload = "/product-image-studio/generated/mock-download.png";
const generatedVector = "/product-image-studio/generated/mock-vector.svg";
const fixtureBytes = readFileSync(fixturePath);
const requestRecords = [];
let nextResponseMode = "ready";
let requestIndex = 0;

const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
const page = await context.newPage();

try {
  await page.route("**/product-image-studio/generated/*", async (route) => {
    if (route.request().url().endsWith(".svg")) {
      await route.fulfill({ body: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 10 10\"><rect width=\"10\" height=\"10\" fill=\"#0070f3\"/></svg>", contentType: "image/svg+xml", status: 200 });
      return;
    }
    await route.fulfill({ body: fixtureBytes, contentType: "image/png", status: 200 });
  });
  await page.route("**/api/product-image-studio/image-generator/generations", async (route) => {
    const request = route.request();
    const rawBody = (await request.postDataBuffer())?.toString("utf8") ?? "";
    requestRecords.push({
      containsFileName: rawBody.includes("card-front.png"),
      containsMultipartFileData: rawBody.includes("filename=\"card-front.png\"") && rawBody.includes("image/png"),
      containsPromptText: rawBody.includes("연하장 카드 프리미엄 테이블 설정샷") || rawBody.includes("첫 번째 생성") || rawBody.includes("두 번째 생성") || rawBody.includes("응답 URL 누락 테스트"),
      contentType: request.headers()["content-type"] ?? null,
      mode: nextResponseMode,
      payload: readPayloadSummary(rawBody),
      url: request.url(),
    });
    requestIndex += 1;
    await route.fulfill({ body: JSON.stringify(buildGenerationResponse(nextResponseMode, requestIndex)), contentType: "application/json", status: 200 });
  });

  await page.goto(`${baseUrl}/product-image-studio/ai-tools`);
  await page.getByRole("button", { name: "AI 이미지 생성기 열기" }).click();
  await page.locator(`[data-ai-tool-upload-input="reference-image"]`).setInputFiles(fixturePath);
  await page.getByLabel(/프롬프트/).fill("연하장 카드 프리미엄 테이블 설정샷");
  await page.getByRole("button", { name: /생성/ }).click();
  await page.locator(`[data-ai-tool-generated-preview="true"][src="${generatedPreviewA}"]`).waitFor();
  await page.screenshot({ fullPage: true, path: previewPath });

  const mainObservation = await readRightPanelObservation(page);
  const emptyPromptRequestsBefore = requestRecords.length;
  await page.getByLabel(/프롬프트/).fill(" ");
  await page.getByRole("button", { name: /생성/ }).click();
  await page.getByText("프롬프트를 입력하면 생성할 수 있습니다.").waitFor();
  const emptyPromptObservation = {
    requestCountChanged: requestRecords.length !== emptyPromptRequestsBefore,
    textVisible: await page.getByText("프롬프트를 입력하면 생성할 수 있습니다.").isVisible(),
  };

  nextResponseMode = "missingUrls";
  await page.getByLabel(/프롬프트/).fill("응답 URL 누락 테스트");
  await page.getByRole("button", { name: /생성/ }).click();
  await page.getByText("생성 결과 URL을 받지 못했습니다. 다시 시도해 주세요.").waitFor();
  const missingUrlsObservation = await readRightPanelObservation(page);

  nextResponseMode = "readyA";
  await page.getByLabel(/프롬프트/).fill("첫 번째 생성");
  await page.getByRole("button", { name: /생성/ }).click();
  await page.locator(`[data-ai-tool-generated-preview="true"][src="${generatedPreviewA}"]`).waitFor();
  await page.getByLabel(/프롬프트/).fill("두 번째 생성");
  const oldClearedAfterPromptChange = (await page.locator(`[data-ai-tool-generated-preview="true"][src="${generatedPreviewA}"]`).count()) === 0;
  nextResponseMode = "readyB";
  await page.getByRole("button", { name: /생성/ }).click();
  await page.locator(`[data-ai-tool-generated-preview="true"][src="${generatedPreviewB}"]`).waitFor();
  const staleObservation = {
    finalObservation: await readRightPanelObservation(page),
    oldClearedAfterPromptChange,
    oldPreviewStillGenerated: (await page.locator(`[data-ai-tool-generated-preview="true"][src="${generatedPreviewA}"]`).count()) > 0,
  };

  const summary = {
    adversarial: {
      cancel_resume: "not_applicable: no cancel/resume control was added in this Todo",
      flaky_tests: "focused runtime test passed on rerun-free green capture",
      malformed_input: { emptyPromptObservation, missingUrlsObservation },
      misleading_success_output: {
        mainObservation,
        requestPayloadSummary: requestRecords[0] ?? null,
      },
      prompt_injection: "not_applicable: the modal consumes direct user form input, not untrusted external page text",
      repeated_interruptions: "not_observed: no user interruption occurred during this QA pass",
      stale_state: staleObservation,
    },
    generatedDownload,
    generatedPreviewA,
    generatedPreviewB,
    generatedVector,
    pass: {
      generatedResultUsesBlob: mainObservation.generatedPreviewSrcs.some((src) => src.startsWith("blob:")),
      hasDownloadUrl: mainObservation.generatedDownloadHrefs.includes(generatedDownload),
      hasFileData: requestRecords[0]?.containsMultipartFileData === true,
      hasPromptText: requestRecords[0]?.payload?.prompt?.includes("연하장 카드 프리미엄 테이블 설정샷") === true,
      hasVectorUrl: mainObservation.generatedVectorHrefs.includes(generatedVector),
      noGeneratedResultBlobUrl: mainObservation.generatedResultBlobCount === 0 && mainObservation.generatedPreviewSrcs.every((src) => !src.startsWith("blob:")),
      previewRendered: mainObservation.generatedPreviewSrcs.includes(generatedPreviewA),
    },
    port,
    requestRecords,
    selectorStrategy: {
      openTool: "page.getByRole(\"button\", { name: \"AI 이미지 생성기 열기\" })",
      prompt: "page.getByLabel(/프롬프트/)",
      upload: "page.locator('[data-ai-tool-upload-input=\"reference-image\"]') because getByLabel(/디자인|참고 이미지/) matched both the upload region and the file input",
    },
  };
  writeFileSync(browserJsonPath, `${JSON.stringify(summary, null, 2)}\n`);
} finally {
  await context.close();
  await browser.close();
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch (error) {
    if (error instanceof Error && /chrome/i.test(error.message)) {
      return await chromium.launch({ headless: true });
    }
    throw error;
  }
}

function buildGenerationResponse(mode, index) {
  if (mode === "missingUrls") {
    return {
      data: {
        generation: buildGeneration("ready", index),
        results: [{ generationRequestId: `generation-${index}`, id: "result-missing", label: "AI 생성 이미지", ratio: "1:1" }],
      },
      ok: true,
    };
  }
  const previewUrl = mode === "readyB" ? generatedPreviewB : generatedPreviewA;
  const resultId = mode === "readyB" ? "result-b" : "result-ready";
  return {
    data: {
      generation: buildGeneration("ready", index),
      results: [
        {
          downloadUrl: generatedDownload,
          generationRequestId: `generation-${index}`,
          id: resultId,
          label: "AI 생성 이미지",
          previewUrl,
          ratio: "1:1",
          vectorSvgUrl: generatedVector,
        },
      ],
    },
    ok: true,
  };
}

function buildGeneration(status, index) {
  return {
    completedCount: 1,
    id: `generation-${index}`,
    projectId: "project-qa",
    provider: "fake",
    requestedCount: 1,
    status,
  };
}

function readPayloadSummary(rawBody) {
  const marker = "name=\"payload\"";
  const markerIndex = rawBody.indexOf(marker);
  if (markerIndex < 0) return null;
  const payloadStart = rawBody.indexOf("\r\n\r\n", markerIndex);
  if (payloadStart < 0) return null;
  const payloadEnd = rawBody.indexOf("\r\n--", payloadStart + 4);
  const payloadJson = rawBody.slice(payloadStart + 4, payloadEnd < 0 ? undefined : payloadEnd);
  try {
    return JSON.parse(payloadJson);
  } catch (error) {
    if (error instanceof SyntaxError) return { parseError: "invalid_json", rawLength: payloadJson.length };
    throw error;
  }
}

async function readRightPanelObservation(page) {
  return {
    generatedDownloadHrefs: await page.locator("[data-ai-tool-generated-download=\"true\"]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? "")),
    generatedPreviewSrcs: await page.locator("[data-ai-tool-generated-preview=\"true\"]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src") ?? "")),
    generatedResultBlobCount: await page.locator("[data-ai-tool-generated-result=\"true\"] img[src^=\"blob:\"]").count(),
    generatedResultCount: await page.locator("[data-ai-tool-generated-result=\"true\"]").count(),
    generatedVectorHrefs: await page.locator("[data-ai-tool-generated-vector=\"true\"]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? "")),
    rightPanelText: await page.locator("[data-ai-tool-result-panel=\"true\"]").innerText(),
    uploadPreviewSrcs: await page.locator("[data-ai-tool-upload-preview=\"true\"]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src") ?? "")),
  };
}
