import { describe, expect, it } from "vitest";
import { buildEventComparisonWindow, buildEventWindow, buildEventYoYSignal } from "../../src/lib/domain";
import type { MarketingCalendarEvent } from "../../src/lib/domain";

const buddhaBirthday: MarketingCalendarEvent = {
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
  tags: ["gift-card", "seasonal-keyword"],
};

describe("MarketingCalendar", () => {
  it("부처님오신날 음력 이벤트가 연도별 양력 날짜와 D-n window를 가진다", () => {
    expect(buildEventWindow(buddhaBirthday, 2026)).toEqual({
      anchorDate: "2026-05-24",
      startDate: "2026-04-26",
      endDate: "2026-05-31",
    });
  });

  it("lunar_event_yoy는 같은 양력 날짜가 아니라 같은 음력 이벤트 윈도우를 비교한다", () => {
    const comparison = buildEventComparisonWindow(buddhaBirthday, 2026, 2025);

    expect(comparison.current).toEqual({
      anchorDate: "2026-05-24",
      startDate: "2026-04-26",
      endDate: "2026-05-31",
    });
    expect(comparison.baseline).toEqual({
      anchorDate: "2025-05-05",
      startDate: "2025-04-07",
      endDate: "2025-05-12",
    });
  });

  it("음력 이벤트 시그널은 lunar_event_yoy와 전년도 음력 상대 기간을 사용한다", () => {
    const signal = buildEventYoYSignal({
      id: "signal-buddha-gift-card-yoy",
      event: buddhaBirthday,
      currentYear: 2026,
      baselineYear: 2025,
      entityType: "keyword",
      entityId: "gift-card",
      title: "부처님오신날 선물카드 수요 증가",
      currentValue: 150,
      baselineValue: 100,
      evidenceRowIds: ["kw-001", "order-001"],
      createdAt: "2026-05-22T09:30:00+09:00",
    });

    expect(signal.signalType).toBe("lunar_event_yoy");
    expect(signal.periodStart).toBe("2026-04-26");
    expect(signal.periodEnd).toBe("2026-05-31");
    expect(signal.baselineStart).toBe("2025-04-07");
    expect(signal.baselineEnd).toBe("2025-05-12");
    expect(signal.deltaRate).toBe(0.5);
  });
});
