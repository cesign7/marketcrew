import { execFile as execFileCallback, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const require = createRequire(import.meta.url);
const execFile = promisify(execFileCallback);
const runtimeEnv = process["env"];
const playwright = loadPlaywright();
const { chromium } = playwright.module;

const evidenceDir = ".omo/evidence";
const browserJsonPath = `${evidenceDir}/product-image-ai-tools-runtime-f1-browser.json`;
const debuggingPath = `${evidenceDir}/product-image-ai-tools-runtime-f1-debugging.txt`;
const cleanupPath = `${evidenceDir}/product-image-ai-tools-runtime-f1-cleanup.txt`;
const screenshotPath = `${evidenceDir}/product-image-ai-tools-runtime-f1-preview.png`;
const nextEnvPath = "next-env.d.ts";
const invocation = "node .omo/qa/product-image-ai-tools-runtime-f1-qa.mjs";
const generatedUrls = {
  downloadUrl: "/api/product-image-studio/qa/f1-generated-download.png",
  previewUrl: "/api/product-image-studio/qa/f1-generated-preview.png",
  vectorSvgUrl: "/api/product-image-studio/qa/f1-generated-vector.svg",
};
const runnableTool = {
  prompt: "연하장 카드 프리미엄 테이블 설정샷",
  title: "AI 이미지 생성기",
  uploadSlot: "reference-image",
};
const plannedTool = {
  cardId: "background-props",
  title: "배경/소품 생성",
};
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64",
);

const startedAt = new Date().toISOString();
const port = await findFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const commands = {
  invocation,
  devServer: `./node_modules/.bin/next dev --hostname 127.0.0.1 --port ${port}`,
  lsof: `lsof -nP -iTCP:${port} -sTCP:LISTEN`,
  postScopedStatus:
    "git status --short -- .omo/qa/product-image-ai-tools-runtime-f1-qa.mjs .omo/evidence/product-image-ai-tools-runtime-f1-browser.json .omo/evidence/product-image-ai-tools-runtime-f1-debugging.txt .omo/evidence/product-image-ai-tools-runtime-f1-cleanup.txt .omo/evidence/product-image-ai-tools-runtime-f1-preview.png next-env.d.ts",
  trackedStatus: "git -c status.showUntrackedFiles=no status --short",
};
const cleanupLines = [
  `START ${startedAt}`,
  `command=${invocation}`,
  `qa_port=${port}`,
  "debug_journal=not-written-user-scope-limited-to-f1-evidence",
];
const serverLogs = [];
const qa = {
  browserPath: {
    classification: "regular Playwright required by user exact invocation",
    note: "Browser plugin was available in the session, but this F1 task requires node .omo/qa/product-image-ai-tools-runtime-f1-qa.mjs.",
    playwrightResolved: playwright.source.length > 0,
  },
  checks: {},
  cleanup: {},
  commands,
  completedAt: null,
  console: {
    errors: [],
    warnings: [],
    pageErrors: [],
    failedRequests: [],
    nonOkResponses: [],
  },
  debuggingHypotheses: [],
  errors: [],
  generationRequests: [],
  observations: {
    aiToolsRoute: null,
    plannedTool: null,
    resultModal: null,
    resultsRoute: null,
    uploadsRoute: null,
  },
  partialRuntimeEvidence:
    "Real provider is intentionally not called; request shape, provider containment, and UI behavior are verified through local Playwright route interception.",
  providerEscapes: [],
  repeatedInterruptions: {
    note: "Pre-existing F1 evidence files and prior T1-T4 artifacts were present before this run; this script records a fresh F1 browser/debug/cleanup artifact set.",
    preExistingF1Files: [],
  },
  risks: {
    cancelResume: "not applicable; no cancel/resume flow is exercised or added",
    dirtyWorktree: "pre/post tracked status is captured; unrelated product-code dirt is treated as pre-existing",
    flakyTests: "rerun the exact command once if this script fails from timing",
    malformedInput: "points to recorded Todo 1/3 malformed evidence unless a future F1 script adds a malformed-response check",
    promptInjection: "not applicable; no untrusted external text is consumed",
    staleState: "covered by H1 in this run and by prior Todo 4 two-tool stale-state evidence",
  },
  screenshotPath,
  startedAt,
  status: "fail",
  statusEvidence: {},
};

let context;
let fixtureDir;
let fixturePath;
let profileDir;
let server;
const nextEnvBefore = existsSync(nextEnvPath) ? await readFile(nextEnvPath, "utf8") : null;

try {
  await mkdir(evidenceDir, { recursive: true });
  qa.repeatedInterruptions.preExistingF1Files = await listExistingF1Files();
  qa.statusEvidence.preTracked = await runCommand(["git", ["-c", "status.showUntrackedFiles=no", "status", "--short"], 45_000]);
  qa.statusEvidence.preScoped = await runCommand(["git", scopedStatusArgs(), 20_000]);
  qa.statusEvidence.preRuntimeListeners = await runCommand(["lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"], 20_000]);

  fixtureDir = await mkdtemp(join(tmpdir(), "marketcrew-f1-fixture-"));
  fixturePath = join(fixtureDir, "card-front.png");
  await writeFile(fixturePath, tinyPng);
  cleanupLines.push("temp_fixture=created");

  const portWasFreeBeforeStart = !(await isPortListening(port));
  cleanupLines.push(`port_free_before_start=${portWasFreeBeforeStart}`);
  if (!portWasFreeBeforeStart) throw new Error(`Selected QA port ${port} was not free before server start.`);

  server = spawn("./node_modules/.bin/next", ["dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    env: { ...runtimeEnv, MARKETCREW_AUTH_DISABLED: "1", NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  cleanupLines.push(`dev_server_pid=${server.pid ?? "unknown"}`);
  server.stdout.on("data", (chunk) => serverLogs.push(chunk.toString()));
  server.stderr.on("data", (chunk) => serverLogs.push(chunk.toString()));
  await waitForHttp(`${baseUrl}/product-image-studio/ai-tools`, 120_000);

  profileDir = await mkdtemp(join(tmpdir(), "marketcrew-f1-profile-"));
  cleanupLines.push("temp_profile=created");
  context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    viewport: { height: 1000, width: 1440 },
  });
  const page = context.pages()[0] ?? await context.newPage();
  attachPageAuditors(page);

  await page.route(/.*(api\.openai|openai\.com|generativelanguage|photoroom|gemini).*/i, async (route) => {
    qa.providerEscapes.push(redactUrl(route.request().url()));
    await route.abort();
  });
  await page.route("**/api/product-image-studio/qa/**", async (route) => {
    const url = route.request().url();
    if (url.endsWith(".svg")) {
      await route.fulfill({
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#111827"/></svg>',
        contentType: "image/svg+xml",
        status: 200,
      });
      return;
    }
    await route.fulfill({ body: tinyPng, contentType: "image/png", status: 200 });
  });
  await page.route("**/api/product-image-studio/image-generator/generations", async (route) => {
    const request = route.request();
    const postData = request.postData() ?? "";
    qa.generationRequests.push({
      contentType: summarizeContentType(request.headers()["content-type"] ?? null),
      fileSummary: readMultipartFileSummary(postData),
      hasExpectedFixtureName: postData.includes("card-front.png"),
      hasPrompt: postData.includes(runnableTool.prompt),
      method: request.method(),
      payloadSummary: readMultipartPayloadSummary(postData),
      url: redactUrl(request.url()),
    });
    await route.fulfill({
      body: JSON.stringify(buildGenerationResponse()),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto(`${baseUrl}/product-image-studio/ai-tools`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-ai-tool-hydrated="true"]', { timeout: 20_000 });
  qa.observations.aiToolsRoute = await readRouteObservation(page, "ai-tools");

  await page.getByRole("button", { name: new RegExp(`${escapeRegExp(runnableTool.title)}.*열기`) }).click();
  const uploadInput = page.locator(`input[data-ai-tool-upload-input="${runnableTool.uploadSlot}"]`);
  const uploadInputExists = (await uploadInput.count()) > 0;
  if (uploadInputExists) await uploadInput.setInputFiles(fixturePath);
  await page.getByLabel("프롬프트").fill(runnableTool.prompt);
  await page.getByRole("button", { name: /생성하기/ }).click();
  await page.locator(`[data-ai-tool-generated-preview="true"][src="${generatedUrls.previewUrl}"]`).waitFor({ timeout: 20_000 });
  await page.locator('[data-ai-tool-generated-download="true"]').waitFor({ timeout: 10_000 });
  await page.locator('[data-ai-tool-generated-vector="true"]').waitFor({ timeout: 10_000 });
  qa.observations.resultModal = await readResultModalState(page);
  qa.observations.resultModal.uploadInputExists = uploadInputExists;
  await page.screenshot({ fullPage: false, path: screenshotPath });
  qa.observations.resultModal.screenshotCaptured = true;

  await page.getByRole("button", { name: "닫기" }).click();
  await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 10_000 });
  const requestCountBeforePlannedOpen = qa.generationRequests.length;
  await page.locator(`[data-ai-tool-card="${plannedTool.cardId}"] button`).click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10_000 });
  qa.observations.plannedTool = await readPlannedToolState(
    page,
    requestCountBeforePlannedOpen,
    qa.generationRequests.length,
  );
  await page.getByRole("button", { name: "닫기" }).click();
  await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 10_000 });

  qa.observations.resultsRoute = await navigateAndAudit(page, `${baseUrl}/product-image-studio/results`, "results");
  qa.observations.uploadsRoute = await navigateAndAudit(page, `${baseUrl}/product-image-studio/uploads`, "uploads");
} catch (error) {
  qa.errors.push(sanitizeText(error instanceof Error ? error.message : String(error)));
} finally {
  qa.completedAt = new Date().toISOString();
  if (context) {
    await context.close().catch(() => cleanupLines.push("browser_context_close_error=redacted"));
    cleanupLines.push("browser_context=closed");
  } else {
    cleanupLines.push("browser_context=not-opened");
  }
  if (profileDir) {
    await rm(profileDir, { force: true, recursive: true }).catch(() => cleanupLines.push("temp_profile_remove_error=redacted"));
    cleanupLines.push("temp_profile=removed");
  }
  if (server?.pid) {
    const terminated = await terminateProcess(server, port);
    cleanupLines.push(`dev_server_terminate=${terminated}`);
  } else {
    cleanupLines.push("dev_server=not-started");
  }
  if (fixtureDir) {
    await rm(fixtureDir, { force: true, recursive: true }).catch(() => cleanupLines.push("temp_fixture_remove_error=redacted"));
    cleanupLines.push("temp_fixture=removed");
  }

  const nextEnvCleanup = await restoreNextEnv(nextEnvBefore);
  cleanupLines.push(`next_env_cleanup=${nextEnvCleanup}`);
  const lsofOutput = await readLsof(port);
  const portListening = await isPortListening(port);
  cleanupLines.push(`port_check=${portListening ? "still-listening" : "clear"}`);
  cleanupLines.push(`lsof_command=${commands.lsof}`);
  cleanupLines.push(`lsof_output=${lsofOutput}`);
  cleanupLines.push(`dev_server_log_lines=${countLogLines(serverLogs)}`);
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
  qa.statusEvidence.postTracked = await runCommand(["git", ["-c", "status.showUntrackedFiles=no", "status", "--short"], 45_000]);
  qa.statusEvidence.postScoped = await runCommand(["git", scopedStatusArgs(), 20_000]);
  qa.statusEvidence.postRuntimeListeners = await runCommand(["lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"], 20_000]);
  qa.debuggingHypotheses = buildHypotheses(qa);
  qa.checks = buildChecks(qa);
  qa.status = Object.values(qa.checks).every(Boolean) ? "pass" : "fail";
  cleanupLines.push(`status=${qa.status}`);
  cleanupLines.push(`END ${new Date().toISOString()}`);
  await writeFile(browserJsonPath, `${JSON.stringify(qa, null, 2)}\n`);
  await writeFile(debuggingPath, buildDebuggingAudit(qa));
  await writeFile(cleanupPath, `${cleanupLines.join("\n")}\n`);
}

if (qa.status !== "pass") {
  process.exit(1);
}

function buildChecks(summary) {
  const request = summary.generationRequests[0];
  const modal = summary.observations.resultModal;
  const planned = summary.observations.plannedTool;
  const results = summary.observations.resultsRoute;
  const uploads = summary.observations.uploadsRoute;
  return {
    aiToolsRouteHealthy: routeRendered(summary.observations.aiToolsRoute),
    archiveResultsRouteHealthy: routeRendered(results),
    cleanupPortClosed: summary.cleanup.portClosed === true,
    disabledFutureToolHasNoGenerateWorkflow:
      planned?.hasGenerateButton === false &&
      planned?.hasWorkspace === false &&
      planned?.generationRequestCountAfterOpen === planned?.generationRequestCountBeforeOpen,
    disabledFutureToolShowsReadySoonCopy: planned?.hasReadySoonCopy === true,
    generatedActionsObserved:
      modal?.generatedDownloadHrefs.includes(generatedUrls.downloadUrl) === true &&
      modal?.generatedVectorHrefs.includes(generatedUrls.vectorSvgUrl) === true &&
      modal?.generatedPreviewActionHrefs.includes(generatedUrls.previewUrl) === true,
    generatedPreviewObserved: modal?.generatedPreviewSrcs.includes(generatedUrls.previewUrl) === true,
    noGeneratedBlobUrls: modal?.generatedUrls.every((value) => !value.startsWith("blob:")) === true,
    noPageErrors: summary.console.pageErrors.length === 0,
    noProviderEscape: summary.providerEscapes.length === 0 && summary.generationRequests.length === 1,
    requestIncludesFileSummary:
      request?.fileSummary.hasReferenceImagesField === true &&
      request?.fileSummary.hasExpectedFixtureName === true,
    requestIncludesPrompt: request?.hasPrompt === true && request?.payloadSummary?.hasPrompt === true,
    scriptHadNoErrors: summary.errors.length === 0,
    uploadPreviewIsSummarizedButGeneratedIsApi:
      modal?.uploadPreviewSummary.blobCount > 0 &&
      modal?.uploadPreviewSummary.rawValueCount === 0 &&
      modal?.generatedUrls.every((value) => value.startsWith("/api/product-image-studio/")) === true,
    uploadsRouteHealthy: routeRendered(uploads),
  };
}

function buildDebuggingAudit(summary) {
  const lines = [
    "# Product Image AI Tools Runtime F1 Debugging Audit",
    "",
    `Command: \`${invocation}\``,
    `Started: ${summary.startedAt}`,
    `Completed: ${summary.completedAt}`,
    `Status: ${summary.status}`,
    "",
    "Partial-runtime evidence note: real provider is intentionally not called; request-shape and UI behavior are verified through local Playwright route interception.",
    "",
    "## Hypotheses",
  ];
  for (const hypothesis of summary.debuggingHypotheses) {
    lines.push(
      "",
      `### ${hypothesis.id} ${hypothesis.title}`,
      `Result: ${hypothesis.result}`,
      `Runtime evidence: ${hypothesis.evidence}`,
    );
  }
  lines.push(
    "",
    "## Runtime Observations",
    `Generation request count: ${summary.generationRequests.length}`,
    `Provider escapes: ${JSON.stringify(summary.providerEscapes)}`,
    `Generated preview URLs: ${JSON.stringify(summary.observations.resultModal?.generatedPreviewSrcs ?? [])}`,
    `Upload preview summary: ${JSON.stringify(summary.observations.resultModal?.uploadPreviewSummary ?? null)}`,
    `Planned tool summary: ${JSON.stringify(summary.observations.plannedTool?.textSummary ?? null)}`,
    `Results route: ${summary.observations.resultsRoute?.status ?? "n/a"} ${summary.observations.resultsRoute?.routePath ?? "n/a"}`,
    `Uploads route: ${summary.observations.uploadsRoute?.status ?? "n/a"} ${summary.observations.uploadsRoute?.routePath ?? "n/a"}`,
    "",
    "## UltraQA Notes",
    "- malformed_input: recorded Todo 1/3 malformed evidence is reused; this F1 script does not add a new malformed-response branch.",
    "- stale_state: H1 directly compares generated API URLs against upload blob preview URLs; Todo 4 also recorded a two-tool stale-state check.",
    "- dirty_worktree: pre/post tracked status is in browser JSON under statusEvidence.",
    "- hung_or_long_commands: cleanup records dev-server PID, port, lsof output, and port-closed state.",
    "- misleading_success_output: browser JSON includes DOM observations and request summaries.",
    "- flaky_tests: no timing rerun was needed if status is pass; rerun once on timing failure.",
    "- prompt_injection: not applicable.",
    "- cancel_resume: not applicable.",
    "- repeated_interruptions: pre-existing F1 and T1-T4 artifacts are noted in browser JSON.",
    "",
    "## Risks",
    "- Real paid-provider behavior remains intentionally untested by this QA pass.",
    "- Existing worktree dirt predates this F1 browser run and was not reverted, staged, committed, or pushed.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

function buildHypotheses(summary) {
  const request = summary.generationRequests[0];
  const modal = summary.observations.resultModal;
  const planned = summary.observations.plannedTool;
  const results = summary.observations.resultsRoute;
  const uploads = summary.observations.uploadsRoute;
  return [
    {
      evidence: `generatedUrls=${JSON.stringify(modal?.generatedUrls ?? [])}; uploadPreviewSummary=${JSON.stringify(modal?.uploadPreviewSummary ?? null)}`,
      id: "H1",
      result:
        modal?.generatedUrls.every((value) => value.startsWith("/api/product-image-studio/")) === true &&
        modal?.uploadPreviewSummary.blobCount > 0
          ? "REFUTED: generated output is API-backed and distinct from upload blob previews"
          : "CONFIRM_OR_INCONCLUSIVE: generated/upload URL separation was not proven",
      title: "stale generated/upload blob confusion",
    },
    {
      evidence: `providerEscapes=${JSON.stringify(summary.providerEscapes)}; generationRequestCount=${summary.generationRequests.length}; requestSummary=${JSON.stringify({ contentType: request?.contentType ?? null, payloadSummary: request?.payloadSummary ?? null, fileSummary: request?.fileSummary ?? null })}`,
      id: "H2",
      result:
        summary.providerEscapes.length === 0 && summary.generationRequests.length === 1
          ? "REFUTED: generation stayed on intercepted local route with no provider escape"
          : "CONFIRMED: provider escape or unexpected request count observed",
      title: "provider escape/real paid call",
    },
    {
      evidence: `plannedTool=${JSON.stringify({ hasGenerateButton: planned?.hasGenerateButton, hasReadySoonCopy: planned?.hasReadySoonCopy, hasWorkspace: planned?.hasWorkspace, requestCountBeforeOpen: planned?.generationRequestCountBeforeOpen, requestCountAfterOpen: planned?.generationRequestCountAfterOpen })}`,
      id: "H3",
      result:
        planned?.hasGenerateButton === false &&
        planned?.hasWorkspace === false &&
        planned?.hasReadySoonCopy === true &&
        planned?.generationRequestCountAfterOpen === planned?.generationRequestCountBeforeOpen
          ? "REFUTED: planned tool shows prepared-soon state and no generation workflow"
          : "CONFIRM_OR_INCONCLUSIVE: planned tool exposed workflow or state was not proven",
      title: "disabled planned tools still expose fake generation",
    },
    {
      evidence: `results=${JSON.stringify(readRouteEvidence(results))}; uploads=${JSON.stringify(readRouteEvidence(uploads))}`,
      id: "H4",
      result:
        routeRendered(results) && routeRendered(uploads)
          ? "REFUTED: result archive and uploads routes rendered without server error"
          : "CONFIRMED: archive/upload route regression or server error observed",
      title: "archive/upload route regression or server error",
    },
  ];
}

function buildGenerationResponse() {
  return {
    ok: true,
    data: {
      generation: {
        completedCount: 1,
        id: "f1-generation",
        projectId: "f1-project",
        provider: "fake",
        requestedCount: 1,
        status: "ready",
      },
      results: [
        {
          downloadUrl: generatedUrls.downloadUrl,
          generationRequestId: "f1-generation",
          id: "f1-result",
          previewUrl: generatedUrls.previewUrl,
          ratio: "1:1",
          vectorSvgUrl: generatedUrls.vectorSvgUrl,
        },
      ],
    },
  };
}

function readMultipartPayloadSummary(postData) {
  const match = postData.match(/name="payload"\r?\n\r?\n([\s\S]*?)\r?\n--/);
  if (!match?.[1]) return null;
  try {
    const payload = JSON.parse(match[1]);
    const prompt = typeof payload.prompt === "string" ? payload.prompt : "";
    return {
      count: typeof payload.count === "number" ? payload.count : null,
      hasPrompt: prompt.includes(runnableTool.prompt),
      modelLabel: typeof payload.modelLabel === "string" ? payload.modelLabel : null,
      promptHash: hashText(prompt),
      promptLength: prompt.length,
      ratio: typeof payload.ratio === "string" ? payload.ratio : null,
      resolution: typeof payload.resolution === "string" ? payload.resolution : null,
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
    hasBinaryPngMarker: postData.includes("PNG"),
    imageContentTypeCount: contentTypes.filter((value) => value === "image/png").length,
  };
}

function hashText(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

async function readResultModalState(page) {
  return page.locator('[role="dialog"]').evaluate((dialog) => {
    const generatedImages = Array.from(dialog.querySelectorAll('[data-ai-tool-generated-preview="true"]'));
    const previewActions = Array.from(dialog.querySelectorAll('[data-ai-tool-generated-preview-action="true"]'));
    const downloadLinks = Array.from(dialog.querySelectorAll('[data-ai-tool-generated-download="true"]'));
    const vectorLinks = Array.from(dialog.querySelectorAll('[data-ai-tool-generated-vector="true"]'));
    const uploadImages = Array.from(dialog.querySelectorAll('[data-ai-tool-upload-preview="true"]'));
    const imageUrls = generatedImages.map((element) => element.getAttribute("src") ?? "");
    const previewActionUrls = previewActions.map((element) => element.getAttribute("href") ?? "");
    const downloadUrls = downloadLinks.map((element) => element.getAttribute("href") ?? "");
    const vectorUrls = vectorLinks.map((element) => element.getAttribute("href") ?? "");
    const uploadPreviewUrls = uploadImages.map((element) => element.getAttribute("src") ?? "");
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
        rawValueCount: 0,
        total: values.length,
      };
    };
    return {
      dialogTextLength: (dialog.textContent ?? "").replace(/\s+/g, " ").trim().length,
      generatedDownloadHrefs: downloadUrls,
      generatedPreviewActionHrefs: previewActionUrls,
      generatedPreviewSrcs: imageUrls,
      generatedResultCount: dialog.querySelectorAll('[data-ai-tool-generated-result="true"]').length,
      generatedUrls: [...imageUrls, ...previewActionUrls, ...downloadUrls, ...vectorUrls],
      generatedVectorHrefs: vectorUrls,
      resultPanelTextLength: dialog.querySelector('[data-ai-tool-result-panel="true"]')?.textContent?.replace(/\s+/g, " ").trim().length ?? 0,
      uploadPreviewSummary: summarizeUrlKinds(uploadPreviewUrls),
    };
  });
}

async function readPlannedToolState(page, requestCountBeforeOpen, requestCountAfterOpen) {
  const domState = await page.locator('[role="dialog"]').evaluate((dialog) => {
    const text = (dialog.textContent ?? "").replace(/\s+/g, " ").trim();
    return {
      buttonCount: dialog.querySelectorAll("button").length,
      hasGenerateButton: Array.from(dialog.querySelectorAll("button")).some((button) => /생성하기|생성 중/.test(button.textContent ?? "")),
      hasReadySoonCopy: /준비 중|곧 연결|지금은 생성 요청을 보내지 않습니다/.test(text),
      hasWorkspace: Boolean(dialog.querySelector('[data-ai-tool-workspace="true"]')),
      textLength: text.length,
    };
  });
  return {
    ...domState,
    generationRequestCountAfterOpen: requestCountAfterOpen,
    generationRequestCountBeforeOpen: requestCountBeforeOpen,
    textSummary: {
      hasReadySoonCopy: domState.hasReadySoonCopy,
      textLength: domState.textLength,
    },
  };
}

async function navigateAndAudit(page, targetUrl, label) {
  const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  return readRouteObservation(page, label, response?.status() ?? null);
}

async function readRouteObservation(page, label, status = null) {
  const bodyText = await page.locator("body").innerText({ timeout: 10_000 });
  return {
    hasFrameworkOverlay: /Unhandled Runtime Error|Application error|Next\.js|server error|Internal Server Error/i.test(bodyText),
    hasMeaningfulProductImageStudioContent: /상품 이미지|이미지 스튜디오|결과 보관함|업로드|소재|AI 도구/i.test(bodyText),
    label,
    routePath: readRoutePath(page.url()),
    status,
    textHash: hashText(bodyText),
    textLength: bodyText.length,
    title: await page.title(),
  };
}

function routeRendered(result) {
  return Boolean(
    result &&
      (result.status === null || result.status < 500) &&
      !result.hasFrameworkOverlay &&
      result.hasMeaningfulProductImageStudioContent,
  );
}

function readRouteEvidence(result) {
  return result
    ? {
        hasFrameworkOverlay: result.hasFrameworkOverlay,
        hasMeaningfulProductImageStudioContent: result.hasMeaningfulProductImageStudioContent,
        routePath: result.routePath,
        status: result.status,
        textHash: result.textHash,
        textLength: result.textLength,
      }
    : null;
}

function attachPageAuditors(page) {
  page.on("console", (message) => {
    const text = sanitizeText(message.text());
    if (message.type() === "error") qa.console.errors.push(text);
    if (message.type() === "warning") qa.console.warnings.push(text);
  });
  page.on("pageerror", (error) => qa.console.pageErrors.push(sanitizeText(error.message)));
  page.on("requestfailed", (request) => {
    qa.console.failedRequests.push({ failure: sanitizeText(request.failure()?.errorText ?? ""), url: redactUrl(request.url()) });
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      qa.console.nonOkResponses.push({ status: response.status(), url: redactUrl(response.url()) });
    }
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
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${targetUrl}; lastError=${lastError}`);
}

async function terminateProcess(child, targetPort) {
  if (!child.pid) return "no-pid";
  child.kill("SIGTERM");
  const exited = await waitForProcessExit(child, 5_000);
  if (!exited && (await isPortListening(targetPort))) {
    child.kill("SIGKILL");
    await waitForProcessExit(child, 3_000);
    return `sigkill pid=${child.pid}`;
  }
  return `sigterm pid=${child.pid} exited=${exited}`;
}

async function waitForProcessExit(child, timeoutMs) {
  if (child.exitCode !== null || child.killed) return true;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.off("exit", onExit);
      resolve(false);
    }, timeoutMs);
    function onExit() {
      clearTimeout(timer);
      resolve(true);
    }
    child.once("exit", onExit);
  });
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

async function listExistingF1Files() {
  if (!existsSync(evidenceDir)) return [];
  return readdirSync(evidenceDir)
    .filter((name) => name.startsWith("product-image-ai-tools-runtime-f1-"))
    .sort()
    .map((name) => `${evidenceDir}/${name}`);
}

function scopedStatusArgs() {
  return [
    "status",
    "--short",
    "--",
    ".omo/qa/product-image-ai-tools-runtime-f1-qa.mjs",
    browserJsonPath,
    debuggingPath,
    cleanupPath,
    screenshotPath,
    nextEnvPath,
  ];
}

function redactUrl(value) {
  try {
    const url = new URL(value);
    url.search = url.search ? "?redacted=1" : "";
    return url.toString();
  } catch {
    return "[unparseable-url]";
  }
}

function summarizeContentType(value) {
  return value ? value.split(";")[0].trim().toLowerCase() : null;
}

function countLogLines(chunks) {
  return chunks.join("").split("\n").filter((line) => line.trim().length > 0).length;
}

function sanitizeText(value) {
  return String(value)
    .split(runnableTool.prompt)
    .join("[prompt]")
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      return { module: require(source), source };
    } catch (error) {
      errors.push(`${source}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Unable to resolve Playwright. Attempts: ${errors.join(" | ")}`);
}
