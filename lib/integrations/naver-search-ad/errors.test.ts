import { describe, expect, it } from "vitest";
import { sanitizeSearchAdErrorMessage } from "./errors";

describe("Naver Search Ad error handling", () => {
  it("redacts API key and customer id values from API error bodies", () => {
    const sanitized = sanitizeSearchAdErrorMessage(
      'Naver Search Ad API failed: GET /ncc/campaigns 403 {"detail":"Auth failed with api-key: abc123, customer-id: 123456"}',
    );

    expect(sanitized).toContain("api-key: [redacted]");
    expect(sanitized).toContain("customer-id: [redacted]");
    expect(sanitized).not.toContain("abc123");
    expect(sanitized).not.toContain("123456");
  });

  it("redacts header-like secret values", () => {
    const sanitized = sanitizeSearchAdErrorMessage(
      "X-API-KEY: abc X-Signature: sig SECRET_KEY: secret",
    );

    expect(sanitized).not.toContain("abc");
    expect(sanitized).not.toContain("sig");
    expect(sanitized).not.toContain("secret");
  });
});
