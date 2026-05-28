import type { AdProductType, BrandKey, SearchAdRequestedAction, SearchAdStateRecord } from "./types";

export type SearchAdOperationCalendarMode = "always_on" | "fixed_hours";

export type SearchAdOperationCalendarPolicy = {
  brandKey: BrandKey;
  label: string;
  mode: SearchAdOperationCalendarMode;
  summary: string;
  sundayPolicy: "on" | "off";
  publicHolidayPolicy: "on" | "off";
  defaultAction: "keep_on" | "performance_narrowing";
};

export type SearchAdHoliday = {
  date: string;
  name: string;
  source: "official" | "manual";
  isHoliday: boolean;
};

export type SearchAdOperationCalendarDecision = {
  targetType: "adgroup";
  targetId: string;
  targetLabel: string;
  brandKey?: BrandKey;
  adProductType?: AdProductType;
  requestedAction: SearchAdRequestedAction | "keep";
  actionLabel: string;
  reason: string;
  shouldCreatePreview: boolean;
  currentUserLock: boolean | null;
  policyLabel: string;
  source: "calendar" | "performance_policy" | "state_check";
};

export type SearchAdOperationCalendarPreview = {
  date: string;
  dayLabel: string;
  isSunday: boolean;
  holidays: SearchAdHoliday[];
  automationEnabled: boolean;
  writeEnabled: boolean;
  policies: SearchAdOperationCalendarPolicy[];
  decisions: SearchAdOperationCalendarDecision[];
  summaryCards: Array<{
    key: string;
    label: string;
    value: string;
    helper: string;
  }>;
};

export const DEFAULT_SEARCH_AD_OPERATION_CALENDAR_POLICIES: SearchAdOperationCalendarPolicy[] = [
  {
    brandKey: "coffeeprint",
    label: "커피프린트",
    mode: "fixed_hours",
    summary: "평일과 토요일은 운영시간 기준으로 열고, 일요일·법정공휴일·대체공휴일은 광고를 끕니다.",
    sundayPolicy: "off",
    publicHolidayPolicy: "off",
    defaultAction: "keep_on",
  },
  {
    brandKey: "stickersee",
    label: "스티커씨",
    mode: "always_on",
    summary: "365일 24시간 운영을 기본으로 두고, 충분한 성과 데이터가 쌓인 뒤 시간대 축소 후보만 따로 판단합니다.",
    sundayPolicy: "on",
    publicHolidayPolicy: "on",
    defaultAction: "performance_narrowing",
  },
];

type BuildOperationCalendarPreviewInput = {
  date?: string;
  adgroups: SearchAdStateRecord[];
  holidays?: SearchAdHoliday[];
  policies?: SearchAdOperationCalendarPolicy[];
  automationEnabled?: boolean;
  writeEnabled?: boolean;
  autoLockedTargetIds?: string[];
};

export function buildSearchAdOperationCalendarPreview(input: BuildOperationCalendarPreviewInput): SearchAdOperationCalendarPreview {
  const date = normalizeCalendarDate(input.date);
  const holidays = (input.holidays ?? []).filter((holiday) => holiday.date === date && holiday.isHoliday);
  const policies = input.policies ?? DEFAULT_SEARCH_AD_OPERATION_CALENDAR_POLICIES;
  const policyByBrand = new Map(policies.map((policy) => [policy.brandKey, policy]));
  const isSunday = getKoreanDayIndex(date) === 0;
  const autoLockedTargetIds = new Set(input.autoLockedTargetIds ?? []);

  const decisions = input.adgroups
    .slice()
    .sort(compareAdgroupForCalendar)
    .map((adgroup) =>
      buildAdgroupDecision({
        adgroup,
        autoLockedTargetIds,
        holidays,
        isSunday,
        policy: adgroup.brandKey ? policyByBrand.get(adgroup.brandKey) : undefined,
      }),
    );

  const turnOffCount = decisions.filter((decision) => decision.requestedAction === "turn_off").length;
  const turnOnCount = decisions.filter((decision) => decision.requestedAction === "turn_on").length;
  const keepCount = decisions.filter((decision) => decision.requestedAction === "keep").length;
  const previewCount = decisions.filter((decision) => decision.shouldCreatePreview).length;

  return {
    date,
    dayLabel: getKoreanDayLabel(date),
    isSunday,
    holidays,
    automationEnabled: input.automationEnabled ?? false,
    writeEnabled: input.writeEnabled ?? false,
    policies,
    decisions,
    summaryCards: [
      {
        key: "date",
        label: "점검일",
        value: `${date} ${getKoreanDayLabel(date)}`,
        helper: holidays.length > 0 ? holidays.map((holiday) => holiday.name).join(", ") : isSunday ? "일요일" : "평상 운영일",
      },
      {
        key: "off",
        label: "꺼야 할 광고그룹",
        value: `${turnOffCount.toLocaleString("ko-KR")}개`,
        helper: "커피프린트 일요일·공휴일 정책에 걸린 대상",
      },
      {
        key: "on",
        label: "다시 켤 후보",
        value: `${turnOnCount.toLocaleString("ko-KR")}개`,
        helper: "이전 자동 OFF 이력이 확인된 대상만 켭니다.",
      },
      {
        key: "keep",
        label: "유지",
        value: `${keepCount.toLocaleString("ko-KR")}개`,
        helper: `${previewCount.toLocaleString("ko-KR")}개만 미리보기 생성 대상입니다.`,
      },
    ],
  };
}

function buildAdgroupDecision({
  adgroup,
  autoLockedTargetIds,
  holidays,
  isSunday,
  policy,
}: {
  adgroup: SearchAdStateRecord;
  autoLockedTargetIds: Set<string>;
  holidays: SearchAdHoliday[];
  isSunday: boolean;
  policy?: SearchAdOperationCalendarPolicy;
}): SearchAdOperationCalendarDecision {
  const policyLabel = policy?.label ?? "정책 미지정";
  const holidayReason = holidays.length > 0 ? holidays.map((holiday) => holiday.name).join(", ") : "";
  const shouldBeOffByCalendar = Boolean(policy && ((policy.sundayPolicy === "off" && isSunday) || (policy.publicHolidayPolicy === "off" && holidays.length > 0)));
  const targetBase = {
    targetType: "adgroup" as const,
    targetId: adgroup.providerId,
    targetLabel: adgroup.name,
    brandKey: adgroup.brandKey,
    adProductType: adgroup.adProductType,
    currentUserLock: adgroup.userLock,
    policyLabel,
  };

  if (!policy) {
    return {
      ...targetBase,
      requestedAction: "keep",
      actionLabel: "유지",
      reason: "브랜드 운영 정책이 아직 없어 자동 판단에서 제외합니다.",
      shouldCreatePreview: false,
      source: "state_check",
    };
  }

  if (shouldBeOffByCalendar) {
    if (adgroup.userLock === true) {
      return {
        ...targetBase,
        requestedAction: "keep",
        actionLabel: "이미 꺼짐",
        reason: `${policy.label}은 ${holidayReason || "일요일"}에는 광고를 끄는 기준이며, 이 광고그룹은 이미 꺼져 있습니다.`,
        shouldCreatePreview: false,
        source: "calendar",
      };
    }

    return {
      ...targetBase,
      requestedAction: "turn_off",
      actionLabel: "끄기 미리보기",
      reason: `${policy.label}은 ${holidayReason || "일요일"}에는 광고를 끄는 기준입니다.`,
      shouldCreatePreview: true,
      source: "calendar",
    };
  }

  if (autoLockedTargetIds.has(adgroup.providerId) && adgroup.userLock === true) {
    return {
      ...targetBase,
      requestedAction: "turn_on",
      actionLabel: "켜기 미리보기",
      reason: "이전 자동 OFF 이력이 있는 광고그룹이라 평상 운영일에 다시 켜는 후보입니다.",
      shouldCreatePreview: true,
      source: "calendar",
    };
  }

  if (policy.defaultAction === "performance_narrowing") {
    return {
      ...targetBase,
      requestedAction: "keep",
      actionLabel: "성과 판단 대기",
      reason: `${policy.label}은 365일 24시간 운영을 기본으로 두고, 충분한 성과 데이터가 쌓인 뒤 시간대 축소 후보만 만듭니다.`,
      shouldCreatePreview: false,
      source: "performance_policy",
    };
  }

  return {
    ...targetBase,
    requestedAction: "keep",
    actionLabel: "유지",
    reason: `${policy.label}은 오늘 자동 OFF 기준에 해당하지 않습니다. 수동으로 꺼져 있는 광고그룹은 자동으로 켜지 않습니다.`,
    shouldCreatePreview: false,
    source: "calendar",
  };
}

export function normalizeCalendarDate(date?: string) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date());
}

function getKoreanDayIndex(date: string) {
  return new Date(`${date}T00:00:00+09:00`).getDay();
}

function getKoreanDayLabel(date: string) {
  return ["일", "월", "화", "수", "목", "금", "토"][getKoreanDayIndex(date)] ?? "";
}

function compareAdgroupForCalendar(left: SearchAdStateRecord, right: SearchAdStateRecord) {
  return [left.brandKey ?? "", left.adProductType ?? "", left.name, left.providerId].join("\u0000").localeCompare([right.brandKey ?? "", right.adProductType ?? "", right.name, right.providerId].join("\u0000"), "ko-KR");
}
