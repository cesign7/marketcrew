import { describe, expect, it } from "vitest";
import { collectKeywordsSequentially } from "./rate-limit";
import type { SearchAdAdgroup, SearchAdKeyword } from "./normalize";

describe("Naver Search Ad rate limiting", () => {
  it("fetches adgroup keywords sequentially to avoid Naver request bursts", async () => {
    const events: string[] = [];
    const adgroups: SearchAdAdgroup[] = [
      { id: "grp-1", campaignId: "cmp-1", name: "A", raw: {} },
      { id: "grp-2", campaignId: "cmp-1", name: "B", raw: {} },
    ];
    const keywordsByAdgroup = new Map<string, SearchAdKeyword[]>([
      [
        "grp-1",
        [
          {
            id: "kw-1",
            adgroupId: "grp-1",
            campaignId: "cmp-1",
            keyword: "기업 초대장",
            bidAmount: 700,
            raw: {},
          },
        ],
      ],
      [
        "grp-2",
        [
          {
            id: "kw-2",
            adgroupId: "grp-2",
            campaignId: "cmp-1",
            keyword: "스티커씨",
            bidAmount: 300,
            raw: {},
          },
        ],
      ],
    ]);

    const keywords = await collectKeywordsSequentially({
      adgroups,
      adgroupCampaignMap: new Map([["grp-1", "cmp-1"], ["grp-2", "cmp-1"]]),
      delayMs: 10,
      fetchKeywords: async (adgroupId) => {
        events.push(`fetch:${adgroupId}`);
        return keywordsByAdgroup.get(adgroupId) ?? [];
      },
      wait: async (delayMs) => {
        events.push(`wait:${delayMs}`);
      },
    });

    expect(events).toEqual(["fetch:grp-1", "wait:10", "fetch:grp-2"]);
    expect(keywords.map((keyword) => keyword.id)).toEqual(["kw-1", "kw-2"]);
  });
});
