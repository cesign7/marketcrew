import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const baseUrl = process.env.PRODUCT_IMAGE_STUDIO_BASE_URL ?? "http://127.0.0.1:3100";
const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const cdpPort = Number.parseInt(process.env.PRODUCT_IMAGE_STUDIO_CDP_PORT ?? "9338", 10);
const evidenceDir = join(process.cwd(), ".omo", "evidence");
const profileDir = join("/tmp", "marketcrew-task-8-cdp-profile");
const pngFixture = resolve(process.cwd(), ".omo", "evidence", "fixtures", "card-front.png");
const svgFixture = resolve(process.cwd(), ".omo", "evidence", "fixtures", "safe-card.svg");

class CdpClient {
  static async connect(url) {
    const socket = new WebSocket(url);
    const client = new CdpClient(socket);
    await new Promise((resolveOpen, rejectOpen) => {
      socket.addEventListener("open", resolveOpen, { once: true });
      socket.addEventListener("error", rejectOpen, { once: true });
    });
    return client;
  }

  constructor(socket) {
    this.handlers = new Map();
    this.nextId = 1;
    this.pending = new Map();
    this.socket = socket;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result ?? {});
        return;
      }
      for (const handler of this.handlers.get(message.method) ?? []) {
        handler(message.params ?? {});
      }
    });
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) ?? [];
    handlers.push(handler);
    this.handlers.set(method, handlers);
  }

  once(method, handler) {
    const wrapper = (params) => {
      this.handlers.set(method, (this.handlers.get(method) ?? []).filter((candidate) => candidate !== wrapper));
      handler(params);
    };
    this.on(method, wrapper);
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolveSend, rejectSend) => {
      this.pending.set(id, { reject: rejectSend, resolve: resolveSend });
    });
  }

  async close() {
    this.socket.close();
    await delay(100);
  }
}

async function main() {
  await mkdir(evidenceDir, { recursive: true });
  await rm(profileDir, { force: true, recursive: true });
  await mkdir(profileDir, { recursive: true });

  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-sync",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profileDir}`,
    "about:blank",
  ], { stdio: ["ignore", "pipe", "pipe"] });

  try {
    await waitForChrome();
    const target = await createTarget();
    const client = await CdpClient.connect(target.webSocketDebuggerUrl);
    try {
      await enablePage(client);
      const consoleErrors = collectConsoleErrors(client);
      await setViewport(client, { height: 1000, mobile: false, width: 1440 });
      await navigate(client, "/product-image-studio/ai-tools");
      const hub = await evaluate(client, hubSource);
      assert(hub.cardCount === 7, `expected 7 AI tool cards, got ${hub.cardCount}`);
      assert(hub.generatorCardVisible, "generator card was not visible");

      await navigate(client, "/product-image-studio/ai-tools/image-generator");
      const initial = await evaluate(client, generatorInitialStateSource);
      assert(initial.emptyPromptBlocked, "empty prompt did not block generation");
      await captureScreenshot(client, "task-8-generator-desktop.png");

      await setViewport(client, { height: 844, mobile: true, width: 390 });
      await captureScreenshot(client, "task-8-generator-mobile.png");
      await setViewport(client, { height: 1000, mobile: false, width: 1440 });

      const blocked = await evaluate(client, blockedStateSource);
      assert(blocked.generateDisabled, "gate-closed model did not disable generation");
      assert(blocked.resultDownloadCount === 0, "gate-closed state showed a result");

      await prepareGenerationForm(client);
      const uploadState = await evaluate(client, uploadStateSource);
      assert(uploadState.pngVisible && uploadState.svgVisible && uploadState.svgReferenceVisible, "reference upload state was not visible");
      await evaluate(client, clickGenerateSource);
      await waitForResults(client);
      const generated = await evaluate(client, generatedStateSource);
      assert(generated.generatedImageCount === 2, `expected 2 result images, got ${generated.generatedImageCount}`);
      assert(generated.downloadLinks.length === 2, `expected 2 download links, got ${generated.downloadLinks.length}`);
      await captureScreenshot(client, "task-8-generator-results.png");

      await navigate(client, "/product-image-studio/uploads");
      const uploadsPage = await evaluate(client, uploadsPageSource);
      assert(uploadsPage.safeSvgVisible, "safe SVG upload was not visible on uploads page");
      await captureScreenshot(client, "task-8-generator-svg-upload.png");

      await navigate(client, "/product-image-studio/activity");
      const activityPage = await evaluate(client, activityPageSource);
      assert(activityPage.generatedResultVisible, "generated result was not visible on activity page");

      const apiSummary = await readApiSummary();
      const summary = {
        activityPage,
        apiSummary,
        blocked,
        consoleErrors,
        generated,
        hub,
        initial,
        uploadState,
        uploadsPage,
      };
      await writeFile(join(evidenceDir, "task-8-browser-cdp-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
      console.log(JSON.stringify({
        ok: true,
        activityGenerated: activityPage.generatedResultVisible,
        cardCount: hub.cardCount,
        downloadUrl: apiSummary.downloadUrl,
        generatedImageCount: generated.generatedImageCount,
        safeSvgPreviewUrl: apiSummary.safeSvgPreviewUrl,
      }, null, 2));
    } finally {
      await client.close();
      await closeTarget(target.id);
    }
  } finally {
    chrome.kill("SIGTERM");
    await delay(500);
    if (chrome.exitCode === null) chrome.kill("SIGKILL");
    await rm(profileDir, { force: true, recursive: true });
  }
}

async function enablePage(client) {
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");
  await client.send("Network.enable");
  await client.send("DOM.enable");
}

function collectConsoleErrors(client) {
  const errors = [];
  client.on("Runtime.exceptionThrown", (event) => {
    errors.push({ kind: "exception", text: event.exceptionDetails?.text ?? "Runtime exception" });
  });
  client.on("Log.entryAdded", (event) => {
    if (event.entry?.level === "error") {
      errors.push({ kind: "log", text: event.entry.text, url: event.entry.url ?? null });
    }
  });
  return errors;
}

async function setViewport(client, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: viewport.height,
    mobile: viewport.mobile,
    width: viewport.width,
  });
}

async function navigate(client, path) {
  await client.send("Page.navigate", { url: `${baseUrl}${path}` });
  await waitForReady(client);
}

async function captureScreenshot(client, fileName) {
  const metrics = await client.send("Page.getLayoutMetrics");
  const contentSize = metrics.cssContentSize ?? metrics.contentSize;
  const screenshot = await client.send("Page.captureScreenshot", {
    captureBeyondViewport: true,
    clip: {
      height: Math.min(Math.ceil(contentSize.height), 12000),
      scale: 1,
      width: Math.ceil(contentSize.width),
      x: 0,
      y: 0,
    },
    format: "png",
    fromSurface: true,
  });
  await writeFile(join(evidenceDir, fileName), Buffer.from(screenshot.data, "base64"));
}

async function prepareGenerationForm(client) {
  await evaluate(client, prepareFormSource);
  const documentResult = await client.send("DOM.getDocument", { depth: 1 });
  const inputResult = await client.send("DOM.querySelector", {
    nodeId: documentResult.root.nodeId,
    selector: 'input[name="referenceImages"]',
  });
  assert(inputResult.nodeId, "reference file input was not found");
  await client.send("DOM.setFileInputFiles", {
    files: [pngFixture, svgFixture],
    nodeId: inputResult.nodeId,
  });
  await evaluate(client, dispatchFileChangeSource);
  await delay(300);
}

async function waitForResults(client) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const state = await evaluate(client, generatedStateSource);
    if (state.downloadLinks.length >= 2 && state.generatedImageCount >= 2) {
      return;
    }
    await delay(250);
  }
  throw new Error("Timed out waiting for two generated results");
}

async function readApiSummary() {
  const [uploadsResponse, resultsResponse] = await Promise.all([
    fetch(`${baseUrl}/api/product-image-studio/uploads`, { cache: "no-store" }),
    fetch(`${baseUrl}/api/product-image-studio/results`, { cache: "no-store" }),
  ]);
  const uploadsPayload = await uploadsResponse.json();
  const resultsPayload = await resultsResponse.json();
  const safeSvg = uploadsPayload.uploads.find((item) => item.originalFileName === "safe-card.svg");
  const result = resultsPayload.results.find((item) => item.workflow === "image_generator");
  assert(safeSvg, "safe SVG upload was missing from uploads API");
  assert(result, "image generator result was missing from results API");
  return {
    downloadUrl: result.downloadUrl,
    projectId: result.projectId,
    resultId: result.resultId,
    safeSvgAssetId: safeSvg.assetId,
    safeSvgContentType: safeSvg.contentType,
    safeSvgPreviewUrl: safeSvg.previewUrl,
  };
}

async function evaluate(client, source) {
  const result = await client.send("Runtime.evaluate", {
    awaitPromise: true,
    expression: `(${source})()`,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime.evaluate failed");
  }
  return result.result.value;
}

async function waitForReady(client) {
  await waitForLoadEvent(client);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const ready = await evaluate(client, "() => document.readyState");
    if (ready === "complete") {
      await delay(400);
      return;
    }
    await delay(100);
  }
  throw new Error("Page did not become ready");
}

function waitForLoadEvent(client) {
  return new Promise((resolveLoad) => {
    const timeout = setTimeout(resolveLoad, 8000);
    client.once("Page.loadEventFired", () => {
      clearTimeout(timeout);
      resolveLoad();
    });
  });
}

async function createTarget() {
  const response = await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: "PUT" });
  assert(response.ok, `Unable to create CDP target: ${response.status}`);
  return response.json();
}

async function closeTarget(id) {
  await fetch(`http://127.0.0.1:${cdpPort}/json/close/${id}`).catch(() => undefined);
}

async function waitForChrome() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await delay(100);
  }
  throw new Error("Chrome CDP endpoint did not start.");
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const hubSource = String.raw`
() => {
  const cards = Array.from(document.querySelectorAll("[data-ai-tool-card]")).map((card) => ({
    id: card.getAttribute("data-ai-tool-card"),
    state: card.getAttribute("data-ai-tool-state"),
    text: (card.textContent ?? "").replace(/\s+/g, " ").trim(),
  }));
  return {
    cardCount: cards.length,
    cards,
    generatorCardVisible: cards.some((card) => card.id === "image-generator" && card.text.includes("AI 이미지 생성기")),
  };
}
`;

const generatorInitialStateSource = String.raw`
() => {
  const generate = Array.from(document.querySelectorAll("button"))
    .find((button) => (button.textContent ?? "").replace(/\s+/g, " ").trim() === "생성");
  const text = document.body?.innerText ?? "";
  return {
    emptyPromptBlocked: generate?.disabled === true,
    frameworkOverlay: text.includes("Unhandled Runtime Error") || text.includes("Application error"),
    hasGeneratorCopy: text.includes("AI 이미지 생성기") && text.includes("생성 설정"),
  };
}
`;

const blockedStateSource = String.raw`
() => {
  const gemini = Array.from(document.querySelectorAll("button"))
    .find((button) => (button.textContent ?? "").replace(/\s+/g, " ").trim() === "나노바나나 2");
  gemini?.click();
  const generate = Array.from(document.querySelectorAll("button"))
    .find((button) => (button.textContent ?? "").replace(/\s+/g, " ").trim() === "생성");
  const statusLine = document.querySelector('[data-blocked="true"]');
  return {
    blockedText: (statusLine?.textContent ?? "").replace(/\s+/g, " ").trim(),
    generateDisabled: generate?.disabled === true,
    resultDownloadCount: document.querySelectorAll('a[href*="/results/"][href*="/download"]').length,
  };
}
`;

const prepareFormSource = String.raw`
() => {
  const gpt = Array.from(document.querySelectorAll("button"))
    .find((button) => (button.textContent ?? "").replace(/\s+/g, " ").trim() === "GPT Image 2");
  gpt?.click();
  const textarea = document.querySelector('textarea[name="prompt"]');
  const textareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  textareaSetter?.call(textarea, "정돈된 테이블 위 프리미엄 카드 설정샷");
  textarea?.dispatchEvent(new Event("input", { bubbles: true }));
  const count = document.querySelector('select[name="count"]');
  const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  selectSetter?.call(count, "2");
  count?.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}
`;

const dispatchFileChangeSource = String.raw`
() => {
  const input = document.querySelector('input[name="referenceImages"]');
  input?.dispatchEvent(new Event("input", { bubbles: true }));
  input?.dispatchEvent(new Event("change", { bubbles: true }));
  return input?.files?.length ?? 0;
}
`;

const uploadStateSource = String.raw`
() => {
  const text = document.body?.innerText ?? "";
  return {
    pngVisible: text.includes("card-front.png"),
    svgReferenceVisible: text.includes("SVG 참고"),
    svgVisible: text.includes("safe-card.svg"),
  };
}
`;

const clickGenerateSource = String.raw`
() => {
  const generate = Array.from(document.querySelectorAll("button"))
    .find((button) => (button.textContent ?? "").replace(/\s+/g, " ").trim() === "생성");
  generate?.click();
  return generate?.disabled === false;
}
`;

const generatedStateSource = String.raw`
() => ({
  downloadLinks: Array.from(document.querySelectorAll('a[href*="/results/"][href*="/download"]'))
    .map((link) => ({ href: link.getAttribute("href"), text: (link.textContent ?? "").replace(/\s+/g, " ").trim() })),
  generatedImageCount: document.querySelectorAll('img[alt^="AI 생성 이미지"]').length,
  readyTextVisible: (document.body?.innerText ?? "").includes("2장 준비"),
})
`;

const uploadsPageSource = String.raw`
() => {
  const text = document.body?.innerText ?? "";
  return {
    pngVisible: text.includes("card-front.png"),
    safeSvgVisible: text.includes("safe-card.svg"),
    svgMetadataVisible: text.includes("image/svg+xml") || text.includes("SVG"),
  };
}
`;

const activityPageSource = String.raw`
() => {
  const text = document.body?.innerText ?? "";
  return {
    generatedResultVisible: text.includes("AI 생성 이미지") && text.includes("AI 이미지 생성기"),
    promptPreviewVisible: text.includes("정돈된 테이블 위 프리미엄 카드 설정샷"),
  };
}
`;

await main();
