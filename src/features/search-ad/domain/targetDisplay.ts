import type { SearchAdNormalizedRow, SearchAdReportType, SearchAdRuleActionTarget, SearchAdRuleResult } from "./types";
import { getSearchAdAdExtensionTypeLabel, toSearchAdImageUrl } from "./adExtensionEvidence";

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
  const readableTargetLabel = getReadableTargetLabel(result);
  if (readableTargetLabel) {
    return readableTargetLabel;
  }

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
    return `수집 기준일 ${sourceDate} · 1일 기준 (목표 ${result.periodDays.toLocaleString("ko-KR")}일)`;
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
    stringFromEvidence(result.evidencePacket.adDisplayLabel) ??
    stringFromEvidence(result.evidencePacket.adHeadline) ??
    stringFromEvidence(result.evidencePacket.adTitle) ??
    stringFromEvidence(result.evidencePacket.adDescription) ??
    stringFromEvidence(result.evidencePacket.creativeLabel);

  return isTechnicalTargetIdentifier(label) ? undefined : label;
}

export function getRuleResultAdLabel(result: SearchAdRuleResult) {
  return result.targetType === "ad" ? "광고 소재" : undefined;
}

export function getRuleResultExtensionLabel(result: SearchAdRuleResult) {
  const label =
    stringFromEvidence(result.evidencePacket.extensionDisplayLabel) ??
    stringFromEvidence(result.evidencePacket.extensionLabel) ??
    stringFromEvidence(result.evidencePacket.extensionTypeLabel);

  return sanitizeExtensionLabel(label, result);
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

export function getRuleResultProductConnection(result: SearchAdRuleResult) {
  const productName = nonTechnicalString(
    stringFromEvidence(result.evidencePacket.productName) ??
      stringFromEvidence(result.evidencePacket.productTitle) ??
      stringFromEvidence(result.evidencePacket.adProductName) ??
      stringFromEvidence(result.evidencePacket.adProductTitle) ??
      stringFromEvidence(result.evidencePacket.shoppingProductName) ??
      stringFromEvidence(result.evidencePacket.shoppingProductTitle) ??
      getRuleResultCreativeLabel(result),
  );
  const imageUrl =
    stringFromEvidence(result.evidencePacket.productImageUrl) ??
    stringFromEvidence(result.evidencePacket.imageUrl) ??
    stringFromEvidence(result.evidencePacket.thumbnailUrl) ??
    stringFromEvidence(result.evidencePacket.productThumbnailUrl) ??
    stringFromEvidence(result.evidencePacket.representativeImageUrl) ??
    stringFromEvidence(result.evidencePacket.extensionImageUrl) ??
    toSearchAdImageUrl(stringFromEvidence(result.evidencePacket.extensionImagePath)) ??
    getLegacyExtensionImageUrl(result);
  const landingLabel = getRuleResultLandingLabel(result);

  return {
    ...(productName ? { productName } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(landingLabel ? { landingLabel } : {}),
    hasConnection: Boolean(productName || imageUrl || landingLabel),
  };
}

export function getSearchAdDeviceLabel(device: string | undefined) {
  if (!device) {
    return undefined;
  }

  const normalized = device.toUpperCase();
  if (normalized === "P" || normalized === "PC") {
    return "PC";
  }

  if (normalized === "M" || normalized === "MOBILE") {
    return "모바일";
  }

  return device;
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

function nonTechnicalString(value: string | undefined) {
  return isTechnicalTargetIdentifier(value) ? undefined : value;
}

function sanitizeExtensionLabel(label: string | undefined, result: SearchAdRuleResult) {
  if (!label || isTechnicalTargetIdentifier(label)) {
    return undefined;
  }

  const extensionType = stringFromEvidence(result.evidencePacket.extensionType);
  const evidenceTypeLabel = stringFromEvidence(result.evidencePacket.extensionTypeLabel);
  const parts = label
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
  const rawTypeLabel = parts[0] ?? evidenceTypeLabel ?? extensionType;
  const typeLabel = getSearchAdAdExtensionTypeLabel(extensionType ?? rawTypeLabel);
  const contentLabel = parts.slice(1).find((part) => isReadableExtensionContent(part));

  if (contentLabel) {
    return `${typeLabel} · ${contentLabel}`;
  }

  if (isImageExtensionLabel(rawTypeLabel) || isImageExtensionLabel(evidenceTypeLabel) || stringFromEvidence(result.evidencePacket.extensionImageUrl)) {
    return `${typeLabel} · 이미지 소재`;
  }

  if (parts.length === 1 && rawTypeLabel) {
    return getSearchAdAdExtensionTypeLabel(rawTypeLabel);
  }

  return label;
}

function isReadableExtensionContent(value: string) {
  return !isExtensionImagePathLike(value) && !isTechnicalTargetIdentifier(value);
}

function isExtensionImagePathLike(value: string) {
  return value.startsWith("/") || /^https?:\/\//i.test(value) || /\.(?:jpe?g|png|gif|webp)(?:\?|$)/i.test(value);
}

function isImageExtensionLabel(value: string | undefined) {
  return value?.toUpperCase() === "POWER_LINK_IMAGE" || value === "파워링크 이미지";
}

function getLegacyExtensionImageUrl(result: SearchAdRuleResult) {
  const reference =
    extractImageReference(stringFromEvidence(result.evidencePacket.extensionDisplayLabel)) ??
    extractImageReference(stringFromEvidence(result.evidencePacket.extensionLabel));

  return toSearchAdImageUrl(reference);
}

function extractImageReference(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return value.match(/https?:\/\/\S+\.(?:jpe?g|png|gif|webp)(?:\?\S*)?/i)?.[0] ?? value.match(/\/\S+\.(?:jpe?g|png|gif|webp)(?:\?\S*)?/i)?.[0];
}

function getReadableTargetLabel(result: SearchAdRuleResult) {
  if (result.targetType === "ad") {
    const creativeLabel = nonTechnicalString(getRuleResultCreativeLabel(result));
    return creativeLabel ? `${creativeLabel} 광고 소재` : getRuleResultAdLabel(result);
  }

  if (result.targetType === "ad_extension") {
    const extensionLabel = getRuleResultExtensionLabel(result);
    const ownerLabel =
      nonTechnicalString(stringFromEvidence(result.evidencePacket.productName)) ??
      nonTechnicalString(stringFromEvidence(result.evidencePacket.adDisplayLabel)) ??
      nonTechnicalString(stringFromEvidence(result.evidencePacket.extensionOwnerLabel)) ??
      nonTechnicalString(stringFromEvidence(result.evidencePacket.adHeadline)) ??
      nonTechnicalString(getRuleResultConnectedTarget(result));

    if (extensionLabel && ownerLabel && ownerLabel !== "-") {
      return `${extensionLabel} · ${ownerLabel}`;
    }

    if (extensionLabel) {
      return extensionLabel;
    }

    if (ownerLabel && ownerLabel !== "-") {
      return `${ownerLabel} 확장소재`;
    }
  }

  return undefined;
}

function inferTechnicalTargetType(value: string | undefined): SearchAdRuleResult["targetType"] | undefined {
  if (!value) {
    return undefined;
  }

  if (/^ext-[a-z0-9-]+$/i.test(value)) {
    return "ad_extension";
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
