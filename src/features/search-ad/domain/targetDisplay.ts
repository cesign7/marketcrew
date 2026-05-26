import type { SearchAdNormalizedRow, SearchAdReportType, SearchAdRuleResult } from "./types";

export type SearchAdRuleTargetDescriptor = {
  targetType: SearchAdRuleResult["targetType"];
  targetId?: string;
  targetLabel: string;
  targetTypeLabel: string;
  connectedTargetLabel: string;
  rawTargetId?: string;
  rawTargetCode?: string;
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
      targetLabel: `${connectedTargetLabel} 타게팅`,
      targetTypeLabel: getRuleTargetTypeLabel("criterion"),
      connectedTargetLabel,
      rawTargetId: criterionId,
      rawTargetCode: criterion?.code,
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

export function getRuleResultConnectedTarget(result: SearchAdRuleResult) {
  return stringFromEvidence(result.evidencePacket.connectedTargetLabel) ?? stringFromEvidence(result.evidencePacket.adgroupName) ?? stringFromEvidence(result.evidencePacket.campaignName) ?? "-";
}

export function getRuleResultRawTargetId(result: SearchAdRuleResult) {
  return stringFromEvidence(result.evidencePacket.rawTargetId) ?? result.targetId;
}

export function getRuleResultSourceReportLabel(result: SearchAdRuleResult) {
  return stringFromEvidence(result.evidencePacket.reportTypeLabel) ?? stringFromEvidence(result.evidencePacket.reportType) ?? "보고서";
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
  return ownerId && code ? { ownerId, code } : undefined;
}

function identifierLike(value: string | undefined, prefix: string) {
  return value?.startsWith(prefix) ? value : undefined;
}

function stringFromEvidence(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
