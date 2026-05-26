import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "@/lib/auth/session";

describe("sanitizeNextPath", () => {
  it("내부 화면 경로만 로그인 후 이동 대상으로 허용한다", () => {
    expect(sanitizeNextPath("/operations")).toBe("/operations");
    expect(sanitizeNextPath("/")).toBe("/");
    expect(sanitizeNextPath("https://example.com")).toBe("/operations");
    expect(sanitizeNextPath("//example.com")).toBe("/operations");
    expect(sanitizeNextPath("/api/auth/logout")).toBe("/operations");
    expect(sanitizeNextPath(undefined)).toBe("/operations");
  });
});
