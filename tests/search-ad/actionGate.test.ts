import { afterEach, describe, expect, it, vi } from "vitest";
import { applySearchAdActionPreview, createSearchAdActionPreview } from "@/lib/persistence/searchAdRepository";

describe("search ad action gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("샘플 미리보기는 실제 변경 차단 상태로 생성된다", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("MARKETCREW_DATABASE_URL", "");
    vi.stubEnv("SEARCH_AD_WRITE_ENABLED", "");
    vi.stubEnv("NAVER_SEARCH_AD_WRITE_ENABLED", "");

    const preview = await createSearchAdActionPreview({
      targetType: "adgroup",
      targetId: "grp-stickersee-thanks",
      requestedAction: "turn_off",
    });

    expect(preview?.writeGateOpen).toBe(false);
    expect(preview?.afterState.userLock).toBe(true);
  });

  it("write gate가 닫혀 있으면 apply 결과가 blocked로 남는다", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("MARKETCREW_DATABASE_URL", "");
    vi.stubEnv("SEARCH_AD_WRITE_ENABLED", "");
    vi.stubEnv("NAVER_SEARCH_AD_WRITE_ENABLED", "");

    const log = await applySearchAdActionPreview("preview-adgroup-stickersee-thanks-turn-off");

    expect(log.status).toBe("blocked");
    expect(log.reason).toContain("실제 변경 권한");
  });
});
