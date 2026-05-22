import type { KeywordDemandSnapshot, MarketingCalendarEvent } from "../../domain";

export type SampleMarketingInput = {
  generatedAt: string;
  currentYear: number;
  baselineYear: number;
  events: MarketingCalendarEvent[];
  keywordDemandSnapshots: KeywordDemandSnapshot[];
};

export class SampleProviderAdapter {
  collect(): SampleMarketingInput {
    return {
      generatedAt: "2026-05-22T09:30:00+09:00",
      currentYear: 2026,
      baselineYear: 2025,
      events: [
        {
          id: "buddha-birthday",
          name: "부처님오신날",
          eventType: "lunar",
          lunarMonth: 4,
          lunarDay: 8,
          yearlySolarDates: {
            2025: "2025-05-05",
            2026: "2026-05-24",
          },
          windowStartOffsetDays: -28,
          windowEndOffsetDays: 7,
          tags: ["gift-card", "seasonal-keyword", "lunar"],
        },
        {
          id: "teacher-day",
          name: "스승의날",
          eventType: "solar",
          solarMonth: 5,
          solarDay: 15,
          windowStartOffsetDays: -21,
          windowEndOffsetDays: 3,
          tags: ["gift-card", "bundle"],
        },
      ],
      keywordDemandSnapshots: [
        {
          id: "kw-demand-buddha-gift-card",
          keyword: "부처님오신날 선물카드",
          provider: "sample",
          monthlyPcSearches: 420,
          monthlyMobileSearches: 1800,
          competitionIndex: "MEDIUM",
          cachedUntil: "2026-05-23T00:00:00+09:00",
          collectedAt: "2026-05-22T08:00:00+09:00",
          rateLimitState: "OK",
        },
        {
          id: "kw-demand-temple-gift",
          keyword: "사찰 행사 선물",
          provider: "sample",
          monthlyPcSearches: 230,
          monthlyMobileSearches: 920,
          competitionIndex: "LOW",
          cachedUntil: "2026-05-23T00:00:00+09:00",
          collectedAt: "2026-05-22T08:10:00+09:00",
          rateLimitState: "OK",
        },
        {
          id: "kw-demand-free-image",
          keyword: "부처님오신날 무료 이미지",
          provider: "sample",
          monthlyPcSearches: 110,
          monthlyMobileSearches: 80,
          competitionIndex: "HIGH",
          cachedUntil: "2026-05-23T00:00:00+09:00",
          collectedAt: "2026-05-22T08:15:00+09:00",
          rateLimitState: "OK",
        },
        {
          id: "kw-demand-teacher-bundle",
          keyword: "스승의날 단체 선물카드",
          provider: "sample",
          monthlyPcSearches: 90,
          monthlyMobileSearches: 120,
          competitionIndex: "HIGH",
          cachedUntil: "2026-05-20T00:00:00+09:00",
          collectedAt: "2026-05-19T08:00:00+09:00",
          rateLimitState: "STALE",
        },
      ],
    };
  }
}
