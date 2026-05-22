import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createOwnerSessionToken, sanitizeNextPath, verifyOwnerSessionToken } from "../../src/lib/auth/session";

let previousSecret: string | undefined;

beforeEach(() => {
  previousSecret = process.env.MARKETCREW_AUTH_SECRET;
  process.env.MARKETCREW_AUTH_SECRET = "test-secret-for-session-signing";
});

afterEach(() => {
  if (previousSecret === undefined) {
    delete process.env.MARKETCREW_AUTH_SECRET;
  } else {
    process.env.MARKETCREW_AUTH_SECRET = previousSecret;
  }
});

describe("owner session", () => {
  it("대표 세션 토큰을 서명하고 검증한다", async () => {
    const now = Date.parse("2026-05-22T00:00:00.000Z");
    const token = await createOwnerSessionToken(now);

    await expect(verifyOwnerSessionToken(token, now + 1000)).resolves.toBe(true);
    await expect(verifyOwnerSessionToken(token, now + 60 * 60 * 13 * 1000)).resolves.toBe(false);
  });

  it("로그인 후 이동 경로는 내부 경로만 허용한다", () => {
    expect(sanitizeNextPath("/operations?tab=today")).toBe("/operations?tab=today");
    expect(sanitizeNextPath("https://example.com")).toBe("/operations");
    expect(sanitizeNextPath("//example.com")).toBe("/operations");
    expect(sanitizeNextPath("/api/auth/logout")).toBe("/operations");
  });
});
