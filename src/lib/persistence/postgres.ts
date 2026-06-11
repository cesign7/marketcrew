import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | undefined;

export function getDatabaseUrl(env: Readonly<Record<string, string | undefined>> = process.env) {
  return env.MARKETCREW_DATABASE_URL ?? env.DATABASE_URL;
}

export function hasDatabaseUrl(env: Readonly<Record<string, string | undefined>> = process.env) {
  return Boolean(getDatabaseUrl(env));
}

export function getPostgresPool() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("MARKETCREW_DATABASE_URL or DATABASE_URL is required.");
  }

  pool ??= new Pool({ connectionString });
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values: unknown[] = []) {
  return getPostgresPool().query<T>(text, values);
}
