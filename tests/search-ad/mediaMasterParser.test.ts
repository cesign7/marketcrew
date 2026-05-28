import { describe, expect, it } from "vitest";
import { parseSearchAdMediaMaster } from "@/features/search-ad/domain/parseSearchAdMediaMaster";

describe("parseSearchAdMediaMaster", () => {
  it("네이버 Media 마스터 원문을 매체명 조회용 행으로 변환한다", () => {
    const parsed = parseSearchAdMediaMaster(
      [
        "media\t8753\t네이버 모바일 통합검색\thttps://m.search.naver.com\ttrue\ttrue\tfalse\ttrue\ttrue\tfalse\t100\t2024-01-01T00:00:00Z\t-",
        "media\t11068\t네이버 PC 통합검색\thttps://search.naver.com\ttrue\ttrue\ttrue\tfalse\ttrue\tfalse\t100\t2024-01-01T00:00:00Z\t-",
      ].join("\n"),
    );

    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      mediaId: "8753",
      mediaName: "네이버 모바일 통합검색",
      mobileMedia: true,
      pcMedia: false,
      searchAdNetwork: true,
    });
    expect(parsed.rows[1]?.mediaUrl).toBe("https://search.naver.com");
  });

  it("매체명 표시가 불가능한 빈 이름 행은 저장 대상에서 제외한다", () => {
    const parsed = parseSearchAdMediaMaster(["media\t8753\t네이버 모바일 통합검색", "media\t9999\t"].join("\n"));

    expect(parsed.rows.map((row) => row.mediaId)).toEqual(["8753"]);
  });
});
