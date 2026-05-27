import { ALL_SEARCH_AD_REPORT_TYPES } from "./reportRetention";

export type SearchAdReportScheduleRunKind = "primary" | "retry";

export type SearchAdReportScheduleRun = {
  hour: number;
  kind: SearchAdReportScheduleRunKind;
  minute: number;
  purpose: string;
  timeLabel: string;
};

export type SearchAdReportScheduleStatus = {
  nextRunAt: string;
  nextRunLabel: string;
  nextRunPurpose: string;
  primaryRunLabel: string;
  reportTypeCount: number;
  retryRunLabel: string;
  targetStatDate: string;
  timezone: "Asia/Seoul";
};

export const SEARCH_AD_REPORT_SCHEDULE_RUNS: SearchAdReportScheduleRun[] = [
  {
    hour: 7,
    kind: "primary",
    minute: 0,
    purpose: "전일 보고서 1차 자동 저장",
    timeLabel: "매일 오전 7시",
  },
  {
    hour: 8,
    kind: "retry",
    minute: 0,
    purpose: "미완료 보고서 재확인",
    timeLabel: "매일 오전 8시",
  },
];

export function getSearchAdReportScheduleStatus(now = new Date()): SearchAdReportScheduleStatus {
  const nextRun = getNextSearchAdReportScheduleRun(now);
  const primaryRun = SEARCH_AD_REPORT_SCHEDULE_RUNS.find((run) => run.kind === "primary") ?? SEARCH_AD_REPORT_SCHEDULE_RUNS[0];
  const retryRun = SEARCH_AD_REPORT_SCHEDULE_RUNS.find((run) => run.kind === "retry") ?? SEARCH_AD_REPORT_SCHEDULE_RUNS[SEARCH_AD_REPORT_SCHEDULE_RUNS.length - 1];

  return {
    nextRunAt: nextRun.runAt.toISOString(),
    nextRunLabel: formatKstDateTimeLabel(nextRun.runAt),
    nextRunPurpose: nextRun.run.purpose,
    primaryRunLabel: primaryRun.timeLabel,
    reportTypeCount: ALL_SEARCH_AD_REPORT_TYPES.length,
    retryRunLabel: retryRun.timeLabel,
    targetStatDate: getPreviousSearchAdReportStatDate(nextRun.runAt),
    timezone: "Asia/Seoul",
  };
}

export function getNextSearchAdReportScheduleRun(now = new Date()) {
  const todayKst = getKstDateParts(now);
  const todayCandidates = SEARCH_AD_REPORT_SCHEDULE_RUNS.map((run) => ({
    run,
    runAt: kstDateTimeToUtcDate(todayKst.year, todayKst.month, todayKst.day, run.hour, run.minute),
  })).filter((candidate) => candidate.runAt.getTime() > now.getTime());

  if (todayCandidates.length > 0) {
    return todayCandidates[0];
  }

  const tomorrowKst = addKstDays(todayKst, 1);
  const firstRun = SEARCH_AD_REPORT_SCHEDULE_RUNS[0];
  return {
    run: firstRun,
    runAt: kstDateTimeToUtcDate(tomorrowKst.year, tomorrowKst.month, tomorrowKst.day, firstRun.hour, firstRun.minute),
  };
}

export function getPreviousSearchAdReportStatDate(now = new Date()) {
  const today = getKstDateParts(now);
  const yesterday = addKstDays(today, -1);
  return formatKstDate(yesterday);
}

function getKstDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).formatToParts(date);

  return {
    day: Number(parts.find((part) => part.type === "day")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    year: Number(parts.find((part) => part.type === "year")?.value),
  };
}

function addKstDays(date: { day: number; month: number; year: number }, days: number) {
  const utcDate = Date.UTC(date.year, date.month - 1, date.day + days);
  const next = new Date(utcDate);
  return {
    day: next.getUTCDate(),
    month: next.getUTCMonth() + 1,
    year: next.getUTCFullYear(),
  };
}

function kstDateTimeToUtcDate(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
}

function formatKstDate(date: { day: number; month: number; year: number }) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function formatKstDateTimeLabel(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(date);
}
