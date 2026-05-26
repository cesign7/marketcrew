import type { SearchAdNormalizedRow, SearchAdReportType, SearchAdRuleActionTarget, SearchAdRuleResult } from "./types";

export type SearchAdRuleTargetDescriptor = {
  targetType: SearchAdRuleResult["targetType"];
  targetId?: string;
  targetLabel: string;
  targetTypeLabel: string;
  connectedTargetLabel: string;
  rawTargetId?: string;
  rawTargetCode?: string;
  targetDetailLabel?: string;
};

const RULE_TARGET_TYPE_LABELS: Record<SearchAdRuleResult["targetType"], string> = {
  ad: "광고 소재",
  ad_extension: "확장소재",
  adgroup: "광고그룹",
  campaign: "캠페인",
  criterion: "타게팅",
  keyword: "키워드",
  search_term: "검색어",
};

export function describeSearchAdRuleTarget(row: SearchAdNormalizedRow): SearchAdRuleTargetDescriptor {
  if (isCriterionReport(row.reportType)) {
    const criterionId = row.criterionId ?? identifierLike(row.searchTerm, "grp-") ?? identifierLike(row.keywordText, "grp-");
    const criterion = splitCriterionId(criterionId);
    const connectedTargetLabel = row.adgroupName ?? row.campaignName ?? "연결 대상 확인 필요";

    return {
      targetType: "criterion",
      targetId: criterionId ?? row.adgroupId ?? row.campaignId ?? row.id,
      targetLabel: criterion?.label ? `${connectedTargetLabel} ${criterion.label} 타게팅` : `${connectedTargetLabel} 타게팅`,
      targetTypeLabel: getRuleTargetTypeLabel("criterion"),
      connectedTargetLabel,
      rawTargetId: criterionId,
      rawTargetCode: criterion?.code,
      targetDetailLabel: criterion?.label,
    };
  }

  if (isAdReport(row.reportType)) {
    const adId = row.adId ?? identifierLike(row.searchTerm, "nad-") ?? identifierLike(row.keywordText, "nad-");
    const connectedTargetLabel = row.adgroupName ?? row.campaignName ?? "연결 대상 확인 필요";

    return {
      targetType: "ad",
      targetId: adId ?? row.keywordId ?? row.adgroupId ?? row.campaignId ?? row.id,
      targetLabel: `${connectedTargetLabel} 광고 소재`,
      targetTypeLabel: getRuleTargetTypeLabel("ad"),
      connectedTargetLabel,
      rawTargetId: adId,
    };
  }

  if (row.reportType === "ADEXTENSION") {
    const extensionId = row.extensionId ?? row.adId;
    const connectedTargetLabel = row.adgroupName ?? row.campaignName ?? "연결 대상 확인 필요";

    return {
      targetType: "ad_extension",
      targetId: extensionId ?? row.keywordId ?? row.adgroupId ?? row.campaignId ?? row.id,
      targetLabel: `${connectedTargetLabel} 확장소재`,
      targetTypeLabel: getRuleTargetTypeLabel("ad_extension"),
      connectedTargetLabel,
      rawTargetId: extensionId,
    };
  }

  const searchTerm = row.searchTerm ?? row.keywordText;
  if (searchTerm) {
    return {
      targetType: "search_term",
      targetId: row.keywordId ?? searchTerm,
      targetLabel: searchTerm,
      targetTypeLabel: getRuleTargetTypeLabel("search_term"),
      connectedTargetLabel: row.adgroupName ?? row.campaignName ?? "연결 대상 확인 필요",
      rawTargetId: row.keywordId,
    };
  }

  if (row.adgroupName || row.adgroupId) {
    return {
      targetType: "adgroup",
      targetId: row.adgroupId ?? row.id,
      targetLabel: row.adgroupName ?? "이름 없는 광고그룹",
      targetTypeLabel: getRuleTargetTypeLabel("adgroup"),
      connectedTargetLabel: row.campaignName ?? "연결 대상 확인 필요",
      rawTargetId: row.adgroupId,
    };
  }

  return {
    targetType: "campaign",
    targetId: row.campaignId ?? row.id,
    targetLabel: row.campaignName ?? "이름 없는 캠페인",
    targetTypeLabel: getRuleTargetTypeLabel("campaign"),
    connectedTargetLabel: row.campaignName ?? "연결 대상 확인 필요",
    rawTargetId: row.campaignId,
  };
}

export function getRuleTargetTypeLabel(targetType: SearchAdRuleResult["targetType"]) {
  return RULE_TARGET_TYPE_LABELS[targetType] ?? "점검 대상";
}

export function getRuleResultDisplayTargetTypeLabel(result: SearchAdRuleResult) {
  const inferredType = inferTechnicalTargetType(result.targetLabel) ?? inferTechnicalTargetType(result.targetId);
  if (inferredType) {
    return getRuleTargetTypeLabel(inferredType);
  }

  return stringFromEvidence(result.evidencePacket.targetTypeLabel) ?? getRuleTargetTypeLabel(result.targetType);
}

export function getRuleResultDisplayTargetLabel(result: SearchAdRuleResult) {
  if (!isTechnicalTargetIdentifier(result.targetLabel)) {
    return result.targetLabel;
  }

  const connectedTarget = getRuleResultConnectedTarget(result);
  const typeLabel = getRuleResultDisplayTargetTypeLabel(result);
  const detailLabel = getRuleResultTargetDetailLabel(result);
  const suffix = detailLabel ? `${detailLabel} ${typeLabel}` : typeLabel;
  return connectedTarget === "-" ? suffix : `${connectedTarget} ${suffix}`;
}

export function getRuleResultConnectedTarget(result: SearchAdRuleResult) {
  return stringFromEvidence(result.evidencePacket.connectedTargetLabel) ?? stringFromEvidence(result.evidencePacket.adgroupName) ?? stringFromEvidence(result.evidencePacket.campaignName) ?? "-";
}

export function getRuleResultRawTargetId(result: SearchAdRuleResult) {
  return stringFromEvidence(result.evidencePacket.rawTargetId) ?? (isTechnicalTargetIdentifier(result.targetLabel) ? result.targetLabel : undefined) ?? result.targetId;
}

export function getRuleResultSourceReportLabel(result: SearchAdRuleResult) {
  return stringFromEvidence(result.evidencePacket.reportTypeLabel) ?? stringFromEvidence(result.evidencePacket.reportType) ?? "보고서";
}

export function getRuleResultPeriodLabel(result: SearchAdRuleResult) {
  const label = stringFromEvidence(result.evidencePacket.dataCoverageLabel);
  if (label) {
    return label;
  }

  const sourceDate = stringFromEvidence(result.evidencePacket.sourceDate);
  if (sourceDate) {
    return `수집 기준일 ${sourceDate} · 실제 1일치 / 규칙 ${result.periodDays}일`;
  }

  return `규칙 ${result.periodDays}일`;
}

export function getRuleResultTargetDetailLabel(result: SearchAdRuleResult) {
  const evidenceLabel = stringFromEvidence(result.evidencePacket.targetDetailLabel);
  if (evidenceLabel) {
    return evidenceLabel;
  }

  const rawTargetCode = stringFromEvidence(result.evidencePacket.rawTargetCode) ?? rawCodeFromTechnicalId(getRuleResultRawTargetId(result));
  return translateTargetCode(rawTargetCode);
}

export function getRuleResultCreativeLabel(result: SearchAdRuleResult) {
  const label =
    stringFromEvidence(result.evidencePacket.adHeadline) ??
    stringFromEvidence(result.evidencePacket.adTitle) ??
    stringFromEvidence(result.evidencePacket.adDescription) ??
    stringFromEvidence(result.evidencePacket.creativeLabel);

  return isTechnicalTargetIdentifier(label) ? undefined : label;
}

export function getRuleResultLandingLabel(result: SearchAdRuleResult) {
  const pcUrl = stringFromEvidence(result.evidencePacket.pcFinalUrl) ?? stringFromEvidence(result.evidencePacket.finalPcUrl);
  const mobileUrl = stringFromEvidence(result.evidencePacket.mobileFinalUrl) ?? stringFromEvidence(result.evidencePacket.finalMobileUrl);
  const finalUrl = stringFromEvidence(result.evidencePacket.finalUrl);

  if (pcUrl && mobileUrl && pcUrl !== mobileUrl) {
    return `PC ${pcUrl} / 모바일 ${mobileUrl}`;
  }

  return pcUrl ?? mobileUrl ?? finalUrl;
}

export function getRuleResultDetailHref(result: SearchAdRuleResult) {
  return `/rule-results/${encodeURIComponent(result.id)}`;
}

export function getRuleResultActionTarget(result: SearchAdRuleResult): SearchAdRuleActionTarget | undefined {
  const adgroupId = stringFromEvidence(result.evidencePacket.adgroupId) ?? (result.targetType === "adgroup" ? result.targetId : undefined);
  if (adgroupId) {
    return {
      targetType: "adgroup",
      targetId: adgroupId,
      targetLabel:
        stringFromEvidence(result.evidencePacket.adgroupName) ??
        stringFromEvidence(result.evidencePacket.connectedTargetLabel) ??
        getRuleResultDisplayTargetLabel(result),
    };
  }

  const campaignId = stringFromEvidence(result.evidencePacket.campaignId) ?? (result.targetType === "campaign" ? result.targetId : undefined);
  if (campaignId) {
    return {
      targetType: "campaign",
      targetId: campaignId,
      targetLabel: stringFromEvidence(result.evidencePacket.campaignName) ?? getRuleResultDisplayTargetLabel(result),
    };
  }

  return undefined;
}

export function getNormalizedRowDisplayTarget(row: SearchAdNormalizedRow) {
  return describeSearchAdRuleTarget(row).targetLabel;
}

export function isSearchTermReport(reportType: SearchAdReportType) {
  return reportType === "EXPKEYWORD" || reportType === "SHOPPINGKEYWORD_DETAIL" || reportType === "SHOPPINGKEYWORD_CONVERSION_DETAIL";
}

function isCriterionReport(reportType: SearchAdReportType) {
  return reportType === "CRITERION" || reportType === "CRITERION_CONVERSION";
}

function isAdReport(reportType: SearchAdReportType) {
  return reportType === "AD" || reportType === "AD_DETAIL" || reportType === "AD_CONVERSION" || reportType === "AD_CONVERSION_DETAIL";
}

function splitCriterionId(value: string | undefined) {
  if (!value || !value.includes("~")) {
    return undefined;
  }

  const [ownerId, code] = value.split("~");
  return ownerId && code ? { ownerId, code, label: translateTargetCode(code) } : undefined;
}

function identifierLike(value: string | undefined, prefix: string) {
  return value?.startsWith(prefix) ? value : undefined;
}

function stringFromEvidence(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function inferTechnicalTargetType(value: string | undefined): SearchAdRuleResult["targetType"] | undefined {
  if (!value) {
    return undefined;
  }

  if (/^nad-[a-z0-9-]+$/i.test(value)) {
    return "ad";
  }

  if (/^grp-[a-z0-9-]+~[a-z0-9]+$/i.test(value)) {
    return "criterion";
  }

  if (/^nkw-[a-z0-9-]+$/i.test(value)) {
    return "keyword";
  }

  if (/^grp-[a-z0-9-]+$/i.test(value)) {
    return "adgroup";
  }

  if (/^cmp-[a-z0-9-]+$/i.test(value)) {
    return "campaign";
  }

  return undefined;
}

function isTechnicalTargetIdentifier(value: string | undefined) {
  return Boolean(inferTechnicalTargetType(value));
}

function rawCodeFromTechnicalId(value: string | undefined) {
  return value?.includes("~") ? value.split("~")[1] : undefined;
}

function translateTargetCode(code: string | undefined) {
  if (!code) {
    return undefined;
  }

  const upper = code.toUpperCase();
  if (upper === "GNF") {
    return "여성";
  }
  if (upper === "GNM") {
    return "남성";
  }
  if (upper === "GNU") {
    return "성별 미상";
  }
  if (upper === "AGXXXX") {
    return "연령 미상";
  }
  if (upper === "AD0099") {
    return "연령 전체";
  }

  const ageMatch = upper.match(/^AG(\d{2})(\d{2})$/);
  if (ageMatch) {
    return `${Number(ageMatch[1])}~${Number(ageMatch[2])}세`;
  }

  const scheduleMatch = upper.match(/^SD([A-Z]{3})(\d{2})(\d{2})$/);
  if (scheduleMatch) {
    const dayLabel = DAY_LABELS[scheduleMatch[1]];
    if (dayLabel) {
      return `${dayLabel} ${Number(scheduleMatch[2])}:00~${Number(scheduleMatch[3])}:00`;
    }
  }

  return undefined;
}

const DAY_LABELS: Record<string, string> = {
  MON: "월요일",
  TUE: "화요일",
  WED: "수요일",
  THU: "목요일",
  FRI: "금요일",
  SAT: "토요일",
  SUN: "일요일",
};
