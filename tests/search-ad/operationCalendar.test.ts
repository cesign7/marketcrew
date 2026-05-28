import { describe, expect, it } from "vitest";
import { buildSearchAdOperationCalendarPreview, type SearchAdHoliday } from "@/features/search-ad/domain/operationCalendar";
import type { SearchAdStateRecord } from "@/features/search-ad/domain/types";

describe("search ad operation calendar", () => {
  it("커피프린트는 일요일에 켜져 있는 광고그룹을 끄기 후보로 만든다", () => {
    const preview = buildSearchAdOperationCalendarPreview({
      date: "2026-05-31",
      adgroups: [adgroup({ brandKey: "coffeeprint", providerId: "grp-coffee", name: "30_초대장", userLock: false })],
    });

    expect(preview.isSunday).toBe(true);
    expect(preview.decisions[0]).toMatchObject({
      requestedAction: "turn_off",
      shouldCreatePreview: true,
      targetId: "grp-coffee",
    });
  });

  it("커피프린트는 법정공휴일과 대체공휴일에 끄기 후보를 만든다", () => {
    const holidays: SearchAdHoliday[] = [{ date: "2026-05-25", isHoliday: true, name: "대체공휴일", source: "official" }];
    const preview = buildSearchAdOperationCalendarPreview({
      date: "2026-05-25",
      adgroups: [adgroup({ brandKey: "coffeeprint", providerId: "grp-coffee", name: "컵/홀더", userLock: false })],
      holidays,
    });

    expect(preview.holidays).toHaveLength(1);
    expect(preview.decisions[0]?.requestedAction).toBe("turn_off");
    expect(preview.decisions[0]?.reason).toContain("대체공휴일");
  });

  it("커피프린트 광고그룹이 이미 꺼져 있으면 미리보기를 만들지 않는다", () => {
    const preview = buildSearchAdOperationCalendarPreview({
      date: "2026-05-31",
      adgroups: [adgroup({ brandKey: "coffeeprint", providerId: "grp-off", name: "이미 꺼진 그룹", userLock: true })],
    });

    expect(preview.decisions[0]).toMatchObject({
      requestedAction: "keep",
      shouldCreatePreview: false,
      actionLabel: "이미 꺼짐",
    });
  });

  it("스티커씨는 일요일과 공휴일에도 자동 OFF 후보를 만들지 않는다", () => {
    const preview = buildSearchAdOperationCalendarPreview({
      date: "2026-05-31",
      adgroups: [adgroup({ brandKey: "stickersee", providerId: "grp-sticker", name: "시즈널스티커", userLock: false })],
      holidays: [{ date: "2026-05-31", isHoliday: true, name: "수동 휴일", source: "manual" }],
    });

    expect(preview.decisions[0]).toMatchObject({
      requestedAction: "keep",
      shouldCreatePreview: false,
      source: "performance_policy",
    });
  });

  it("이전 자동 OFF 이력이 있는 커피프린트 광고그룹만 평상 운영일 켜기 후보로 만든다", () => {
    const preview = buildSearchAdOperationCalendarPreview({
      date: "2026-06-01",
      adgroups: [
        adgroup({ brandKey: "coffeeprint", providerId: "grp-auto-off", name: "자동으로 끈 그룹", userLock: true }),
        adgroup({ brandKey: "coffeeprint", providerId: "grp-manual-off", name: "수동으로 끈 그룹", userLock: true }),
      ],
      autoLockedTargetIds: ["grp-auto-off"],
    });

    expect(preview.decisions.find((decision) => decision.targetId === "grp-auto-off")?.requestedAction).toBe("turn_on");
    expect(preview.decisions.find((decision) => decision.targetId === "grp-manual-off")?.requestedAction).toBe("keep");
  });
});

function adgroup(overrides: Partial<SearchAdStateRecord>): SearchAdStateRecord {
  return {
    adProductType: "powerlink",
    brandKey: "coffeeprint",
    collectedAt: "2026-05-28T08:00:00+09:00",
    id: "adgroup",
    name: "광고그룹",
    providerId: "grp",
    targetType: "adgroup",
    userLock: false,
    ...overrides,
  };
}
