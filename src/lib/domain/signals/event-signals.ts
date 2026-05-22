import { buildEventComparisonWindow } from "../calendar/marketing-calendar";
import type { MarketingCalendarEvent, Signal } from "../types";

export type BuildEventYoYSignalInput = {
  id: string;
  event: MarketingCalendarEvent;
  currentYear: number;
  baselineYear: number;
  entityType: Signal["entityType"];
  entityId: string;
  title: string;
  currentValue: number;
  baselineValue: number;
  evidenceRowIds: string[];
  createdAt: string;
};

export function buildEventYoYSignal(input: BuildEventYoYSignalInput): Signal {
  const comparison = buildEventComparisonWindow(input.event, input.currentYear, input.baselineYear);

  return {
    id: input.id,
    source: "calendar",
    signalType: input.event.eventType === "lunar" ? "lunar_event_yoy" : "seasonal_yoy",
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    currentValue: input.currentValue,
    baselineValue: input.baselineValue,
    deltaRate: calculateDeltaRate(input.currentValue, input.baselineValue),
    periodStart: comparison.current.startDate,
    periodEnd: comparison.current.endDate,
    baselineStart: comparison.baseline.startDate,
    baselineEnd: comparison.baseline.endDate,
    evidenceRowIds: input.evidenceRowIds,
    createdAt: input.createdAt,
  };
}

function calculateDeltaRate(currentValue: number, baselineValue: number): number | undefined {
  if (baselineValue === 0) {
    return undefined;
  }

  return (currentValue - baselineValue) / baselineValue;
}
