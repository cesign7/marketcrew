import crypto from "node:crypto";

export interface SearchAdCredentials {
  apiKey: string;
  secretKey: string;
  customerId: string;
  baseUrl: string;
}

export interface SearchAdSignatureInput {
  timestamp: string;
  method: string;
  uri: string;
  secretKey: string;
}

export interface SearchAdHeaderInput extends SearchAdSignatureInput {
  apiKey: string;
  customerId: string;
}

const defaultBaseUrl = "https://api.searchad.naver.com";

export function readSearchAdCredentials(
  env: Partial<Record<string, string | undefined>> = process.env,
): SearchAdCredentials {
  const apiKey = requiredEnv(env, [
    "NAVER_SEARCHAD_API_KEY",
    "NAVER_SEARCH_AD_ACCESS_LICENSE",
    "NAVER_SEARCH_AD_API_KEY",
  ]);
  const secretKey = requiredEnv(env, [
    "NAVER_SEARCHAD_SECRET_KEY",
    "NAVER_SEARCH_AD_SECRET_KEY",
  ]);
  const customerId = requiredEnv(env, [
    "NAVER_SEARCHAD_CUSTOMER_ID",
    "NAVER_SEARCH_AD_CUSTOMER_ID",
  ]);
  const baseUrl =
    optionalEnv(env, ["NAVER_SEARCHAD_BASE_URL", "NAVER_SEARCH_AD_BASE_URL"]) ??
    defaultBaseUrl;

  return {
    apiKey,
    secretKey,
    customerId,
    baseUrl,
  };
}

export function createSearchAdSignature({
  timestamp,
  method,
  uri,
  secretKey,
}: SearchAdSignatureInput) {
  const message = `${timestamp}.${method.toUpperCase()}.${uri}`;

  return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
}

export function buildSearchAdHeaders(input: SearchAdHeaderInput) {
  return {
    "Content-Type": "application/json; charset=UTF-8",
    "X-Timestamp": input.timestamp,
    "X-API-KEY": input.apiKey,
    "X-Customer": input.customerId,
    "X-Signature": createSearchAdSignature(input),
  };
}

function requiredEnv(
  env: Partial<Record<string, string | undefined>>,
  names: string[],
) {
  const value = optionalEnv(env, names);

  if (!value) {
    throw new Error(`Missing required environment variable: ${names[0]}`);
  }

  return value;
}

function optionalEnv(
  env: Partial<Record<string, string | undefined>>,
  names: string[],
) {
  for (const name of names) {
    const value = env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}
