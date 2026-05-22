import { describe, expect, it } from "vitest";
import { buildDatalabReadinessReport } from "../../src/lib/integrations/datalab/readiness";
import { buildProviderReadinessReports } from "../../src/lib/integrations/providers/readiness";
import { buildSearchAdReadinessReport } from "../../src/lib/integrations/search-ad/readiness";

const NOW = "2026-05-22T12:00:00+09:00";

describe("provider readiness", () => {
  it("네이버 검색광고 인증값이 없으면 누락 env와 읽기 대기 상태를 반환한다", () => {
    const report = buildSearchAdReadinessReport({}, NOW);

    expect(report.provider).toBe("search_ad");
    expect(report.status).toBe("MISSING_CONFIG");
    expect(report.canRead).toBe(false);
    expect(report.canWrite).toBe(false);
    expect(report.missingEnvKeys).toEqual([
      "NAVER_SEARCH_AD_ACCESS_LICENSE",
      "NAVER_SEARCH_AD_SECRET_KEY",
      "NAVER_SEARCH_AD_CUSTOMER_ID",
    ]);
  });

  it("네이버 검색광고 인증값이 있어도 외부 반영 잠금이 닫혀 있으면 읽기 전용으로 유지한다", () => {
    const report = buildSearchAdReadinessReport(
      {
        NAVER_SEARCH_AD_ACCESS_LICENSE: "access-license",
        NAVER_SEARCH_AD_SECRET_KEY: "secret",
        NAVER_SEARCH_AD_CUSTOMER_ID: "123",
      },
      NOW,
    );

    expect(report.status).toBe("READ_ONLY_READY");
    expect(report.canRead).toBe(true);
    expect(report.canWrite).toBe(false);
    expect(report.requiredHeaders).toEqual(
      expect.arrayContaining(["X-Timestamp", "X-API-KEY", "X-Customer", "X-Signature"]),
    );
    expect(report.disabledReason).toContain("외부 반영 잠금");
  });

  it("네이버 검색광고 access license는 기존 API_KEY alias도 허용한다", () => {
    const report = buildSearchAdReadinessReport(
      {
        NAVER_SEARCH_AD_API_KEY: "legacy-api-key",
        NAVER_SEARCH_AD_SECRET_KEY: "secret",
        NAVER_SEARCH_AD_CUSTOMER_ID: "123",
      },
      NOW,
    );

    expect(report.status).toBe("READ_ONLY_READY");
    expect(report.missingEnvKeys).toEqual([]);
  });

  it("네이버 데이터랩은 읽기 준비가 되어도 ratio 상대값 주석을 유지한다", () => {
    const report = buildDatalabReadinessReport(
      {
        NAVER_DATALAB_CLIENT_ID: "client-id",
        NAVER_DATALAB_CLIENT_SECRET: "client-secret",
      },
      NOW,
    );

    expect(report.status).toBe("READ_ONLY_READY");
    expect(report.canRead).toBe(true);
    expect(report.canWrite).toBe(false);
    expect(report.evidenceNotes.join(" ")).toContain("상대 비율");
  });

  it("통합 준비 상태에는 AI 모델 대체와 아직 미설정된 커머스 채널도 함께 표시한다", () => {
    const reports = buildProviderReadinessReports({}, NOW);

    expect(reports.map((report) => report.provider)).toEqual(["search_ad", "datalab", "smartstore", "shop", "llm"]);
    expect(reports.find((report) => report.provider === "llm")?.disabledReason).toContain("규칙 기반 대체");
  });

  it("현재 .env 이름인 NAVER_COMMERCE와 YOUNGCART bridge를 readiness alias로 인정한다", () => {
    const reports = buildProviderReadinessReports(
      {
        NAVER_COMMERCE_CLIENT_ID: "commerce-client",
        NAVER_COMMERCE_CLIENT_SECRET: "commerce-secret",
        MARKETCREW_COMMERCE_READ_ONLY_CONFIRMED: "true",
        MARKETCREW_COMMERCE_SIGNATURE_DRIVER_READY: "true",
        MARKETCREW_COMMERCE_TOKEN_PROBE_APPROVED: "true",
        YOUNGCART_BRIDGE_URL: "https://example.test/bridge.php",
        YOUNGCART_BRIDGE_TOKEN: "bridge-token",
        MARKETCREW_YOUNGCART_BRIDGE_APPROVED: "true",
        MARKETCREW_YOUNGCART_PII_MINIMIZATION_CONFIRMED: "true",
        AI_LLM_PROVIDER: "gemini",
        GEMINI_API_KEY: "gemini-key",
      },
      NOW,
    );

    expect(reports.find((report) => report.provider === "smartstore")?.status).toBe("READ_ONLY_READY");
    expect(reports.find((report) => report.provider === "shop")?.status).toBe("READ_ONLY_READY");
    expect(reports.find((report) => report.provider === "llm")?.status).toBe("READ_ONLY_READY");
  });
});
