import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

const workflowCollectionKeys = [
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
  "aiOperationsSettings",
];

const operation = process.argv[2];
const collection = process.argv[3];
const databaseUrl = process.env.MARKETCREW_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("MARKETCREW_DATABASE_URL 또는 DATABASE_URL이 필요합니다.");
}

if (!operation) {
  throw new Error("operation이 필요합니다. read-state 또는 save-collection을 사용하세요.");
}

if (collection && !workflowCollectionKeys.includes(collection)) {
  throw new Error(`알 수 없는 workflow collection입니다: ${collection}`);
}

const client = new Client({ connectionString: databaseUrl });

await client.connect();

try {
  const schemaSql = await readFile(resolve("db/workflow-store.sql"), "utf8");

  if (operation === "read-state") {
    await client.query(schemaSql);
    const result = await client.query(
      `
        SELECT collection, payload_json
        FROM workflow_records
        ORDER BY collection ASC, updated_at ASC, id ASC
      `,
    );
    const state = Object.fromEntries(workflowCollectionKeys.map((key) => [key, []]));

    for (const row of result.rows) {
      if (!workflowCollectionKeys.includes(row.collection)) {
        continue;
      }

      state[row.collection].push(normalizePayload(row.payload_json));
    }

    process.stdout.write(`${JSON.stringify(state)}\n`);
  } else if (operation === "save-collection") {
    if (!collection) {
      throw new Error("save-collection에는 collection 이름이 필요합니다.");
    }

    const rawInput = await readStdin();
    const items = JSON.parse(rawInput || "[]");
    if (!Array.isArray(items)) {
      throw new Error("save-collection input은 배열이어야 합니다.");
    }

    await client.query("BEGIN");
    await client.query(schemaSql);

    for (const item of items) {
      if (!item || typeof item.id !== "string") {
        throw new Error(`${collection} collection item에 문자열 id가 필요합니다.`);
      }

      await client.query(
        `
          INSERT INTO workflow_records (collection, id, payload_json, updated_at)
          VALUES ($1, $2, $3::jsonb, now())
          ON CONFLICT (collection, id)
          DO UPDATE SET payload_json = EXCLUDED.payload_json, updated_at = now()
        `,
        [collection, item.id, JSON.stringify(item)],
      );
    }

    await client.query("COMMIT");
    process.stdout.write(`${JSON.stringify({ status: "SAVED", collection, count: items.length })}\n`);
  } else {
    throw new Error(`지원하지 않는 workflow bridge operation입니다: ${operation}`);
  }
} catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // No active transaction is fine for read-state failures.
  }
  throw error;
} finally {
  await client.end();
}

async function readStdin() {
  let rawInput = "";
  for await (const chunk of process.stdin) {
    rawInput += chunk;
  }

  return rawInput;
}

function normalizePayload(payload) {
  return typeof payload === "string" ? JSON.parse(payload) : payload;
}
