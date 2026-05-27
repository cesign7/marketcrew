import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "@/lib/auth/cron";

describe("cron auth", () => {
  it("크론 경로에서 허용된 토큰만 통과시킨다", () => {
    const request = new Request("https://marketcrew.app/api/cron/search-ad-daily-sync", {
      headers: { authorization: "Bearer test-secret" },
    });

    expect(isAuthorizedCronRequest(request, { CRON_SECRET: "test-secret" })).toBe(true);
  });

  it("로그인 API가 아니거나 토큰이 다르면 차단한다", () => {
    const request = new Request("https://marketcrew.app/api/search-ad/reports/sync", {
      headers: { authorization: "Bearer test-secret" },
    });
    const wrongTokenRequest = new Request("https://marketcrew.app/api/cron/search-ad-daily-sync", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    expect(isAuthorizedCronRequest(request, { CRON_SECRET: "test-secret" })).toBe(false);
    expect(isAuthorizedCronRequest(wrongTokenRequest, { CRON_SECRET: "test-secret" })).toBe(false);
  });
});
