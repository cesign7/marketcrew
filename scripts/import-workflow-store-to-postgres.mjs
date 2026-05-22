import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

const collections = [
  "signals",
  "seasonalKeywordAdPlans",
  "keywordDemandSnapshots",
  "searchTrendSnapshots",
  "agendaCandidates",
  "characterReports",
  "opiSynthesisReports",
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

const workflowStorePath = resolve(process.env.MARKETCREW_WORKFLOW_STORE_PATH ?? ".marketcrew/workflow-store.json");
const databaseUrl = process.env.MARKETCREW_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL 또는 MARKETCREW_DATABASE_URL이 필요합니다.");
}

const schemaSql = await readFile(resolve("db/workflow-store.sql"), "utf8");
const rawStore = await readFile(workflowStorePath, "utf8");
const workflowState = JSON.parse(rawStore);
const batchId = `workflow-import-${new Date().toISOString()}`;
const startedAt = new Date();
const client = new Client({ connectionString: databaseUrl });

await client.connect();

try {
  await client.query("BEGIN");
  await client.query(schemaSql);

  const counts = {};
  for (const collection of collections) {
    const items = Array.isArray(workflowState[collection]) ? workflowState[collection] : [];
    counts[collection] = items.length;

    for (const item of items) {
      if (!item || typeof item.id !== "string") {
        throw new Error(`${collection} collection에 id가 없는 item이 있습니다.`);
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
  }

  await client.query(
    `
      INSERT INTO workflow_migration_batches (id, source_path, status, counts_json, started_at, finished_at)
      VALUES ($1, $2, 'IMPORTED', $3::jsonb, $4, now())
      ON CONFLICT (id)
      DO UPDATE SET status = EXCLUDED.status, counts_json = EXCLUDED.counts_json, finished_at = now()
    `,
    [batchId, workflowStorePath, JSON.stringify(counts), startedAt],
  );
  await client.query("COMMIT");

  const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
  console.log(
    JSON.stringify(
      {
        status: "IMPORTED",
        database: connectionLabel(databaseUrl),
        sourcePath: workflowStorePath,
        totalRecords,
        counts,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await client.query("ROLLBACK");
  const message = error instanceof Error ? error.message : String(error);
  await client.query(
    `
      INSERT INTO workflow_migration_batches (id, source_path, status, counts_json, started_at, finished_at, error_message)
      VALUES ($1, $2, 'FAILED', '{}'::jsonb, $3, now(), $4)
      ON CONFLICT (id)
      DO UPDATE SET status = EXCLUDED.status, finished_at = now(), error_message = EXCLUDED.error_message
    `,
    [batchId, workflowStorePath, startedAt, message],
  );
  throw error;
} finally {
  await client.end();
}

function connectionLabel(url) {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.username}:***@${parsed.host}${parsed.pathname}`;
}
