import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import {
  createEmptyWorkflowRepositoryState,
  normalizeWorkflowRepositoryState,
  workflowCollectionKeys,
  type WorkflowCollectionKey,
  type WorkflowRepositoryState,
} from "./workflow-state";

const { Pool } = pg;
const DEFAULT_POSTGRES_READ_MODEL_CACHE_TTL_MS = 60_000;

type CachedWorkflowRepositoryState = {
  expiresAt: number;
  state: WorkflowRepositoryState;
};

type WorkflowRecordRow = {
  collection: string;
  payload_json: unknown;
};

declare global {
  // eslint-disable-next-line no-var
  var __marketcrewPostgresReadModelStateCache: Map<string, CachedWorkflowRepositoryState> | undefined;
  // eslint-disable-next-line no-var
  var __marketcrewPostgresReadModelPools: Map<string, pg.Pool> | undefined;
  // eslint-disable-next-line no-var
  var __marketcrewPostgresReadModelSchemaSql: Promise<string> | undefined;
}

export async function readPostgresWorkflowRepositoryState(
  databaseUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<WorkflowRepositoryState> {
  const cached = readStateCache(databaseUrl, env);
  if (cached) {
    return cached;
  }

  const state = await queryWorkflowRepositoryState(databaseUrl);
  writeStateCache(databaseUrl, state, env);

  return state;
}

export function clearPostgresReadModelStateCache(databaseUrl?: string): void {
  if (databaseUrl) {
    getStateCache().delete(databaseUrl);
    return;
  }

  getStateCache().clear();
}

async function queryWorkflowRepositoryState(databaseUrl: string): Promise<WorkflowRepositoryState> {
  const pool = getPool(databaseUrl);
  try {
    return await queryWorkflowRecords(pool);
  } catch (error) {
    if (!isMissingWorkflowRecordsTable(error)) {
      throw error;
    }

    await pool.query(await getSchemaSql());
    return queryWorkflowRecords(pool);
  }
}

async function queryWorkflowRecords(pool: pg.Pool): Promise<WorkflowRepositoryState> {
  const result = await pool.query<WorkflowRecordRow>(
    `
      SELECT collection, payload_json
      FROM workflow_records
      ORDER BY collection ASC, updated_at ASC, id ASC
    `,
  );
  const state = createEmptyWorkflowRepositoryState();

  for (const row of result.rows) {
    if (!isWorkflowCollectionKey(row.collection)) {
      continue;
    }

    (state[row.collection] as unknown[]).push(normalizePayload(row.payload_json));
  }

  return normalizeWorkflowRepositoryState(state);
}

function readStateCache(databaseUrl: string, env: NodeJS.ProcessEnv): WorkflowRepositoryState | undefined {
  const ttlMs = getCacheTtlMs(env);
  if (ttlMs <= 0) {
    return undefined;
  }

  const cached = getStateCache().get(databaseUrl);
  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt <= Date.now()) {
    getStateCache().delete(databaseUrl);
    return undefined;
  }

  return cached.state;
}

function writeStateCache(databaseUrl: string, state: WorkflowRepositoryState, env: NodeJS.ProcessEnv): void {
  const ttlMs = getCacheTtlMs(env);
  if (ttlMs <= 0) {
    getStateCache().delete(databaseUrl);
    return;
  }

  getStateCache().set(databaseUrl, {
    expiresAt: Date.now() + ttlMs,
    state,
  });
}

function getCacheTtlMs(env: NodeJS.ProcessEnv): number {
  const rawValue = env.MARKETCREW_POSTGRES_READ_MODEL_CACHE_TTL_MS ?? env.MARKETCREW_POSTGRES_STATE_CACHE_TTL_MS;
  if (!rawValue) {
    return DEFAULT_POSTGRES_READ_MODEL_CACHE_TTL_MS;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : DEFAULT_POSTGRES_READ_MODEL_CACHE_TTL_MS;
}

function getStateCache(): Map<string, CachedWorkflowRepositoryState> {
  globalThis.__marketcrewPostgresReadModelStateCache ??= new Map<string, CachedWorkflowRepositoryState>();
  return globalThis.__marketcrewPostgresReadModelStateCache;
}

function getPool(databaseUrl: string): pg.Pool {
  globalThis.__marketcrewPostgresReadModelPools ??= new Map<string, pg.Pool>();
  const existingPool = globalThis.__marketcrewPostgresReadModelPools.get(databaseUrl);
  if (existingPool) {
    return existingPool;
  }

  const pool = new Pool({
    allowExitOnIdle: true,
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    max: 2,
  });
  globalThis.__marketcrewPostgresReadModelPools.set(databaseUrl, pool);

  return pool;
}

function getSchemaSql(): Promise<string> {
  globalThis.__marketcrewPostgresReadModelSchemaSql ??= readFile(resolve(process.cwd(), "db/workflow-store.sql"), "utf8");
  return globalThis.__marketcrewPostgresReadModelSchemaSql;
}

function normalizePayload(payload: unknown): unknown {
  return typeof payload === "string" ? JSON.parse(payload) : payload;
}

function isWorkflowCollectionKey(collection: string): collection is WorkflowCollectionKey {
  return workflowCollectionKeys.includes(collection as WorkflowCollectionKey);
}

function isMissingWorkflowRecordsTable(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "42P01");
}
