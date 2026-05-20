import { describe, expect, it, vi } from "vitest";
import { NaverSearchAdClient } from "./client";

describe("NaverSearchAdClient", () => {
  it("requests campaigns with signed headers", async () => {
    const fetcher = vi.fn(async () => jsonResponse([{ nccCampaignId: "cmp-1" }]));
    const client = new NaverSearchAdClient(
      {
        apiKey: "api-key",
        secretKey: "secret",
        customerId: "123456",
        baseUrl: "https://api.searchad.naver.com",
      },
      {
        fetcher,
        now: () => 1700000000000,
      },
    );

    const campaigns = await client.getCampaigns();

    expect(campaigns[0].id).toBe("cmp-1");
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.searchad.naver.com/ncc/campaigns",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "X-Timestamp": "1700000000000",
          "X-API-KEY": "api-key",
          "X-Customer": "123456",
          "X-Signature": "9eQw3iPVTMIl3cgVonp2ltPK6kBGHuGeRLFPC4u7iOw=",
        }),
      }),
    );
  });

  it("keeps query parameters out of the signature uri", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse([{ nccAdgroupId: "grp-1", nccCampaignId: "cmp-1" }]),
    );
    const client = new NaverSearchAdClient(
      {
        apiKey: "api-key",
        secretKey: "secret",
        customerId: "123456",
        baseUrl: "https://api.searchad.naver.com",
      },
      {
        fetcher,
        now: () => 1700000000000,
      },
    );

    await client.getAdgroups("cmp-1");

    const [, init] = fetcher.mock.calls[0];
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://api.searchad.naver.com/ncc/adgroups?nccCampaignId=cmp-1",
    );
    expect(init?.headers).toMatchObject({
      "X-Signature": "vKWPvBpkWRdZS0uBbXEsDdaGHXofbI3bapg9NomICYU=",
    });
  });

  it("throws sanitized API errors", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ detail: "Invalid API key" }, { ok: false, status: 403 }),
    );
    const client = new NaverSearchAdClient(
      {
        apiKey: "api-key",
        secretKey: "secret",
        customerId: "123456",
        baseUrl: "https://api.searchad.naver.com",
      },
      { fetcher, now: () => 1700000000000 },
    );

    await expect(client.getCampaigns()).rejects.toThrow(
      "Naver Search Ad API failed: GET /ncc/campaigns 403",
    );
    await expect(client.getCampaigns()).rejects.not.toThrow("secret");
  });
});

function jsonResponse(
  value: unknown,
  options: {
    ok?: boolean;
    status?: number;
  } = {},
) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    async json() {
      return value;
    },
    async text() {
      return JSON.stringify(value);
    },
  } as Response;
}
