import type { BrandKey } from "./types";

type TargetSettingDescription = {
  targetTypeLabel: string;
  settingLabel: string;
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  TIME_WEEKLY_TARGET: "요일/시간",
  PC_MOBILE_TARGET: "기기",
  MEDIA_TARGET: "노출 매체",
  GENDER_TARGET: "성별",
  AGE_TARGET: "연령",
  PERIOD_TARGET: "기간",
  RESTRICT_KEYWORD_TARGET: "제외어",
  NON_SEARCH_KEYWORD_TARGET: "비검색어",
  GENDER_WEIGHT_TARGET: "성별 가중치",
  AD_TAG: "광고 태그",
  PLACE_ADGROUP_TAG: "플레이스 태그",
};

const DAY_LABELS: Record<string, string> = {
  MON: "월요일",
  TUE: "화요일",
  WED: "수요일",
  THU: "목요일",
  FRI: "금요일",
  SAT: "토요일",
  SUN: "일요일",
};

export const BRAND_OPERATION_GUIDE_ITEMS: Array<{
  brandKey: BrandKey;
  title: string;
  value: string;
  description: string;
}> = [
  {
    brandKey: "coffeeprint",
    title: "커피프린트",
    value: "기본값 + 시즌 예외",
    description: "기본 운영시간은 참고 기준으로 두고, 시즌 광고그룹과 키워드는 현재 네이버 API 설정을 우선합니다. 바뀐 설정은 보고서 성과와 함께 다시 판단합니다.",
  },
  {
    brandKey: "stickersee",
    title: "스티커씨",
    value: "그룹별 현재 설정",
    description: "광고그룹 타게팅 API의 요일/시간 설정을 현재 기준으로 보고, 시즌 그룹은 고정 운영시간 위반이 아니라 별도 예외 운영으로 분리합니다.",
  },
];

export const API_AND_REPORT_CHECK_GUIDE_ITEMS = [
  {
    title: "API 설정값",
    value: "현재 원장",
    description: "광고그룹의 요일/시간, PC/모바일, 매체 설정처럼 지금 네이버에 설정된 값을 확인합니다.",
  },
  {
    title: "보고서 성과값",
    value: "실제 결과",
    description: "타게팅 성과 보고서에서 실제 노출, 클릭, 비용, 전환이 어느 요일/시간/기기에서 발생했는지 확인합니다.",
  },
  {
    title: "불일치 판단",
    value: "분리 표시",
    description: "API 설정과 보고서 결과가 다르면 설정 기준과 실제 성과 기준을 나눠 카드에 표시합니다.",
  },
  {
    title: "시즌 예외",
    value: "고정 아님",
    description: "시즌 광고그룹과 키워드는 운영시간이 바뀔 수 있으므로 현재 API 설정과 변경 이력을 기준으로 판단합니다.",
  },
];

export function describeTargetSetting(targetType: string, target: Record<string, unknown> | undefined): TargetSettingDescription {
  const targetTypeLabel = TARGET_TYPE_LABELS[targetType] ?? targetType;
  if (targetType === "PC_MOBILE_TARGET") {
    return {
      targetTypeLabel,
      settingLabel: describeDeviceTarget(target),
    };
  }

  if (targetType === "TIME_WEEKLY_TARGET") {
    return {
      targetTypeLabel,
      settingLabel: describeWeeklyTarget(target),
    };
  }

  if (targetType === "MEDIA_TARGET") {
    return {
      targetTypeLabel,
      settingLabel: describeMediaTarget(target),
    };
  }

  if (targetType === "RESTRICT_KEYWORD_TARGET" || targetType === "NON_SEARCH_KEYWORD_TARGET") {
    return {
      targetTypeLabel,
      settingLabel: describeKeywordTarget(target),
    };
  }

  return {
    targetTypeLabel,
    settingLabel: target ? "설정값 원문 저장" : "설정값 없음",
  };
}

export function describeCriterionScheduleCode(code: string | undefined) {
  const slot = parseCriterionScheduleCode(code);
  if (!slot) {
    return undefined;
  }

  return `${slot.dayLabel} ${slot.startHour}:00~${slot.endHour}:00`;
}

export function parseCriterionScheduleCode(code: string | undefined) {
  const match = code?.toUpperCase().match(/^SD([A-Z]{3})(\d{2})(\d{2})$/);
  if (!match) {
    return undefined;
  }

  const dayLabel = DAY_LABELS[match[1]];
  if (!dayLabel) {
    return undefined;
  }

  return {
    dayCode: match[1],
    dayLabel,
    startHour: Number(match[2]),
    endHour: Number(match[3]),
  };
}

function describeDeviceTarget(target: Record<string, unknown> | undefined) {
  const pc = target?.pc === true;
  const mobile = target?.mobile === true;
  if (pc && mobile) {
    return "PC와 모바일 모두 노출";
  }
  if (pc) {
    return "PC만 노출";
  }
  if (mobile) {
    return "모바일만 노출";
  }
  return "기기 설정 없음";
}

function describeWeeklyTarget(target: Record<string, unknown> | undefined) {
  if (!target) {
    return "요일/시간 설정 없음";
  }

  const text = flattenTextValues(target).join(" ");
  const matches = [...text.matchAll(/\b(MON|TUE|WED|THU|FRI|SAT|SUN)[^\d]*(\d{1,2})[^\d]+(\d{1,2})\b/gi)];
  const slots = matches
    .map((match) => {
      const dayLabel = DAY_LABELS[match[1].toUpperCase()];
      return dayLabel ? `${dayLabel} ${Number(match[2])}:00~${Number(match[3])}:00` : undefined;
    })
    .filter(Boolean);

  if (slots.length > 0) {
    return slots.slice(0, 8).join(", ");
  }

  return "요일/시간 설정값 원문 저장";
}

function describeMediaTarget(target: Record<string, unknown> | undefined) {
  const search = Array.isArray(target?.search) ? target?.search.length : 0;
  const contents = Array.isArray(target?.contents) ? target?.contents.length : 0;
  const black = target?.black && typeof target.black === "object" ? (target.black as Record<string, unknown>) : undefined;
  const blockedMedia = Array.isArray(black?.media) ? black.media.length : 0;
  const blockedGroups = Array.isArray(black?.mediaGroup) ? black.mediaGroup.length : 0;
  const parts = [];
  if (search > 0) {
    parts.push(`검색매체 ${search.toLocaleString("ko-KR")}개`);
  }
  if (contents > 0) {
    parts.push(`콘텐츠매체 ${contents.toLocaleString("ko-KR")}개`);
  }
  if (blockedMedia > 0 || blockedGroups > 0) {
    parts.push(`차단 ${blockedMedia.toLocaleString("ko-KR")}개 매체/${blockedGroups.toLocaleString("ko-KR")}개 그룹`);
  }

  return parts.length ? parts.join(", ") : "매체 설정값 원문 저장";
}

function describeKeywordTarget(target: Record<string, unknown> | undefined) {
  const values = flattenTextValues(target).filter((value) => value.length > 0);
  if (values.length === 0) {
    return "키워드 설정값 원문 저장";
  }

  return values.slice(0, 5).join(", ");
}

function flattenTextValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenTextValues(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => flattenTextValues(item));
  }
  return [];
}
