import { describe, expect, it } from "vitest";
import {
  chunkIds,
  getDefaultPerformanceDateRange,
  selectLatestKeywordMeta,
} from "./performance";

describe("Naver Search Ad performance sync helpers", () => {
  it("builds the default recent 90 day range ending yesterday in Korea", () => {
    expect(
      getDefaultPerformanceDateRange(new Date("2026-05-20T04:00:00.000Z")),
    ).toEqual({
      since: "2026-02-19",
      until: "2026-05-19",
      performanceDate: new Date("2026-05-19T00:00:00.000+09:00"),
    });
  });

  it("selects the latest snapshot metadata once per keyword", () => {
    const metas = selectLatestKeywordMeta(
      [
        keywordSnapshot("kw-1", "old keyword", "2026-05-18T00:00:00.000Z"),
        keywordSnapshot("kw-2", "second keyword", "2026-05-18T01:00:00.000Z"),
        keywordSnapshot("kw-1", "new keyword", "2026-05-19T00:00:00.000Z"),
      ],
      10,
    );

    expect([...metas.entries()]).toEqual([
      [
        "kw-1",
        {
          campaignId: "cmp-kw-1",
          adgroupId: "grp-kw-1",
          keywordId: "kw-1",
          keyword: "new keyword",
        },
      ],
      [
        "kw-2",
        {
          campaignId: "cmp-kw-2",
          adgroupId: "grp-kw-2",
          keywordId: "kw-2",
          keyword: "second keyword",
        },
      ],
    ]);
  });

  it("chunks ids to keep stats requests bounded", () => {
    expect(chunkIds(["kw-1", "kw-2", "kw-3", "kw-4", "kw-5"], 2)).toEqual([
      ["kw-1", "kw-2"],
      ["kw-3", "kw-4"],
      ["kw-5"],
    ]);
  });
});

function keywordSnapshot(keywordId: string, keyword: string, createdAt: string) {
  return {
    campaignId: `cmp-${keywordId}`,
    adgroupId: `grp-${keywordId}`,
    keywordId,
    keyword,
    createdAt: new Date(createdAt),
  };
}
