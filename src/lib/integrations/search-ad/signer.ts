import crypto from "node:crypto";

export type SearchAdSignatureInput = {
  method: string;
  secretKey: string;
  timestamp: string | number;
  uri: string;
};

export function createSearchAdSignature({ method, secretKey, timestamp, uri }: SearchAdSignatureInput) {
  const normalizedUri = normalizeSignatureUri(uri);
  const message = `${timestamp}.${method.toUpperCase()}.${normalizedUri}`;
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
}

export function normalizeSignatureUri(uri: string) {
  const parsed = uri.startsWith("http://") || uri.startsWith("https://") ? new URL(uri) : undefined;
  const path = parsed ? parsed.pathname : uri.split("?")[0] || "/";
  return path.startsWith("/api/") ? path.slice(4) : path;
}
