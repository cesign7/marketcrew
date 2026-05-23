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
  buildSearchAdShoppingKeywordStatsRequest,
  buildSearchAdStatsRequest,
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
    expect(report.historyPolicy?.apiLimitLabel).toContain("7~90일");
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

  it("Search Ad 성과 요청은 /stats 공식 조회 계약을 따른다", () => {
    const signature = createSearchAdSignature("123", "GET", "/stats", "secret");
    const request = buildSearchAdStatsRequest({
      env: {
        NAVER_SEARCH_AD_ACCESS_LICENSE: "access-license",
        NAVER_SEARCH_AD_SECRET_KEY: "secret",
        NAVER_SEARCH_AD_CUSTOMER_ID: "customer-id",
      },
      ids: ["nkw-a001"],
      timestamp: "123",
      datePreset: "last7days",
      breakdown: "pcMblTp",
    });
    const decodedUrl = decodeURIComponent(request.url);

    expect(request.url).toContain("https://api.searchad.naver.com/stats");
    expect(decodedUrl).toContain("ids=nkw-a001");
    expect(decodedUrl).toContain('"clkCnt"');
    expect(decodedUrl).toContain("datePreset=last7days");
    expect(decodedUrl).toContain("breakdown=pcMblTp");
    expect(request.headers["X-Signature"]).toBe(signature);
  });

  it("쇼핑검색광고 검색어 성과 요청은 NPLA_SCH_KEYWORD 공식 조회 계약을 따른다", () => {
    const signature = createSearchAdSignature("123", "GET", "/stats", "secret");
    const request = buildSearchAdShoppingKeywordStatsRequest({
      env: {
        NAVER_SEARCH_AD_ACCESS_LICENSE: "access-license",
        NAVER_SEARCH_AD_SECRET_KEY: "secret",
        NAVER_SEARCH_AD_CUSTOMER_ID: "customer-id",
      },
      id: "grp-shopping-a001",
      timestamp: "123",
    });
    const decodedUrl = decodeURIComponent(request.url);

    expect(request.url).toContain("https://api.searchad.naver.com/stats");
    expect(decodedUrl).toContain("id=grp-shopping-a001");
    expect(decodedUrl).toContain("statType=NPLA_SCH_KEYWORD");
    expect(request.headers["X-Signature"]).toBe(signature);
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

  it("Search Ad 성공 응답은 성과 /stats를 집계 스냅샷으로 함께 정규화한다", async () => {
    const requestedPaths: string[] = [];
    const report = await import("../../src/lib/integrations/search-ad/read-only-sync").then(({ syncSearchAdKeywordTool }) =>
      syncSearchAdKeywordTool({
        checkedAt: NOW,
        env: {
          NAVER_SEARCH_AD_ACCESS_LICENSE: "access-license",
          NAVER_SEARCH_AD_SECRET_KEY: "secret",
          NAVER_SEARCH_AD_CUSTOMER_ID: "customer-id",
        },
        fetchImpl: async (url) => {
          const parsed = new URL(String(url));
          requestedPaths.push(`${parsed.pathname}?${parsed.searchParams.get("breakdown") ?? "all"}`);

          if (parsed.pathname === "/keywordstool") {
            return new Response(
              JSON.stringify({
                keywordList: [
                  {
                    relKeyword: "부처님오신날 선물카드",
                    monthlyPcQcCnt: "420",
                    monthlyMobileQcCnt: "1,800",
                    compIdx: "중간",
                  },
                ],
              }),
              { status: 200 },
            );
          }

          if (parsed.pathname === "/ncc/campaigns") {
            return new Response(
              JSON.stringify([
                {
                  nccCampaignId: "cmp-a001",
                  name: "스티커씨 시즌 캠페인",
                  status: "ELIGIBLE",
                  trackingMode: "AUTO_TRACKING_MODE",
                },
              ]),
              { status: 200 },
            );
          }

          if (parsed.pathname === "/ncc/adgroups") {
            return new Response(
              JSON.stringify([
                {
                  nccAdgroupId: "grp-a001",
                  name: "부처님오신날 모바일",
                  status: "ELIGIBLE",
                },
              ]),
              { status: 200 },
            );
          }

          if (parsed.pathname === "/ncc/keywords") {
            return new Response(
              JSON.stringify([
                {
                  nccKeywordId: "nkw-a001",
                  keyword: "부처님오신날 선물카드",
                  status: "ELIGIBLE",
                },
              ]),
              { status: 200 },
            );
          }

          if (parsed.pathname === "/stats" && parsed.searchParams.get("breakdown") === "pcMblTp") {
            return new Response(
              JSON.stringify({
                summaryStatResponse: {
                  data: [
                    {
                      id: "nkw-a001",
                      breakdowns: [
                        { name: "PC", impCnt: 100, clkCnt: 5, salesAmt: 2500, ccnt: 1, convAmt: 12000 },
                        { name: "Mobile", impCnt: 900, clkCnt: 35, salesAmt: 24500, ccnt: 0, convAmt: 0 },
                      ],
                    },
                  ],
                },
              }),
              { status: 200 },
            );
          }

          if (parsed.pathname === "/stats" && parsed.searchParams.get("breakdown") === "hh24") {
            return new Response(
              JSON.stringify({
                summaryStatResponse: {
                  data: [
                    {
                      id: "nkw-a001",
                      breakdowns: [{ name: "18", impCnt: 400, clkCnt: 30, salesAmt: 21000, ccnt: 0, convAmt: 0 }],
                    },
                  ],
                },
              }),
              { status: 200 },
            );
          }

          if (parsed.pathname === "/stats") {
            return new Response(
              JSON.stringify({
                summaryStatResponse: {
                  data: [{ id: "nkw-a001", impCnt: 1000, clkCnt: 40, salesAmt: 27000, ccnt: 1, convAmt: 12000 }],
                },
              }),
              { status: 200 },
            );
          }

          return new Response("{}", { status: 404 });
        },
      }),
    );

    expect(report.status).toBe("SYNCED");
    expect(requestedPaths).toEqual(
      expect.arrayContaining(["/ncc/campaigns?all", "/ncc/adgroups?all", "/ncc/keywords?all", "/stats?all", "/stats?pcMblTp", "/stats?hh24"]),
    );
    expect(report.searchAdPerformanceSnapshots).toHaveLength(4);
    expect(report.searchAdPerformanceSnapshots?.[0]).toMatchObject({
      provider: "naver_search_ad",
      brandKey: "stickersee",
      keyword: "부처님오신날 선물카드",
      device: "ALL",
      clicks: 40,
      conversions: 1,
      trackingVerified: true,
      dataScope: "aggregate_only",
    });
    expect(report.searchAdPerformanceSnapshots?.some((snapshot) => snapshot.device === "MOBILE")).toBe(true);
    expect(report.searchAdPerformanceSnapshots?.some((snapshot) => snapshot.timeSlot === "18시")).toBe(true);
    expect(report.evidenceNotes.join(" ")).toContain("성과 스냅샷 4건");
  });

  it("쇼핑검색광고 성공 응답은 검색어 성과 스냅샷으로 정규화한다", async () => {
    const requestedPaths: string[] = [];
    const report = await import("../../src/lib/integrations/search-ad/read-only-sync").then(({ syncSearchAdKeywordTool }) =>
      syncSearchAdKeywordTool({
        checkedAt: NOW,
        env: {
          NAVER_SEARCH_AD_ACCESS_LICENSE: "access-license",
          NAVER_SEARCH_AD_SECRET_KEY: "secret",
          NAVER_SEARCH_AD_CUSTOMER_ID: "customer-id",
        },
        fetchImpl: async (url) => {
          const parsed = new URL(String(url));
          requestedPaths.push(`${parsed.pathname}?${parsed.searchParams.get("statType") ?? parsed.searchParams.get("breakdown") ?? "all"}`);

          if (parsed.pathname === "/keywordstool") {
            return new Response(
              JSON.stringify({
                keywordList: [{ relKeyword: "스승의날 카드", monthlyPcQcCnt: "300", monthlyMobileQcCnt: "1,400" }],
              }),
              { status: 200 },
            );
          }

          if (parsed.pathname === "/ncc/campaigns") {
            return new Response(
              JSON.stringify([
                {
                  nccCampaignId: "cmp-shopping-a001",
                  name: "스티커씨 쇼핑검색광고",
                  status: "ELIGIBLE",
                  campaignTp: "SHOPPING",
                },
              ]),
              { status: 200 },
            );
          }

          if (parsed.pathname === "/ncc/adgroups") {
            return new Response(
              JSON.stringify([
                {
                  nccAdgroupId: "grp-shopping-a001",
                  name: "스티커씨 선물카드 상품형",
                  status: "ELIGIBLE",
                  adgroupType: "SHOPPING",
                  nccProductGroupId: "pdg-a001",
                },
              ]),
              { status: 200 },
            );
          }

          if (parsed.pathname === "/ncc/keywords") {
            return new Response(JSON.stringify([]), { status: 200 });
          }

          if (parsed.pathname === "/ncc/product-groups") {
            return new Response(
              JSON.stringify([
                {
                  nccProductGroupId: "pdg-a001",
                  name: "스티커씨 선물카드 상품그룹",
                  mallName: "스티커씨",
                  registeredProductType: "GENERAL",
                },
              ]),
              { status: 200 },
            );
          }

          if (parsed.pathname === "/stats" && parsed.searchParams.get("statType") === "NPLA_SCH_KEYWORD") {
            return new Response(
              JSON.stringify([
                { schKeyword: "스승의날 카드", clkCnt: 42, drtCrto: 0, salesAmt: 18900 },
                { schKeyword: "선물카드 제작", clkCnt: 16, drtCrto: 2.5, salesAmt: 8300 },
              ]),
              { status: 200 },
            );
          }

          return new Response(JSON.stringify({ summaryStatResponse: { data: [] } }), { status: 200 });
        },
      }),
    );

    expect(requestedPaths).toEqual(expect.arrayContaining(["/ncc/product-groups?all", "/stats?NPLA_SCH_KEYWORD"]));
    expect(report.status).toBe("SYNCED");
    expect(report.shoppingSearchAdPerformanceSnapshots).toHaveLength(2);
    expect(report.shoppingSearchAdPerformanceSnapshots?.[0]).toMatchObject({
      provider: "naver_search_ad",
      brandKey: "stickersee",
      campaignName: "스티커씨 쇼핑검색광고",
      adGroupName: "스티커씨 선물카드 상품형",
      searchKeyword: "스승의날 카드",
      productGroupName: "스티커씨 선물카드 상품그룹",
      mallName: "스티커씨",
      clicks: 42,
      directConversionRate: 0,
      cost: 18900,
      dataScope: "aggregate_only",
    });
    expect(report.shoppingSearchAdPerformanceSnapshots?.[1]?.directConversionRate).toBe(0.025);
    expect(report.evidenceNotes.join(" ")).toContain("쇼핑검색광고 검색어 성과 대상 1개");
  });

  it("쇼핑검색광고 검색어 성과는 화면과 AI 비용 보호를 위해 상위 근거만 저장할 수 있다", async () => {
    const report = await import("../../src/lib/integrations/search-ad/read-only-sync").then(({ syncSearchAdKeywordTool }) =>
      syncSearchAdKeywordTool({
        checkedAt: NOW,
        env: {
          NAVER_SEARCH_AD_ACCESS_LICENSE: "access-license",
          NAVER_SEARCH_AD_SECRET_KEY: "secret",
          NAVER_SEARCH_AD_CUSTOMER_ID: "customer-id",
          MARKETCREW_SEARCH_AD_SHOPPING_STAT_MAX_SNAPSHOTS: "20",
        },
        fetchImpl: async (url) => {
          const parsed = new URL(String(url));
          if (parsed.pathname === "/keywordstool") {
            return jsonResponse({ keywordList: [{ relKeyword: "스승의날 카드" }] });
          }
          if (parsed.pathname === "/ncc/campaigns") {
            return jsonResponse([{ nccCampaignId: "cmp-shopping-a001", name: "쇼핑", status: "ELIGIBLE", campaignTp: "SHOPPING" }]);
          }
          if (parsed.pathname === "/ncc/adgroups") {
            return jsonResponse([{ nccAdgroupId: "grp-shopping-a001", name: "상품형", status: "ELIGIBLE", adgroupType: "SHOPPING" }]);
          }
          if (parsed.pathname === "/ncc/keywords") {
            return jsonResponse([]);
          }
          if (parsed.pathname === "/ncc/product-groups") {
            return jsonResponse([]);
          }
          if (parsed.pathname === "/stats" && parsed.searchParams.get("statType") === "NPLA_SCH_KEYWORD") {
            return jsonResponse([
              { schKeyword: "낮은 비용 검색어", clkCnt: 2, drtCrto: 0, salesAmt: 100 },
              { schKeyword: "높은 비용 검색어", clkCnt: 50, drtCrto: 0, salesAmt: 50000 },
              ...Array.from({ length: 19 }, (_, index) => ({
                schKeyword: `중간 비용 검색어 ${index + 1}`,
                clkCnt: 10 + index,
                drtCrto: 0,
                salesAmt: 1000 + index,
              })),
            ]);
          }

          return jsonResponse({ summaryStatResponse: { data: [] } });
        },
      }),
    );

    expect(report.shoppingSearchAdPerformanceSnapshots).toHaveLength(20);
    expect(report.shoppingSearchAdPerformanceSnapshots?.[0]?.searchKeyword).toBe("높은 비용 검색어");
    expect(report.shoppingSearchAdPerformanceSnapshots?.some((snapshot) => snapshot.searchKeyword === "낮은 비용 검색어")).toBe(false);
    expect(report.evidenceNotes.join(" ")).toContain("상위 20건만 저장");
  });

  it("Search Ad 성과 대상이 없으면 키워드 수요 수집은 유지하고 원인을 남긴다", async () => {
    const report = await import("../../src/lib/integrations/search-ad/read-only-sync").then(({ syncSearchAdKeywordTool }) =>
      syncSearchAdKeywordTool({
        checkedAt: NOW,
        env: {
          NAVER_SEARCH_AD_ACCESS_LICENSE: "access-license",
          NAVER_SEARCH_AD_SECRET_KEY: "secret",
          NAVER_SEARCH_AD_CUSTOMER_ID: "customer-id",
          MARKETCREW_SEARCH_AD_STAT_DISCOVERY_ENABLED: "false",
        },
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              keywordList: [{ relKeyword: "추석 선물카드", monthlyPcQcCnt: "500", monthlyMobileQcCnt: "2,200" }],
            }),
            { status: 200 },
          ),
      }),
    );

    expect(report.status).toBe("SYNCED");
    expect(report.keywordDemandSnapshots).toHaveLength(1);
    expect(report.searchAdPerformanceSnapshots).toBeUndefined();
    expect(report.evidenceNotes.join(" ")).toContain("성과 조회 대상 ID가 없어");
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

  it("커머스 secret이 쉘 이스케이프된 bcrypt salt 형태여도 토큰 서명을 만든다", () => {
    const request = buildCommerceTokenRequest({
      env: {
        NAVER_COMMERCE_CLIENT_ID: "client-id",
        NAVER_COMMERCE_CLIENT_SECRET: "\\$2a\\$10\\$abcdefghijklmnopqrstuu",
      },
      timestamp: "1790000000000",
    });

    expect(request.body.get("client_secret_sign")).toBeTruthy();
    expect(request.body.get("client_secret_sign")).not.toContain("\\$2a");
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
                  {
                    productOrder: {
                      productName: "선물카드",
                      originalProductId: "origin-1",
                      totalPaymentAmount: 7000,
                    },
                  },
                  { productOrder: { productName: "감사카드", totalPaymentAmount: 5000 } },
                ],
              },
            });
          }

          if (requestUrl.endsWith("/external/v2/products/origin-products/origin-1")) {
            expect(init?.method).toBe("GET");
            expect(init?.headers).toEqual(expect.objectContaining({ Authorization: "Bearer commerce-access-token" }));

            return jsonResponse({
              originProduct: {
                images: {
                  representativeImage: {
                    url: "https://cdn.example.test/products/gift-card.jpg",
                  },
                },
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
      topProductImageUrl: "https://cdn.example.test/products/gift-card.jpg",
      dataScope: "aggregate_only",
    });
    expect(report.generatedSignal?.source).toBe("smartstore");
    expect(report.historyPolicy?.apiLimitLabel).toContain("24시간");
    expect(report.historyPolicy?.manualRefreshLabel).toContain("결재 직전");
    expect(report.evidenceNotes.join(" ")).toContain("원상품 조회로 상위 상품 대표 이미지");
    expect(JSON.stringify(report)).not.toContain("commerce-access-token");
  });

  it("커머스 대표 이미지 조회가 실패해도 주문 집계는 유지하고 화면 썸네일 대체 근거를 남긴다", async () => {
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
        },
        now: new Date("2026-05-22T03:00:00.000Z"),
        fetchImpl: async (url) => {
          const requestUrl = String(url);
          if (requestUrl.endsWith("/external/v1/oauth2/token")) {
            return jsonResponse({ access_token: "commerce-access-token" });
          }

          if (requestUrl.includes("/last-changed-statuses")) {
            return jsonResponse({ data: { lastChangeStatuses: [{ productOrderId: "po-1" }] } });
          }

          if (requestUrl.endsWith("/external/v1/pay-order/seller/product-orders/query")) {
            return jsonResponse({
              data: {
                productOrders: [
                  {
                    productOrder: {
                      productName: "선물카드",
                      originalProductId: "origin-missing",
                      totalPaymentAmount: 7000,
                    },
                  },
                ],
              },
            });
          }

          if (requestUrl.endsWith("/external/v2/products/origin-products/origin-missing")) {
            return jsonResponse({ code: "NOT_FOUND", message: "데이터 없음" }, 404);
          }

          throw new Error(`Unexpected request: ${requestUrl}`);
        },
      }),
    );

    expect(report.status).toBe("SYNCED");
    expect(report.commerceAggregateSnapshot).toMatchObject({
      paidOrderCount: 1,
      grossSales: 7000,
      topProductName: "선물카드",
    });
    expect(report.commerceAggregateSnapshot?.topProductImageUrl).toBeUndefined();
    expect(report.evidenceNotes.join(" ")).toContain("대표 이미지 조회는 실패했지만 주문 집계는 유지");
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
    expect(report.historyPolicy?.storageLabel).toContain("고객 식별정보");
    expect(JSON.stringify(report)).not.toContain("bridge-secret-token");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
