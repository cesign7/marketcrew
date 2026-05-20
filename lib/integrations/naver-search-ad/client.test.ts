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

  it("requests stats with repeated ids and JSON metric parameters signed as /stats", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        data: [{ id: "kw-1" }],
        compTm: "2026-05-19T00:00:00",
        cycleBaseTm: "2026-05-19T00:00:00",
      }),
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

    const stats = await client.getStatsByIds({
      ids: ["kw-1", "kw-2"],
      fields: ["clkCnt", "impCnt", "salesAmt"],
      since: "2026-05-01",
      until: "2026-05-19",
    });

    const [requestedUrl, init] = fetcher.mock.calls[0];
    const url = new URL(requestedUrl as string);

    expect(stats).toEqual([{ id: "kw-1" }]);
    expect(url.pathname).toBe("/stats");
    expect(url.searchParams.getAll("ids")).toEqual(["kw-1", "kw-2"]);
    expect(url.searchParams.get("fields")).toBe(
      '["clkCnt","impCnt","salesAmt"]',
    );
    expect(url.searchParams.get("timeRange")).toBe(
      '{"since":"2026-05-01","until":"2026-05-19"}',
    );
    expect(init?.headers).toMatchObject({
      "X-Signature": "dSmwhFWokbdwBl/uE6S6gXwJnOJpri7T5DFhYjePHJU=",
    });
  });

  it("reads stats from the official summaryStatResponse envelope", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        summaryStatResponse: {
          data: [{ id: "kw-1", impCnt: 12, clkCnt: 3 }],
          cycleBaseTm: "202605190300",
        },
      }),
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

    await expect(
      client.getStatsByIds({
        ids: ["kw-1"],
        fields: ["clkCnt", "impCnt"],
        since: "2026-05-19",
        until: "2026-05-19",
      }),
    ).resolves.toEqual([{ id: "kw-1", impCnt: 12, clkCnt: 3 }]);
  });

  it("creates and polls a read-only stat report job", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          reportJobId: 456,
          reportTp: "SHOPPINGKEYWORD_DETAIL",
          statDt: "2026-05-19T00:00:00Z",
          status: "REGIST",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          reportJobId: 456,
          reportTp: "SHOPPINGKEYWORD_DETAIL",
          statDt: "2026-05-19T00:00:00Z",
          status: "BUILT",
          downloadUrl: "https://api.searchad.naver.com/stat-reports/456/download",
        }),
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

    const created = await client.createStatReportJob({
      reportType: "SHOPPINGKEYWORD_DETAIL",
      statDate: "20260519",
    });
    const polled = await client.getStatReportJob("456");
    const [createUrl, createInit] = fetcher.mock.calls[0];
    const [pollUrl, pollInit] = fetcher.mock.calls[1];

    expect(created.status).toBe("REGIST");
    expect(polled.status).toBe("BUILT");
    expect(createUrl).toBe("https://api.searchad.naver.com/stat-reports");
    expect(createInit).toMatchObject({
      method: "POST",
      body: '{"reportTp":"SHOPPINGKEYWORD_DETAIL","statDt":"20260519"}',
    });
    expect(createInit?.headers).toMatchObject({
      "Content-Type": "application/json; charset=UTF-8",
      "X-Signature": "IUB8ANLH1K+A46RqfBKRim7jykTVViKiXiDOrvon4w0=",
    });
    expect(pollUrl).toBe("https://api.searchad.naver.com/stat-reports/456");
    expect(pollInit?.headers).toMatchObject({
      "X-Signature": "MxFhVjhSM41zlzYg1vJ4mcUng3O64VDsgAyZmwDmReg=",
    });
  });

  it("downloads a same-host stat report as text", async () => {
    const fetcher = vi.fn(async () => textResponse("Date\tKeyword ID\n2026-05-19\tkw-1"));
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

    await expect(
      client.downloadStatReport(
        "https://api.searchad.naver.com/stat-reports/456/download",
      ),
    ).resolves.toContain("Keyword ID");

    const [, init] = fetcher.mock.calls[0];
    expect(init?.method).toBe("GET");
    expect(init?.headers).toMatchObject({
      "X-Signature": "9jXO4imMujkKIayY/+smUBYnmYTwYgO7P0QXYMIrYEs=",
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

function textResponse(value: string) {
  return {
    ok: true,
    status: 200,
    async text() {
      return value;
    },
  } as Response;
}
