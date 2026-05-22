import type { DateWindow, EventComparisonWindow, MarketingCalendarEvent } from "../types";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getEventAnchorDate(event: MarketingCalendarEvent, year: number): string {
  const mappedDate = event.yearlySolarDates?.[year];
  if (mappedDate) {
    return assertIsoDate(mappedDate, `${event.name} ${year} mapped date`);
  }

  if (event.eventType === "solar" && event.solarMonth && event.solarDay) {
    return formatDateParts(year, event.solarMonth, event.solarDay);
  }

  if (event.yearlySolarDate?.startsWith(`${year}-`)) {
    return assertIsoDate(event.yearlySolarDate, `${event.name} yearlySolarDate`);
  }

  throw new Error(`${event.name} ${year}년 양력 환산일이 없습니다.`);
}

export function buildEventWindow(event: MarketingCalendarEvent, year: number): DateWindow {
  const anchorDate = getEventAnchorDate(event, year);

  return {
    anchorDate,
    startDate: addDays(anchorDate, event.windowStartOffsetDays),
    endDate: addDays(anchorDate, event.windowEndOffsetDays),
  };
}

export function buildEventComparisonWindow(
  event: MarketingCalendarEvent,
  currentYear: number,
  baselineYear: number,
): EventComparisonWindow {
  return {
    eventId: event.id,
    eventName: event.name,
    eventType: event.eventType,
    currentYear,
    baselineYear,
    current: buildEventWindow(event, currentYear),
    baseline: buildEventWindow(event, baselineYear),
  };
}

export function isLunarEvent(event: MarketingCalendarEvent): boolean {
  return event.eventType === "lunar";
}

function assertIsoDate(value: string, label: string): string {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new Error(`${label}은 YYYY-MM-DD 형식이어야 합니다.`);
  }

  return value;
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(dateText: string, days: number): string {
  assertIsoDate(dateText, "dateText");
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}
