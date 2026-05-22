import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "../../src/app/api/auth/login/route";

let previousSecret: string | undefined;
let previousHash: string | undefined;

beforeEach(() => {
  previousSecret = process.env.MARKETCREW_AUTH_SECRET;
  previousHash = process.env.MARKETCREW_OWNER_PASSWORD_HASH;
  process.env.MARKETCREW_AUTH_SECRET = "test-secret-for-login-route";
  process.env.MARKETCREW_OWNER_PASSWORD_HASH = bcrypt.hashSync("대표비밀번호", 8);
});

afterEach(() => {
  if (previousSecret === undefined) {
    delete process.env.MARKETCREW_AUTH_SECRET;
  } else {
    process.env.MARKETCREW_AUTH_SECRET = previousSecret;
  }

  if (previousHash === undefined) {
    delete process.env.MARKETCREW_OWNER_PASSWORD_HASH;
  } else {
    process.env.MARKETCREW_OWNER_PASSWORD_HASH = previousHash;
  }
});

describe("owner login route", () => {
  it("올바른 비밀번호면 세션 쿠키를 발급한다", async () => {
    const response = await POST(createLoginRequest("대표비밀번호", "/follow-ups"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://127.0.0.1/follow-ups");
    expect(response.headers.get("set-cookie")).toContain("marketcrew_owner_session=");
  });

  it("틀린 비밀번호면 로그인 화면으로 돌려보낸다", async () => {
    const response = await POST(createLoginRequest("틀린비밀번호", "/operations"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://127.0.0.1/login?next=%2Foperations&error=1");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

function createLoginRequest(password: string, next: string) {
  const body = new URLSearchParams({ next, password });

  return new Request("http://127.0.0.1/api/auth/login", {
    body,
    method: "POST",
  });
}
