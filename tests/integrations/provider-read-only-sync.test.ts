import { describe, expect, it } from "vitest";
import {
  buildCommerceReadOnlySyncReport,
  buildCommerceTokenRequest,
} from "../../src/lib/integrations/commerce/read-only-sync";
import {
  buildDatalabReadOnlySyncReport,
  buildDatalabSearchRequestBody,
  mapDatalabSearchResponseToSnapshots,
} from "../../src/lib/integrations/datalab/read-only-sync";
import { buildReadOnlyProviderSyncReports } from "../../src/lib/integrations/providers/read-only-sync";
import {
  buildSearchAdKeywordToolRequest,
  buildSearchAdReadOnlySyncReport,
  createSearchAdSignature,
} from "../../src/lib/integrations/search-ad/read-only-sync";
import {
  buildYoungcartBridgeUrl,
  buildYoungcartReadOnlySyncReport,
} from "../../src/lib/integrations/youngcart/read-only-sync";

const NOW = "2026-05-22T12:00:00+09:00";

describe("읽기 전용 연동 수집", () => {
  it("Search Ad 인증값이 없으면 네트워크 호출 없이 missing config sync report를 만든다", () => {
    const report = buildSearchAdReadOnlySyncReport({}, NOW);

    expect(report.status).toBe("SKIPPED_MISSING_CONFIG");
    expect(report.readOnly).toBe(true);
    expect(report.networkAttempted).toBe(false);
    expect(report.writeAttempted).toBe(false);
    expect(report.missingEnvKeys).toEqual([
      "NAVER_SEARCH_AD_ACCESS_LICENSE",
      "NAVER_SEARCH_AD_SECRET_KEY",
      "NAVER_SEARCH_AD_CUSTOMER_ID",
    ]);
    expect(report.generatedSignal?.source).toBe("search_ad");
  });

  it("Search Ad read-only 요청 헤더는 공식 signature 계약을 따른다", () => {
    const signature = createSearchAdSignature("123", "GET", "/keywordstool", "secret");
    const request = buildSearchAdKeywordToolRequest({
      env: {
        NAVER_SEARCH_AD_ACCESS_LICENSE: "access-license",
        NAVER_SEARCH_AD_SECRET_KEY: "secret",
        NAVER_SEARCH_AD_CUSTOMER_ID: "customer-id",
      },
      hintKeywords: ["부처님오신날 선물카드"],
      timestamp: "123",
    });

    expect(signature).toBe("aotC8QWz5ZgUDAkjx00ufhhtS42pfRf0kFYkoaihtZY=");
    expect(request.url).toContain("https://api.searchad.naver.com/keywordstool");
    expect(decodeURIComponent(request.url)).toContain("hintKeywords=부처님오신날선물카드");
    expect(request.url).toContain("showDetail=1");
    expect(request.headers).toMatchObject({
      "X-Timestamp": "123",
      "X-API-KEY": "access-license",
      "X-Customer": "customer-id",
      "X-Signature": signature,
    });
    expect(JSON.stringify(request.headers)).not.toContain("secret");
  });

  it("Search Ad 성공 응답은 KeywordDemandSnapshot으로 정규화한다", async () => {
    const report = await import("../../src/lib/integrations/search-ad/read-only-sync").then(({ syncSearchAdKeywordTool }) =>
      syncSearchAdKeywordTool({
        checkedAt: NOW,
        env: {
          NAVER_SEARCH_AD_ACCESS_LICENSE: "access-license",
          NAVER_SEARCH_AD_SECRET_KEY: "secret",
          NAVER_SEARCH_AD_CUSTOMER_ID: "customer-id",
        },
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              keywordList: [
                {
                  relKeyword: "부처님오신날 선물카드",
                  monthlyPcQcCnt: "420",
                  monthlyMobileQcCnt: "1,800",
                  compIdx: "중간",
                  monthlyAvePcCtr: "1.2",
                },
              ],
            }),
            { status: 200 },
          ),
      }),
    );

    expect(report.status).toBe("SYNCED");
    expect(report.networkAttempted).toBe(true);
    expect(report.writeAttempted).toBe(false);
    expect(report.keywordDemandSnapshots?.[0]).toMatchObject({
      keyword: "부처님오신날 선물카드",
      provider: "naver_keyword_tool",
      monthlyPcSearches: 420,
      monthlyMobileSearches: 1800,
      competitionIndex: "MEDIUM",
    });
  });

  it("DataLab 인증값이 없으면 네트워크 호출 없이 상대 ratio 주석을 남긴다", () => {
    const report = buildDatalabReadOnlySyncReport({}, NOW);

    expect(report.status).toBe("SKIPPED_MISSING_CONFIG");
    expect(report.networkAttempted).toBe(false);
    expect(report.evidenceNotes.join(" ")).toContain("상대값");
    expect(report.generatedSignal?.source).toBe("datalab");
  });

  it("DataLab 요청은 공식 제한에 맞춰 keyword group 5개, keyword 20개까지만 유지한다", () => {
    const body = buildDatalabSearchRequestBody({
      startDate: "2026-04-01",
      endDate: "2026-05-22",
      timeUnit: "date",
      keywordGroups: Array.from({ length: 6 }, (_, groupIndex) => ({
        groupName: `group-${groupIndex}`,
        keywords: Array.from({ length: 21 }, (_, keywordIndex) => `keyword-${groupIndex}-${keywordIndex}`),
      })),
    });

    expect(body.keywordGroups).toHaveLength(5);
    expect(body.keywordGroups[0]?.keywords).toHaveLength(20);
  });

  it("DataLab 응답은 SearchTrendSnapshot으로 정규화하고 절대값이 아님을 유지한다", () => {
    const snapshots = mapDatalabSearchResponseToSnapshots({
      collectedAt: NOW,
      response: {
        startDate: "2026-04-01",
        endDate: "2026-05-22",
        timeUnit: "date",
        results: [
          {
            title: "부처님오신날",
            keywords: ["부처님오신날 선물카드"],
            data: [
              { period: "2026-05-01", ratio: 10 },
              { period: "2026-05-02", ratio: 100 },
            ],
          },
        ],
      },
    });

    expect(snapshots[0]).toMatchObject({
      provider: "naver_datalab",
      keywordGroupName: "부처님오신날",
      note: "relative_ratio_not_absolute_volume",
    });
    expect(snapshots[0]?.ratios[1]?.ratio).toBe(100);
  });

  it("DataLab 성공 응답은 live sync report에 SearchTrendSnapshot을 담는다", async () => {
    const report = await import("../../src/lib/integrations/datalab/read-only-sync").then(({ syncDatalabSearchTrends }) =>
      syncDatalabSearchTrends({
        checkedAt: NOW,
        env: {
          NAVER_DATALAB_CLIENT_ID: "client-id",
          NAVER_DATALAB_CLIENT_SECRET: "client-secret",
        },
        requestBody: {
          startDate: "2026-04-01",
          endDate: "2026-05-22",
          timeUnit: "date",
          keywordGroups: [{ groupName: "부처님오신날", keywords: ["부처님오신날 선물카드"] }],
        },
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              startDate: "2026-04-01",
              endDate: "2026-05-22",
              timeUnit: "date",
              results: [
                {
                  title: "부처님오신날",
                  keywords: ["부처님오신날 선물카드"],
                  data: [{ period: "2026-05-01", ratio: 100 }],
                },
              ],
            }),
            { status: 200 },
          ),
      }),
    );

    expect(report.status).toBe("SYNCED");
    expect(report.networkAttempted).toBe(true);
    expect(report.writeAttempted).toBe(false);
    expect(report.searchTrendSnapshots?.[0]?.note).toBe("relative_ratio_not_absolute_volume");
  });

  it("통합 sync report는 Search Ad와 DataLab만 read-only 대상으로 반환한다", () => {
    const reports = buildReadOnlyProviderSyncReports({}, NOW);

    expect(reports.map((report) => report.provider)).toEqual(["search_ad", "datalab", "smartstore", "shop"]);
    expect(reports.every((report) => report.writeAttempted === false)).toBe(true);
  });

  it("커머스 인증/승인값이 없으면 네트워크 호출 없이 missing config sync report를 만든다", () => {
    const report = buildCommerceReadOnlySyncReport({}, NOW);

    expect(report.status).toBe("SKIPPED_MISSING_CONFIG");
    expect(report.provider).toBe("smartstore");
    expect(report.networkAttempted).toBe(false);
    expect(report.writeAttempted).toBe(false);
    expect(report.generatedSignal?.source).toBe("smartstore");
    expect(report.missingEnvKeys).toEqual(
      expect.arrayContaining([
        "NAVER_COMMERCE_CLIENT_ID",
        "NAVER_COMMERCE_CLIENT_SECRET",
        "MARKETCREW_COMMERCE_READ_ONLY_CONFIRMED=true",
        "MARKETCREW_COMMERCE_SIGNATURE_DRIVER_READY=true",
        "MARKETCREW_COMMERCE_TOKEN_PROBE_APPROVED=true",
      ]),
    );
  });

  it("커머스 토큰 요청은 bcrypt client_secret_sign 계약을 사용하고 secret 원문을 저장하지 않는다", () => {
    const request = buildCommerceTokenRequest({
      env: {
        NAVER_COMMERCE_CLIENT_ID: "client-id",
        NAVER_COMMERCE_CLIENT_SECRET: "$2a$10$abcdefghijklmnopqrstuu",
      },
      timestamp: "1790000000000",
    });

    expect(request.url).toBe("https://api.commerce.naver.com/external/v1/oauth2/token");
    expect(request.body.get("client_id")).toBe("client-id");
    expect(request.body.get("grant_type")).toBe("client_credentials");
    expect(request.body.get("type")).toBe("SELF");
    expect(request.body.get("client_secret_sign")).toBeTruthy();
    expect(request.body.get("client_secret_sign")).not.toBe("$2a$10$abcdefghijklmnopqrstuu");
  });

  it("커머스 성공 응답은 aggregate-only snapshot과 signal로 정규화한다", async () => {
    const report = await import("../../src/lib/integrations/commerce/read-only-sync").then(({ syncCommerceOrderAggregate }) =>
      syncCommerceOrderAggregate({
        checkedAt: NOW,
        env: {
          NAVER_COMMERCE_CLIENT_ID: "client-id",
          NAVER_COMMERCE_CLIENT_SECRET: "$2a$10$abcdefghijklmnopqrstuu",
          MARKETCREW_COMMERCE_READ_ONLY_CONFIRMED: "true",
          MARKETCREW_COMMERCE_SIGNATURE_DRIVER_READY: "true",
          MARKETCREW_COMMERCE_TOKEN_PROBE_APPROVED: "true",
          NAVER_COMMERCE_AGGREGATE_WINDOW_DAYS: "1",
          NAVER_COMMERCE_TARGET_BRANDS: "STICKERSEE",
        },
        now: new Date("2026-05-22T03:00:00.000Z"),
        fetchImpl: async (url, init) => {
          const requestUrl = String(url);
          if (requestUrl.endsWith("/external/v1/oauth2/token")) {
            expect(init?.method).toBe("POST");
            return jsonResponse({
              access_token: "commerce-access-token",
              token_type: "Bearer",
              expires_in: 10_800,
            });
          }

          if (requestUrl.includes("/last-changed-statuses")) {
            expect(init?.headers).toEqual(expect.objectContaining({ Authorization: "Bearer commerce-access-token" }));
            return jsonResponse({
              data: {
                lastChangeStatuses: [{ productOrderId: "po-1" }, { productOrderId: "po-2" }],
              },
            });
          }

          if (requestUrl.endsWith("/external/v1/pay-order/seller/product-orders/query")) {
            return jsonResponse({
              data: {
                productOrders: [
                  { productOrder: { productName: "선물카드", totalPaymentAmount: 7000 } },
                  { productOrder: { productName: "감사카드", totalPaymentAmount: 5000 } },
                ],
              },
            });
          }

          throw new Error(`Unexpected request: ${requestUrl}`);
        },
      }),
    );

    expect(report.status).toBe("SYNCED");
    expect(report.writeAttempted).toBe(false);
    expect(report.commerceAggregateSnapshot).toMatchObject({
      provider: "naver_commerce",
      brandKey: "STICKERSEE",
      paidOrderCount: 2,
      grossSales: 12000,
      topProductName: "선물카드",
      dataScope: "aggregate_only",
    });
    expect(report.generatedSignal?.source).toBe("smartstore");
    expect(JSON.stringify(report)).not.toContain("commerce-access-token");
  });

  it("영카트 bridge 설정이 없으면 네트워크 호출 없이 missing config sync report를 만든다", () => {
    const report = buildYoungcartReadOnlySyncReport({}, NOW);

    expect(report.status).toBe("SKIPPED_MISSING_CONFIG");
    expect(report.provider).toBe("shop");
    expect(report.networkAttempted).toBe(false);
    expect(report.writeAttempted).toBe(false);
    expect(report.generatedSignal?.source).toBe("shop");
  });

  it("영카트 bridge URL은 token을 query에 노출하지 않고 action/windowDays만 붙인다", () => {
    const url = buildYoungcartBridgeUrl(
      {
        YOUNGCART_BRIDGE_URL: "https://shop.example.test/marketcrew-bridge.php",
        YOUNGCART_BRIDGE_TOKEN: "bridge-secret-token",
      },
      { action: "aggregate", windowDays: "30" },
    );

    expect(url).toBe("https://shop.example.test/marketcrew-bridge.php?action=aggregate&windowDays=30");
    expect(url).not.toContain("bridge-secret-token");
  });

  it("영카트 bridge 성공 응답은 aggregate-only snapshot과 signal로 정규화한다", async () => {
    const report = await import("../../src/lib/integrations/youngcart/read-only-sync").then(({ syncYoungcartBridgeAggregate }) =>
      syncYoungcartBridgeAggregate({
        checkedAt: NOW,
        env: {
          YOUNGCART_BRIDGE_URL: "https://shop.example.test/marketcrew-bridge.php",
          YOUNGCART_BRIDGE_TOKEN: "bridge-secret-token",
          MARKETCREW_YOUNGCART_BRIDGE_APPROVED: "true",
          MARKETCREW_YOUNGCART_PII_MINIMIZATION_CONFIRMED: "true",
        },
        fetchImpl: async (url, init) => {
          expect(String(url)).toBe("https://shop.example.test/marketcrew-bridge.php?action=aggregate&windowDays=30");
          expect(init?.headers).toEqual(expect.objectContaining({ "X-MarketCrew-Token": "bridge-secret-token" }));

          return jsonResponse({
            brandKey: "COFFEEPRINT",
            windowDays: 30,
            orderCount: 17,
            repeatCustomerCount: 5,
            grossSales: 880000,
            averageOrderValue: 51765,
            collectedAt: NOW,
          });
        },
      }),
    );

    expect(report.status).toBe("SYNCED");
    expect(report.writeAttempted).toBe(false);
    expect(report.shopAggregateSnapshot).toMatchObject({
      provider: "youngcart_bridge",
      brandKey: "COFFEEPRINT",
      orderCount: 17,
      repeatCustomerCount: 5,
      dataScope: "aggregate_only",
    });
    expect(report.generatedSignal?.source).toBe("shop");
    expect(JSON.stringify(report)).not.toContain("bridge-secret-token");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
