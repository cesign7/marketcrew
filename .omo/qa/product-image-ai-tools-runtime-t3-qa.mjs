import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";
import { join } from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);
const runtimeEnv = process["env"];
const playwright = loadPlaywright();
const { chromium } = playwright.module;

const evidenceDir = ".omo/evidence";
const browserJsonPath = `${evidenceDir}/product-image-ai-tools-runtime-t3-browser.json`;
const readyPngPath = `${evidenceDir}/product-image-ai-tools-runtime-t3-ready.png`;
const failedPngPath = `${evidenceDir}/product-image-ai-tools-runtime-t3-failed.png`;
const cleanupPath = `${evidenceDir}/product-image-ai-tools-runtime-t3-cleanup.txt`;
const fixturePath = ".omo/fixtures/card-front.png";
const expectedPromptFragments = ["연하장 카드 프리미엄 테이블 설정샷", "실패 상태 확인"];

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64",
);

const startedAt = new Date().toISOString();
const port = await findFreePort();
const url = `http://127.0.0.1:${port}`;
const cleanupLines = [`START ${startedAt}`, `port=${port}`];
let server;
let browser;
const serverLogs = [];

try {
  await mkdir(evidenceDir, { recursive: true });
  server = spawn("./node_modules/.bin/next", ["dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    env: { ...runtimeEnv, MARKETCREW_AUTH_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  cleanupLines.push(`dev_server_pid=${server.pid ?? "unknown"}`);
  server.stdout.on("data", (chunk) => serverLogs.push(chunk.toString()));
  server.stderr.on("data", (chunk) => serverLogs.push(chunk.toString()));
  await waitForHttp(url, 120_000);

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const requests = [];
  const responses = [];
  let responseMode = "ready";

  await page.route("**/api/product-image-studio/qa/**", async (route) => {
    const requestUrl = route.request().url();
    if (requestUrl.endsWith(".svg")) {
      await route.fulfill({
        contentType: "image/svg+xml",
        status: 200,
        body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><rect width="12" height="12" fill="#2563eb"/></svg>',
      });
      return;
    }
    await route.fulfill({ body: tinyPng, contentType: "image/png", status: 200 });
  });

  await page.route("**/api/product-image-studio/image-generator/generations", async (route) => {
    const request = route.request();
    const postData = request.postData() ?? "";
    const payloadSummary = readMultipartPayloadSummary(postData);
    const fileSummary = readMultipartFileSummary(postData);
    requests.push({
      contentType: summarizeContentType(request.headers()["content-type"] ?? null),
      fileSummary,
      hasFile: fileSummary.hasReferenceImagesField,
      hasPrompt: payloadSummary?.hasPrompt === true,
      method: request.method(),
      mode: responseMode,
      payloadSummary,
    });

    if (responseMode === "malformed") {
      responses.push({ mode: responseMode, status: "malformed-empty-results" });
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          ok: true,
          data: {
            generation: {
              completedCount: 0,
              id: "qa-generation-failed",
              projectId: "qa-project",
              provider: "fake",
              requestedCount: 1,
              status: "ready",
            },
            results: [],
          },
        }),
      });
      return;
    }

    responses.push({ mode: responseMode, status: "ready", urls: readReadyUrls(responseMode) });
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        ok: true,
        data: {
          generation: {
            completedCount: 1,
            id: `qa-generation-${responseMode}`,
            projectId: "qa-project",
            provider: "fake",
            requestedCount: 1,
            status: "ready",
          },
          results: [
            {
              downloadUrl: `/api/product-image-studio/qa/${responseMode}-download.png`,
              generationRequestId: `qa-generation-${responseMode}`,
              id: `qa-result-${responseMode}`,
              previewUrl: `/api/product-image-studio/qa/${responseMode}-preview.png`,
              ratio: "1:1",
              vectorSvgUrl: `/api/product-image-studio/qa/${responseMode}-vector.svg`,
            },
          ],
        },
      }),
    });
  });

  await page.goto(`${url}/product-image-studio/ai-tools`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-ai-tool-hydrated="true"]', { timeout: 20_000 });
  await page.getByRole("button", { name: /AI 이미지 생성기/ }).click({ force: true });
  await page.locator('input[data-ai-tool-upload-input="reference-image"]').setInputFiles(fixturePath);
  await page.getByLabel("프롬프트").fill("연하장 카드 프리미엄 테이블 설정샷");
  responseMode = "runtime-ready";
  await page.getByRole("button", { name: /생성하기/ }).click();
  await page.waitForSelector('[data-ai-tool-generated-results="true"]', { timeout: 20_000 });
  await page.waitForSelector('[data-ai-tool-generated-download="true"]', { timeout: 20_000 });
  await page.waitForSelector('[data-ai-tool-generated-vector="true"]', { timeout: 20_000 });
  await page.screenshot({ fullPage: true, path: readyPngPath });
  const readyState = await readDialogState(page);

  await page.getByLabel("프롬프트").fill("실패 상태 확인");
  responseMode = "malformed";
  await page.getByRole("button", { name: /생성하기/ }).click();
  await page.getByText("결과 URL을 받지 못했습니다. 다시 생성해 주세요.").waitFor({ timeout: 20_000 });
  await page.screenshot({ fullPage: true, path: failedPngPath });
  const failedState = await readDialogState(page);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBox = await page.locator('[role="dialog"]').boundingBox();
  const finalState = {
    browser: "playwright-chromium",
    checks: {
      failedHasKoreanError: /결과 URL을 받지 못했습니다|생성에 실패했습니다/.test(failedState.dialogText),
      failedHasNoGeneratedResults: failedState.generatedResultCount === 0,
      readyHasDownloadAction: readyState.downloadUrls.length > 0,
      readyHasNoBlobGeneratedUrls: readyState.generatedUrls.every((value) => !value.startsWith("blob:")),
      readyHasPreview: readyState.generatedPreviewUrls.includes("/api/product-image-studio/qa/runtime-ready-preview.png"),
      readyHasSvgAction: readyState.vectorUrls.includes("/api/product-image-studio/qa/runtime-ready-vector.svg"),
      requestHadFile: requests.some((request) => request.hasFile),
      requestHadPrompt: requests.some((request) => request.hasPrompt),
    },
    completedAt: new Date().toISOString(),
    mobileDialogBox: mobileBox,
    requests,
    responses,
    screenshots: {
      failed: failedPngPath,
      ready: readyPngPath,
    },
    startedAt,
    status: "pass",
    routePath: "/product-image-studio/ai-tools",
  };
  finalState.status = Object.values(finalState.checks).every(Boolean) ? "pass" : "fail";
  await writeFile(browserJsonPath, `${JSON.stringify(finalState, null, 2)}\n`);
  if (finalState.status !== "pass") {
    throw new Error(`Todo 3 browser QA failed: ${JSON.stringify(finalState.checks)}`);
  }
} finally {
  if (browser) {
    await browser.close().catch(() => {});
    cleanupLines.push("browser=closed");
  }
  if (server?.pid) {
    server.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    cleanupLines.push(`dev_server_sigterm=${server.pid}`);
  }
  cleanupLines.push(`dev_server_log_lines=${countLogLines(serverLogs)}`);
  cleanupLines.push(`port_check=${await isPortListening(port) ? "still-listening" : "clear"}`);
  cleanupLines.push(`openclaw_18789=${await isPortListening(18789) ? "left-untouched-listening" : "not-listening"}`);
  cleanupLines.push(`next_env_diff=${existsSync("next-env.d.ts") ? "check-with-git-status" : "missing"}`);
  cleanupLines.push(`END ${new Date().toISOString()}`);
  await writeFile(cleanupPath, `${cleanupLines.join("\n")}\n`);
}

function readReadyUrls(mode) {
  return {
    downloadUrl: `/api/product-image-studio/qa/${mode}-download.png`,
    previewUrl: `/api/product-image-studio/qa/${mode}-preview.png`,
    vectorSvgUrl: `/api/product-image-studio/qa/${mode}-vector.svg`,
  };
}

function readMultipartPayloadSummary(postData) {
  const match = postData.match(/name="payload"\r?\n\r?\n([\s\S]*?)\r?\n--/);
  if (!match?.[1]) return null;
  try {
    const body = JSON.parse(match[1]);
    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    return {
      count: typeof body.count === "number" ? body.count : null,
      hasPrompt: expectedPromptFragments.some((fragment) => prompt.includes(fragment)),
      modelLabel: typeof body.modelLabel === "string" ? body.modelLabel : null,
      promptHash: hashText(prompt),
      promptLength: prompt.length,
      ratio: typeof body.ratio === "string" ? body.ratio : null,
      resolution: typeof body.resolution === "string" ? body.resolution : null,
    };
  } catch {
    return { parseError: true };
  }
}

function readMultipartFileSummary(postData) {
  const fields = Array.from(postData.matchAll(/Content-Disposition: form-data; name="([^"]+)"/g)).map((match) => match[1]);
  const contentTypes = Array.from(postData.matchAll(/Content-Type:\s*([^\r\n]+)/g)).map((match) => summarizeContentType(match[1]));
  return {
    contentTypes,
    fieldCount: fields.length,
    fileCount: Array.from(postData.matchAll(/filename="([^"]+)"/g)).length,
    hasExpectedFixtureName: postData.includes("card-front.png"),
    hasPayloadField: fields.includes("payload"),
    hasReferenceImagesField: fields.includes("referenceImages"),
    imageContentTypeCount: contentTypes.filter((value) => value === "image/png").length,
  };
}

function summarizeContentType(value) {
  return value ? value.split(";")[0].trim().toLowerCase() : null;
}

function hashText(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function countLogLines(chunks) {
  return chunks.join("").split("\n").filter((line) => line.trim().length > 0).length;
}

function loadPlaywright() {
  const attempts = [];
  if (runtimeEnv.PLAYWRIGHT_REQUIRE_PATH) attempts.push(runtimeEnv.PLAYWRIGHT_REQUIRE_PATH);
  attempts.push("playwright");

  const npxCacheRoot = join(runtimeEnv.HOME ?? "", ".npm", "_npx");
  if (existsSync(npxCacheRoot)) {
    for (const entry of readdirSync(npxCacheRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const candidate = join(npxCacheRoot, entry.name, "node_modules", "playwright");
      if (existsSync(join(candidate, "package.json"))) attempts.push(candidate);
    }
  }

  const errors = [];
  for (const source of attempts) {
    try {
      return { module: require(source) };
    } catch (error) {
      errors.push(`${source}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Unable to resolve Playwright. Attempt count: ${errors.length}`);
}

async function readDialogState(page) {
  return page.locator('[role="dialog"]').evaluate((dialog) => {
    const generatedImages = Array.from(dialog.querySelectorAll('[data-ai-tool-generated-preview="true"]'));
    const downloadLinks = Array.from(dialog.querySelectorAll('[data-ai-tool-generated-download="true"]'));
    const vectorLinks = Array.from(dialog.querySelectorAll('[data-ai-tool-generated-vector="true"]'));
    return {
      dialogText: dialog.textContent ?? "",
      downloadUrls: downloadLinks.map((element) => element.getAttribute("href") ?? ""),
      generatedPreviewUrls: generatedImages.map((element) => element.getAttribute("src") ?? ""),
      generatedResultCount: dialog.querySelectorAll('[data-ai-tool-generated-result="true"]').length,
      generatedUrls: [
        ...generatedImages.map((element) => element.getAttribute("src") ?? ""),
        ...downloadLinks.map((element) => element.getAttribute("href") ?? ""),
        ...vectorLinks.map((element) => element.getAttribute("href") ?? ""),
      ],
      vectorUrls: vectorLinks.map((element) => element.getAttribute("href") ?? ""),
    };
  });
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("No port address")));
        return;
      }
      const selectedPort = address.port;
      server.close(() => resolve(selectedPort));
    });
  });
}

async function waitForHttp(targetUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(targetUrl);
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${targetUrl}`);
}

async function isPortListening(targetPort) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: targetPort });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}
