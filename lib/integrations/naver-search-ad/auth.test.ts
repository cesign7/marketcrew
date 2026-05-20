import { describe, expect, it } from "vitest";
import {
  buildSearchAdHeaders,
  createSearchAdSignature,
  readSearchAdCredentials,
} from "./auth";

describe("Naver Search Ad auth", () => {
  it("creates the official HMAC signature from timestamp, method, uri, and secret", () => {
    const signature = createSearchAdSignature({
      timestamp: "1700000000000",
      method: "GET",
      uri: "/ncc/campaigns",
      secretKey: "secret",
    });

    expect(signature).toBe("9eQw3iPVTMIl3cgVonp2ltPK6kBGHuGeRLFPC4u7iOw=");
  });

  it("builds request headers without exposing the secret key", () => {
    const headers = buildSearchAdHeaders({
      apiKey: "api-key",
      customerId: "123456",
      secretKey: "secret",
      timestamp: "1700000000000",
      method: "GET",
      uri: "/ncc/campaigns",
    });

    expect(headers).toEqual({
      "Content-Type": "application/json; charset=UTF-8",
      "X-Timestamp": "1700000000000",
      "X-API-KEY": "api-key",
      "X-Customer": "123456",
      "X-Signature": "9eQw3iPVTMIl3cgVonp2ltPK6kBGHuGeRLFPC4u7iOw=",
    });
    expect(JSON.stringify(headers)).not.toContain("secret");
  });

  it("reports missing credentials by variable name only", () => {
    expect(() =>
      readSearchAdCredentials({
        NAVER_SEARCHAD_API_KEY: "api-key",
        NAVER_SEARCHAD_SECRET_KEY: "",
        NAVER_SEARCHAD_CUSTOMER_ID: "123456",
      }),
    ).toThrow("NAVER_SEARCHAD_SECRET_KEY");
  });

  it("accepts the Naver Access License env alias as the API key", () => {
    expect(
      readSearchAdCredentials({
        NAVER_SEARCH_AD_ACCESS_LICENSE: "access-license",
        NAVER_SEARCH_AD_SECRET_KEY: "secret",
        NAVER_SEARCH_AD_CUSTOMER_ID: "123456",
      }).apiKey,
    ).toBe("access-license");
  });
});
