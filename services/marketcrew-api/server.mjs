import { createServer } from "node:http";
import pg from "pg";

const { Pool } = pg;

const PORT = Number.parseInt(process.env.PORT ?? "4100", 10);
const DEFAULT_CACHE_TTL_MS = 60_000;
const WORKFLOW_COLLECTION_KEYS = [
  "signals",
  "seasonalKeywordAdPlans",
  "keywordDemandSnapshots",
  "searchTrendSnapshots",
  "agendaCandidates",
  "characterReports",
  "moaSynthesisReports",
  "approvalRequests",
  "ownerDecisions",
  "preflightChecks",
  "executionResults",
  "performanceCheckpoints",
  "outcomeReports",
  "followUpInternalTasks",
  "providerSyncReports",
  "agentRuns",
  "agentRunWorkflowLinks",
];

let cachedState;
let cachedStateExpiresAt = 0;

const pool = new Pool({
  allowExitOnIdle: false,
  connectionString: getDatabaseUrl(),
  connectionTimeoutMillis: getIntegerEnv("MARKETCREW_DB_CONNECTION_TIMEOUT_MS", 5_000),
  idleTimeoutMillis: getIntegerEnv("MARKETCREW_DB_IDLE_TIMEOUT_MS", 30_000),
  max: getIntegerEnv("MARKETCREW_DB_POOL_MAX", 4),
});

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "OPTIONS") {
      sendJson(response, 204, undefined);
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      await pool.query("SELECT 1");
      sendJson(response, 200, {
        ok: true,
        service: "marketcrew-api",
        cache: describeCache(),
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/workflow-state") {
      if (!isAuthorized(request)) {
        sendJson(response, 401, {
          error: {
            code: "UNAUTHORIZED",
            message: "API 토큰이 필요합니다.",
          },
        });
        return;
      }

      const result = await readWorkflowState();
      sendJson(response, 200, {
        generatedAt: new Date().toISOString(),
        source: "railway-api",
        cache: {
          hit: result.cacheHit,
          ttlMs: getCacheTtlMs(),
          expiresAt: cachedStateExpiresAt > 0 ? new Date(cachedStateExpiresAt).toISOString() : null,
        },
        counts: countCollections(result.state),
        state: result.state,
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/cache/clear") {
      if (!isAuthorized(request)) {
        sendJson(response, 401, {
          error: {
            code: "UNAUTHORIZED",
            message: "API 토큰이 필요합니다.",
          },
        });
        return;
      }

      clearWorkflowStateCache();
      sendJson(response, 200, {
        ok: true,
        cache: describeCache(),
      });
      return;
    }

    sendJson(response, 404, {
      error: {
        code: "NOT_FOUND",
        message: "요청한 API 경로를 찾을 수 없습니다.",
      },
    });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, {
      error: {
        code: "INTERNAL_ERROR",
        message: "MarketCrew API 처리 중 오류가 발생했습니다.",
      },
    });
  }
});

server.listen(PORT, () => {
  console.log(`marketcrew-api listening on ${PORT}`);
});

async function readWorkflowState() {
  const now = Date.now();
  if (cachedState && cachedStateExpiresAt > now) {
    return {
      cacheHit: true,
      state: cachedState,
    };
  }

  const state = createEmptyWorkflowState();
  const result = await pool.query(
    `
      SELECT collection, payload_json
      FROM workflow_records
      ORDER BY collection ASC, updated_at ASC, id ASC
    `,
  );

  for (const row of result.rows) {
    if (!WORKFLOW_COLLECTION_KEYS.includes(row.collection)) {
      continue;
    }

    state[row.collection].push(normalizePayload(row.payload_json));
  }

  cachedState = state;
  cachedStateExpiresAt = now + getCacheTtlMs();

  return {
    cacheHit: false,
    state,
  };
}

function clearWorkflowStateCache() {
  cachedState = undefined;
  cachedStateExpiresAt = 0;
}

function createEmptyWorkflowState() {
  return Object.fromEntries(WORKFLOW_COLLECTION_KEYS.map((key) => [key, []]));
}

function normalizePayload(payload) {
  return typeof payload === "string" ? JSON.parse(payload) : payload;
}

function countCollections(state) {
  return Object.fromEntries(WORKFLOW_COLLECTION_KEYS.map((key) => [key, Array.isArray(state[key]) ? state[key].length : 0]));
}

function describeCache() {
  return {
    warm: Boolean(cachedState && cachedStateExpiresAt > Date.now()),
    ttlMs: getCacheTtlMs(),
    expiresAt: cachedStateExpiresAt > 0 ? new Date(cachedStateExpiresAt).toISOString() : null,
  };
}

function isAuthorized(request) {
  const token = process.env.MARKETCREW_API_TOKEN;
  if (!token) {
    return true;
  }

  return request.headers.authorization === `Bearer ${token}` || request.headers["x-marketcrew-api-token"] === token;
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Access-Control-Allow-Headers", "authorization, content-type, x-marketcrew-api-token");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Origin", process.env.MARKETCREW_ALLOWED_ORIGIN ?? "https://marketcrew.app");
  response.setHeader("Cache-Control", "no-store");

  if (payload === undefined) {
    response.end();
    return;
  }

  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function getDatabaseUrl() {
  const databaseUrl = process.env.MARKETCREW_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("MARKETCREW_DATABASE_URL 또는 DATABASE_URL이 필요합니다.");
  }

  return databaseUrl;
}

function getCacheTtlMs() {
  return getIntegerEnv("MARKETCREW_API_CACHE_TTL_MS", DEFAULT_CACHE_TTL_MS);
}

function getIntegerEnv(key, fallback) {
  const parsed = Number.parseInt(process.env[key] ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}
