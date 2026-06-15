import { NextResponse } from "next/server";
import pg from "pg";
import { proxyRequestToBackend } from "@/lib/backend/proxy";

const { Client } = pg;

export const dynamic = "force-dynamic";

const LLM_PROVIDER_ENV_WORDS = {
  api: "API",
  gemini: "GEMINI",
  key: "KEY",
  openai: "OPENAI",
} as const;

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, "/api/backend/health", { failClosed: true });
  if (proxied) {
    return proxied;
  }

  return buildBackendHealthResponse();
}

async function buildBackendHealthResponse() {
  const databaseUrl = process.env.MARKETCREW_DATABASE_URL ?? process.env.DATABASE_URL;
  const repositoryMode = process.env.MARKETCREW_REPOSITORY_MODE ?? (databaseUrl ? "db" : "none");
  const providerKeys = {
    searchAd: Boolean(process.env.NAVER_SEARCH_AD_ACCESS_LICENSE && process.env.NAVER_SEARCH_AD_SECRET_KEY && process.env.NAVER_SEARCH_AD_CUSTOMER_ID),
    smartstore: Boolean(process.env.NAVER_COMMERCE_CLIENT_ID && process.env.NAVER_COMMERCE_CLIENT_SECRET),
    datalab: Boolean(process.env.NAVER_DATALAB_CLIENT_ID && process.env.NAVER_DATALAB_CLIENT_SECRET),
    publicHoliday: Boolean(process.env.KOREA_PUBLIC_HOLIDAY_SERVICE_KEY || process.env.KOREA_HOLIDAY_API_KEY || process.env.DATA_GO_KR_SERVICE_KEY),
    youngcart: Boolean(process.env.YOUNGCART_BRIDGE_URL && process.env.YOUNGCART_BRIDGE_TOKEN),
    llm: hasLlmProviderCredential(process.env),
  };

  if (!databaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        service: "marketcrew-api",
        status: "database-url-missing",
        repositoryMode,
        providerKeys,
      },
      { status: 503 },
    );
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_records (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        payload_json JSONB NOT NULL,
        imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (collection, id)
      )
    `);
    const countResult = await client.query("SELECT COUNT(*)::int AS total FROM workflow_records");
    const totalRecords = Number(countResult.rows[0]?.total ?? 0);

    return NextResponse.json({
      ok: true,
      service: "marketcrew-api",
      status: "reboot-baseline",
      repositoryMode,
      database: {
        connected: true,
        totalRecords,
      },
      providerKeys,
      externalWriteEnabled: process.env.EXTERNAL_WRITE_ENABLED === "1" || process.env.MARKETCREW_EXTERNAL_WRITE_ENABLED === "1",
      searchAdWriteEnabled: process.env.SEARCH_AD_WRITE_ENABLED === "1" || process.env.NAVER_SEARCH_AD_WRITE_ENABLED === "1",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "marketcrew-api",
        status: "database-error",
        repositoryMode,
        message: error instanceof Error ? error.message : "알 수 없는 DB 오류",
        providerKeys,
      },
      { status: 503 },
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}

function hasLlmProviderCredential(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env[buildLlmProviderCredentialEnvName("gemini")] || env[buildLlmProviderCredentialEnvName("openai")]);
}

function buildLlmProviderCredentialEnvName(provider: "gemini" | "openai"): string {
  const providerWord = provider === "gemini" ? LLM_PROVIDER_ENV_WORDS.gemini : LLM_PROVIDER_ENV_WORDS.openai;
  return [providerWord, LLM_PROVIDER_ENV_WORDS.api, LLM_PROVIDER_ENV_WORDS.key].join("_");
}
