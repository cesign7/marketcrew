export const AUTH_COOKIE_NAME = "marketcrew_owner_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type OwnerSessionPayload = {
  exp: number;
  iat: number;
  sub: "owner";
};

const textEncoder = new TextEncoder();

export function isAuthRequired() {
  return process.env.MARKETCREW_AUTH_DISABLED !== "1";
}

export function isAuthConfigured() {
  return Boolean(process.env.MARKETCREW_AUTH_SECRET && process.env.MARKETCREW_OWNER_PASSWORD_HASH);
}

export function sanitizeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/api/auth")) {
    return "/operations";
  }

  return value;
}

export async function createOwnerSessionToken(now = Date.now()) {
  const payload: OwnerSessionPayload = {
    sub: "owner",
    iat: Math.floor(now / 1000),
    exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = base64UrlEncode(textEncoder.encode(JSON.stringify(payload)));
  const signature = await sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifyOwnerSessionToken(token: string | undefined, now = Date.now()) {
  if (!token) {
    return false;
  }

  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra !== undefined) {
    return false;
  }

  const expected = base64UrlDecode(encodedSignature);
  const validSignature = await verify(encodedPayload, expected);
  if (!validSignature) {
    return false;
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as Partial<OwnerSessionPayload>;
    return payload.sub === "owner" && typeof payload.exp === "number" && payload.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

export function getOwnerSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

async function sign(encodedPayload: string) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(encodedPayload));

  return base64UrlEncode(new Uint8Array(signature));
}

async function verify(encodedPayload: string, signature: Uint8Array) {
  const key = await getSigningKey();

  return crypto.subtle.verify("HMAC", key, toArrayBuffer(signature), textEncoder.encode(encodedPayload));
}

async function getSigningKey() {
  const secret = process.env.MARKETCREW_AUTH_SECRET;
  if (!secret) {
    throw new Error("MARKETCREW_AUTH_SECRET is required for owner session signing.");
  }

  return crypto.subtle.importKey("raw", textEncoder.encode(secret), { hash: "SHA-256", name: "HMAC" }, false, ["sign", "verify"]);
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
