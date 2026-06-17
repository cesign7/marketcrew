import { execFile as execFileCallback, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import net from "node:net";
import process from "node:process";

const require = createRequire(import.meta.url);
const execFile = promisify(execFileCallback);
const runtimeEnv = process["env"];
const playwright = loadPlaywright();
const { chromium } = playwright.module;

const evidenceDir = ".omo/evidence";
const browserJsonPath = `${evidenceDir}/product-image-ai-tools-runtime-t4-browser.json`;
const cleanupPath = `${evidenceDir}/product-image-ai-tools-runtime-t4-cleanup.txt`;
const nextEnvPath = "next-env.d.ts";
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC", "base64");
const tools = [
  { title: "AI 이미지 생성기", uploadSlot: "reference-image", prompt: "연하장 카드 프리미엄 테이블 설정샷", mode: "ai-generator" },
  { title: "상품 설정샷 생성", uploadSlot: "card-design", prompt: "카드 봉투 봉합스티커 세트 프리미엄 테이블 설정샷", mode: "product-staging" },
];

const startedAt = new Date().toISOString();
const port = await findFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const cleanupLines = [`START ${startedAt}`, `qa_port=${port}`];
const serverLogs = [];
const commands = {
  invocation: "node .omo/qa/product-image-ai-tools-runtime-t4-qa.mjs",
  devServer: `./node_modules/.bin/next dev --hostname 127.0.0.1 --port ${port}`,
  lsof: `lsof -nP -iTCP:${port} -sTCP:LISTEN`,
  scopedEvidenceStatus:
    "git status --short -- .omo/qa/product-image-ai-tools-runtime-t4-qa.mjs .omo/evidence/product-image-ai-tools-runtime-t4-browser.json .omo/evidence/product-image-ai-tools-runtime-t4-cleanup.txt .omo/evidence/product-image-ai-tools-runtime-t4-red.txt .omo/evidence/product-image-ai-tools-runtime-t4-green.txt next-env.d.ts",
  trackedStatus: "git -c status.showUntrackedFiles=no status --short",
};
const qa = {
  archiveCompatibility: {},
  archiveRoute: { implementedArchive: "/product-image-studio/results", planRoute: "/product-image-studio/archive", routeExistsInSource: existsSync("src/app/product-image-studio/archive/page.tsx") },
  checks: {},
  cleanup: {},
  commands,
  completedAt: null,
  errors: [],
  invocation: commands.invocation,
  browserPath: { playwrightResolved: Boolean(playwright.module) },
  providerEscapes: [],
  requests: [],
  risks: {
    cancelResume: "not applicable; the modal runtime has no cancel/resume flow in this QA path",
    flakyTests: "if this script fails from timing, rerun the exact invocation once and preserve both JSON attempts",
    malformedInput: "not newly triggered in Todo 4; covered by prior Todo 1/3 route and malformed-response evidence",
    promptInjection: "not applicable; no untrusted external page text is consumed",
    repeatedInterruptions: "previous Todo 4 worker appears to have left a partial QA script/evidence state; this run records fresh browser evidence",
  },
  startedAt,
  status: "fail",
  statusEvidence: {},
  tools: [],
};
let activeMode = "unknown";
let context, fixtureDir, fixturePath, profileDir, server;
const nextEnvBefore = existsSync(nextEnvPath) ? await readFile(nextEnvPath, "utf8") : null;

try {
  await mkdir(evidenceDir, { recursive: true });
  qa.statusEvidence.preTracked = await runCommand(["git", ["-c", "status.showUntrackedFiles=no", "status", "--short"], 45_000]);
  qa.statusEvidence.preScoped = await runCommand([
    "git",
    [
      "status",
      "--short",
      "--",
      ".omo/qa/product-image-ai-tools-runtime-t4-qa.mjs",
      ".omo/evidence/product-image-ai-tools-runtime-t4-browser.json",
      ".omo/evidence/product-image-ai-tools-runtime-t4-cleanup.txt",
      ".omo/evidence/product-image-ai-tools-runtime-t4-red.txt",
      ".omo/evidence/product-image-ai-tools-runtime-t4-green.txt",
      "next-env.d.ts",
    ],
    20_000,
  ]);
  fixtureDir = await mkdtemp(join(tmpdir(), "marketcrew-t4-fixture-"));
  fixturePath = join(fixtureDir, "card-front.png");
  await writeFile(fixturePath, tinyPng);
  cleanupLines.push("temp_fixture=created");

  server = spawn("./node_modules/.bin/next", ["dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    env: { ...runtimeEnv, MARKETCREW_AUTH_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  cleanupLines.push(`dev_server_pid=${server.pid ?? "unknown"}`);
  server.stdout.on("data", (chunk) => serverLogs.push(chunk.toString()));
  server.stderr.on("data", (chunk) => serverLogs.push(chunk.toString()));
  await waitForHttp(`${baseUrl}/product-image-studio/ai-tools`, 120_000);

  profileDir = await mkdtemp(join(tmpdir(), "marketcrew-t4-profile-"));
  cleanupLines.push("temp_profile=created");
  context = await chromium.launchPersistentContext(profileDir, { headless: true, viewport: { width: 1440, height: 1000 } });
  const page = context.pages()[0] ?? await context.newPage();
  page.on("request", (request) => {
    const requestUrl = request.url();
    if (/api\.openai|generativelanguage|photoroom|openai|gemini/i.test(requestUrl)) {
      qa.providerEscapes.push(redactUrl(requestUrl));
    }
  });

  await page.route("**/api/product-image-studio/qa/**", async (route) => {
    await route.fulfill({ body: tinyPng, contentType: "image/png", status: 200 });
  });
  await page.route("**/api/product-image-studio/image-generator/generations", async (route) => {
    const request = route.request();
    const postData = request.postData() ?? "";
    const responseUrls = generatedUrls(activeMode);
    const payloadSummary = readMultipartPayloadSummary(postData);
    const fileSummary = readMultipartFileSummary(postData);
    qa.requests.push({
      contentType: summarizeContentType(request.headers()["content-type"] ?? null),
      fileSummary,
      hasFile: fileSummary.hasReferenceImagesField,
      hasPrompt: payloadSummary?.hasPrompt === true,
      method: request.method(),
      mode: activeMode,
      payloadSummary,
      responsePreviewUrl: responseUrls.previewUrl,
      uploadSlotSummary: tools.find((tool) => tool.mode === activeMode)?.uploadSlot ?? null,
    });
    await route.fulfill({
      body: JSON.stringify(buildGenerationResponse(activeMode, responseUrls)),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto(`${baseUrl}/product-image-studio/ai-tools`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-ai-tool-hydrated="true"]', { timeout: 20_000 });
  let previousPreviewUrl = null;
  for (const tool of tools) {
    activeMode = tool.mode;
    await page.getByRole("button", { name: new RegExp(`${escapeRegExp(tool.title)}.*열기`) }).click();
    await page.locator(`input[data-ai-tool-upload-input="${tool.uploadSlot}"]`).setInputFiles(fixturePath);
    await page.getByLabel("프롬프트").fill(tool.prompt);
    if (previousPreviewUrl) {
      await page.locator(`[data-ai-tool-generated-preview="true"][src="${previousPreviewUrl}"]`).waitFor({ state: "detached", timeout: 10_000 });
    }
    await page.getByRole("button", { name: /생성하기/ }).click();
    const expectedUrls = generatedUrls(tool.mode);
    await page.locator(`[data-ai-tool-generated-preview="true"][src="${expectedUrls.previewUrl}"]`).waitFor({ timeout: 20_000 });
    const observation = await readDialogState(page);
    qa.tools.push({
      expectedPreviewUrl: expectedUrls.previewUrl,
      promptHash: hashText(tool.prompt),
      promptLength: tool.prompt.length,
      requestUploadSlot: tool.uploadSlot,
      tool: tool.title,
      ...observation,
    });
    previousPreviewUrl = expectedUrls.previewUrl;
    await page.getByRole("button", { name: "닫기" }).click();
    await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 10_000 });
  }

  qa.archiveCompatibility.results = await navigateAndAudit(page, `${baseUrl}/product-image-studio/results`);
  qa.archiveCompatibility.uploads = await navigateAndAudit(page, `${baseUrl}/product-image-studio/uploads`);
  if (!qa.archiveRoute.routeExistsInSource) {
    qa.archiveCompatibility.archiveRouteMismatch = "No /product-image-studio/archive page exists; /product-image-studio/results is the implemented result archive route.";
  }

  const firstTool = qa.tools[0];
  const secondTool = qa.tools[1];
  qa.staleState = {
    firstToolExpectedPreviewUrl: firstTool?.expectedPreviewUrl ?? null,
    secondToolExpectedPreviewUrl: secondTool?.expectedPreviewUrl ?? null,
    firstToolUrlAbsentAfterSecondTool: Boolean(firstTool && secondTool && !secondTool.generatedPreviewSrcs.includes(firstTool.expectedPreviewUrl)),
    secondToolUsedOwnPreviewUrl: Boolean(secondTool && secondTool.generatedPreviewSrcs.includes(secondTool.expectedPreviewUrl)),
  };
  qa.checks = {
    archiveRouteMismatchRecorded: qa.archiveRoute.routeExistsInSource === false,
    bothToolsObserved: qa.tools.length === 2,
    generatedPreviewsMatchApiResponses: qa.tools.every((tool) => tool.generatedPreviewSrcs.includes(tool.expectedPreviewUrl)),
    noGeneratedBlobUrls: qa.tools.every((tool) => tool.generatedUrls.every((value) => !value.startsWith("blob:"))),
    noProviderRequestEscaped: qa.providerEscapes.length === 0 && qa.requests.length === 2,
    resultsRouteRenders: routeRendered(qa.archiveCompatibility.results),
    staleStateClearedAcrossTools: qa.staleState.firstToolUrlAbsentAfterSecondTool,
    uploadsRouteRenders: routeRendered(qa.archiveCompatibility.uploads),
  };
  qa.status = Object.values(qa.checks).every(Boolean) ? "pass" : "fail";
  if (qa.status !== "pass") {
    throw new Error(`Todo 4 browser QA failed: ${JSON.stringify(qa.checks)}`);
  }
} catch (error) {
  qa.errors.push(sanitizeText(error instanceof Error ? error.message : String(error)));
} finally {
  qa.completedAt = new Date().toISOString();
  if (context) {
    await context.close().catch(() => cleanupLines.push("browser_context_close_error=redacted"));
    cleanupLines.push("browser_context=closed");
  }
  if (profileDir) {
    await rm(profileDir, { force: true, recursive: true }).catch(() => cleanupLines.push("temp_profile_remove_error=redacted"));
    cleanupLines.push("temp_profile=removed");
  }
  if (server?.pid) {
    server.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    cleanupLines.push(`dev_server_sigterm=${server.pid}`);
  }
  if (fixtureDir) {
    await rm(fixtureDir, { force: true, recursive: true }).catch(() => cleanupLines.push("temp_fixture_remove_error=redacted"));
    cleanupLines.push("temp_fixture=removed");
  }
  const nextEnvCleanup = await restoreNextEnv(nextEnvBefore);
  cleanupLines.push(`next_env_cleanup=${nextEnvCleanup}`);
  qa.statusEvidence.postTracked = await runCommand(["git", ["-c", "status.showUntrackedFiles=no", "status", "--short"], 45_000]);
  qa.statusEvidence.postScoped = await runCommand([
    "git",
    [
      "status",
      "--short",
      "--",
      ".omo/qa/product-image-ai-tools-runtime-t4-qa.mjs",
      ".omo/evidence/product-image-ai-tools-runtime-t4-browser.json",
      ".omo/evidence/product-image-ai-tools-runtime-t4-cleanup.txt",
      ".omo/evidence/product-image-ai-tools-runtime-t4-red.txt",
      ".omo/evidence/product-image-ai-tools-runtime-t4-green.txt",
      "next-env.d.ts",
    ],
    20_000,
  ]);
  cleanupLines.push(`dev_server_log_lines=${countLogLines(serverLogs)}`);
  const portListening = await isPortListening(port);
  const lsofOutput = await readLsof(port);
  cleanupLines.push(`port_check=${portListening ? "still-listening" : "clear"}`);
  cleanupLines.push(`lsof_command=${commands.lsof}`);
  cleanupLines.push(`lsof_output=${lsofOutput}`);
  qa.cleanup = {
    browserContext: context ? "closed" : "not-opened",
    devServerPid: server?.pid ?? null,
    lsofCommand: commands.lsof,
    lsofOutput,
    nextEnvCleanup,
    port,
    portClosed: !portListening,
    tempFixtureRemoved: fixtureDir ? !existsSync(fixtureDir) : null,
    tempFixtureWasCreated: Boolean(fixtureDir),
    tempProfileRemoved: profileDir ? !existsSync(profileDir) : null,
    tempProfileWasCreated: Boolean(profileDir),
  };
  cleanupLines.push(`END ${new Date().toISOString()}`);
  await writeFile(browserJsonPath, `${JSON.stringify(qa, null, 2)}\n`);
  await writeFile(cleanupPath, `${cleanupLines.join("\n")}\n`);
}

if (qa.status !== "pass") {
  process.exit(1);
}

function generatedUrls(mode) {
  return { downloadUrl: `/api/product-image-studio/qa/t4-${mode}-download.png`, previewUrl: `/api/product-image-studio/qa/t4-${mode}-preview.png`, vectorSvgUrl: `/api/product-image-studio/qa/t4-${mode}-vector.png` };
}

function buildGenerationResponse(mode, urls) {
  return {
    ok: true,
    data: {
      generation: { completedCount: 1, id: `t4-generation-${mode}`, projectId: "t4-project", provider: "fake", requestedCount: 1, status: "ready" },
      results: [{ downloadUrl: urls.downloadUrl, generationRequestId: `t4-generation-${mode}`, id: `t4-result-${mode}`, previewUrl: urls.previewUrl, ratio: "1:1", vectorSvgUrl: urls.vectorSvgUrl }],
    },
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
      hasPrompt: tools.some((tool) => prompt.includes(tool.prompt)),
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

async function readDialogState(page) {
  return page.locator('[role="dialog"]').evaluate((dialog) => {
    const generatedImages = Array.from(dialog.querySelectorAll('[data-ai-tool-generated-preview="true"]'));
    const downloadLinks = Array.from(dialog.querySelectorAll('[data-ai-tool-generated-download="true"]'));
    const vectorLinks = Array.from(dialog.querySelectorAll('[data-ai-tool-generated-vector="true"]'));
    const imageUrls = generatedImages.map((element) => element.getAttribute("src") ?? "");
    const downloadUrls = downloadLinks.map((element) => element.getAttribute("href") ?? "");
    const vectorUrls = vectorLinks.map((element) => element.getAttribute("href") ?? "");
    const uploadPreviewUrls = Array.from(dialog.querySelectorAll('[data-ai-tool-upload-preview="true"]')).map((element) => element.getAttribute("src") ?? "");
    const summarizeUrlKinds = (values) => {
      const kinds = values.map((value) => {
        if (value.startsWith("/api/product-image-studio/")) return "route-relative-api";
        if (value.startsWith("blob:")) return "browser-blob-url";
        if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(value)) return "local-http-url";
        if (/^\/(Users|var)\//.test(value)) return "local-file-path";
        if (value.length === 0) return "empty";
        return "other";
      });
      return {
        apiRouteCount: values.filter((value) => value.startsWith("/api/product-image-studio/")).length,
        blobCount: values.filter((value) => value.startsWith("blob:")).length,
        kinds: Array.from(new Set(kinds)).sort(),
        localPathCount: values.filter((value) => /^\/(Users|var)\//.test(value)).length,
        total: values.length,
      };
    };
    return {
      dialogTextLength: (dialog.textContent ?? "").replace(/\s+/g, " ").trim().length,
      generatedDownloadHrefs: downloadUrls,
      generatedPreviewSrcs: imageUrls,
      generatedResultCount: dialog.querySelectorAll('[data-ai-tool-generated-result="true"]').length,
      generatedUrls: [...imageUrls, ...downloadUrls, ...vectorUrls],
      uploadPreviewSummary: summarizeUrlKinds(uploadPreviewUrls),
    };
  });
}

async function navigateAndAudit(page, targetUrl) {
  const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  const bodyText = await page.locator("body").innerText({ timeout: 10_000 });
  return {
    hasMeaningfulProductImageStudioContent: /상품 이미지|이미지 스튜디오|결과 보관함|업로드|소재|Product Image|product-image-studio/i.test(bodyText),
    hasServerErrorText: /server error|This page couldn’t load|Reload|Application failed|Application error|Internal Server Error|Unhandled Runtime Error|서버 오류/i.test(bodyText),
    status: response?.status() ?? null,
    textHash: hashText(bodyText),
    textLength: bodyText.length,
    title: await page.title(),
    routePath: readRoutePath(page.url()),
  };
}

function routeRendered(result) {
  return result?.status !== null && result?.status < 500 && !result?.hasServerErrorText && result?.hasMeaningfulProductImageStudioContent;
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return server.close(() => reject(new Error("No port address")));
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForHttp(targetUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "not-started";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(targetUrl);
      if (response.status < 500) return;
      lastError = `status=${response.status}`;
    } catch (error) { lastError = error instanceof Error ? error.message : String(error); }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${targetUrl}; lastError=${lastError}`);
}

async function isPortListening(targetPort) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: targetPort });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
    socket.setTimeout(1000, () => { socket.destroy(); resolve(false); });
  });
}

async function readLsof(targetPort) {
  try {
    const { stdout } = await execFile("lsof", ["-nP", `-iTCP:${targetPort}`, "-sTCP:LISTEN"]);
    return stdout.trim() || "empty";
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 1) return "no-listeners";
    return error instanceof Error ? error.message : String(error);
  }
}

async function restoreNextEnv(before) {
  const existsAfter = existsSync(nextEnvPath);
  if (before === null) {
    if (existsAfter) {
      await rm(nextEnvPath, { force: true });
      return "removed-generated-file";
    }
    return "unchanged-missing";
  }
  if (!existsAfter) {
    await writeFile(nextEnvPath, before);
    return "restored-missing-file";
  }
  const after = await readFile(nextEnvPath, "utf8");
  if (after !== before) {
    await writeFile(nextEnvPath, before);
    return "restored-drift";
  }
  return "unchanged";
}

async function runCommand(commandSpec) {
  const [command, args, timeoutMs] = commandSpec;
  try {
    const { stdout, stderr } = await execFile(command, args, { timeout: timeoutMs });
    return {
      command: [command, ...args].join(" "),
      exitStatus: 0,
      stderr: sanitizeText(stderr.trim()),
      stdout: sanitizeText(stdout.trim()),
      timedOut: false,
    };
  } catch (error) {
    return {
      command: [command, ...args].join(" "),
      exitStatus: typeof error?.code === "number" ? error.code : null,
      message: sanitizeText(error instanceof Error ? error.message : String(error)),
      stderr: typeof error?.stderr === "string" ? sanitizeText(error.stderr.trim()) : "",
      stdout: typeof error?.stdout === "string" ? sanitizeText(error.stdout.trim()) : "",
      timedOut: Boolean(error?.killed),
    };
  }
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

function sanitizeText(value) {
  let output = String(value);
  for (const tool of tools) {
    output = output.split(tool.prompt).join("[prompt]");
  }
  return output
    .replace(/blob:[^\s"']+/g, "[blob-url]")
    .replace(/\/(?:Users|var)\/[^\s"']+/g, "[local-path]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(Authorization|Cookie|x-api-key):\s*[^\r\n]+/gi, "$1: [redacted]");
}

function readRoutePath(value) {
  try {
    return new URL(value).pathname;
  } catch {
    return "[unparseable-url]";
  }
}

function redactUrl(value) {
  try {
    const url = new URL(value);
    url.search = url.search ? "?redacted=1" : "";
    return url.toString();
  } catch { return "[unparseable-url]"; }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function loadPlaywright() {
  const attempts = [];
  if (runtimeEnv.PLAYWRIGHT_REQUIRE_PATH) {
    attempts.push(runtimeEnv.PLAYWRIGHT_REQUIRE_PATH);
  }
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
      return { module: require(source), source };
    } catch (error) {
      errors.push(`${source}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`Unable to resolve Playwright. Attempts: ${errors.join(" | ")}`);
}
