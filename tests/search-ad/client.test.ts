import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveSearchAdTimeoutMs, searchAdDownload, searchAdFetch } from "@/lib/integrations/search-ad/client";

const credentials = {
  accessLicense: "access-license",
  customerId: "123456",
  secretKey: "secret-key",
};

describe("search ad client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("환경변수 기반 요청 타임아웃을 안전 범위로 정리한다", () => {
    expect(resolveSearchAdTimeoutMs(buildEnv("3000"))).toBe(5_000);
    expect(resolveSearchAdTimeoutMs(buildEnv("900000"))).toBe(300_000);
    expect(resolveSearchAdTimeoutMs(buildEnv("15000"))).toBe(15_000);
  });

  it("검색광고 API 응답이 멈추면 요청을 중단한다", async () => {
    vi.useFakeTimers();
    vi.stubEnv("MARKETCREW_SEARCH_AD_TIMEOUT_MS", "5000");
    vi.stubGlobal("fetch", vi.fn((_url: URL, init?: RequestInit) => createHangingFetch(init)));

    const request = expect(searchAdFetch("/stat-reports", {}, credentials)).rejects.toThrow("네이버 검색광고 API 응답 시간이 5초를 넘었습니다.");
    await vi.advanceTimersByTimeAsync(5_000);

    await request;
  });

  it("보고서 다운로드 응답이 멈추면 요청을 중단한다", async () => {
    vi.useFakeTimers();
    vi.stubEnv("MARKETCREW_SEARCH_AD_TIMEOUT_MS", "5000");
    vi.stubGlobal("fetch", vi.fn((_url: URL, init?: RequestInit) => createHangingFetch(init)));

    const request = expect(searchAdDownload("/report-download?authtoken=test", credentials)).rejects.toThrow("네이버 검색광고 API 응답 시간이 5초를 넘었습니다.");
    await vi.advanceTimersByTimeAsync(5_000);

    await request;
  });
});

function buildEnv(timeoutMs: string): NodeJS.ProcessEnv {
  return { ...process.env, MARKETCREW_SEARCH_AD_TIMEOUT_MS: timeoutMs };
}

function createHangingFetch(init?: RequestInit) {
  return new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
  });
}
