import { getSearchAdDeviceLabel } from "./targetDisplay";
import { getSearchAdMediaFallback, getSearchAdMediaNetworkLabel } from "./mediaDisplay";
import type { SearchAdRuleResult, RuleSeverity } from "./types";

export type RuleResultBreakdownItem = {
  id: string;
  result: SearchAdRuleResult;
  label: string;
  deviceLabel: string;
  mediaLabel: string;
  mediaNetworkLabel?: string;
  clicks: number;
  cost: number;
  conversions: number;
  salesAmount: number;
  conversionRate: number | null;
  roas: number | null;
};

export type RuleResultDisplayGroup = {
  id: string;
  result: SearchAdRuleResult;
  results: SearchAdRuleResult[];
  breakdowns: RuleResultBreakdownItem[];
  deviceCount: number;
  mediaCount: number;
  sourceRowCount: number;
};

export function groupRuleResultsForDisplay(results: SearchAdRuleResult[]): RuleResultDisplayGroup[] {
  const groups = new Map<string, SearchAdRuleResult[]>();

  for (const result of results) {
    const key = displayGroupKey(result);
    const group = groups.get(key);
    if (group) {
      group.push(result);
    } else {
      groups.set(key, [result]);
    }
  }

  return Array.from(groups.entries()).map(([key, groupResults]) => buildDisplayGroup(key, groupResults));
}

function buildDisplayGroup(key: string, results: SearchAdRuleResult[]): RuleResultDisplayGroup {
  const sortedResults = [...results].sort((a, b) => metricNumber(b, "clicks") - metricNumber(a, "clicks"));
  const primary = sortedResults[0] ?? results[0];
  const breakdowns = sortedResults.map(buildBreakdownItem);
  const sourceRowIds = new Set<string>();
  const deviceLabels = new Set<string>();
  const mediaLabels = new Set<string>();

  for (const item of breakdowns) {
    if (item.deviceLabel !== "기기 미상") {
      deviceLabels.add(item.deviceLabel);
    }
    if (item.mediaLabel !== "매체 미상") {
      mediaLabels.add(item.mediaLabel);
    }
  }

  for (const result of results) {
    for (const sourceRowId of sourceRowIdsFromResult(result)) {
      sourceRowIds.add(sourceRowId);
    }
  }

  return {
    id: `rule-group-${stableHash(key)}`,
    result: buildAggregateResult(primary, sortedResults, deviceLabels, mediaLabels),
    results: sortedResults,
    breakdowns,
    deviceCount: deviceLabels.size,
    mediaCount: mediaLabels.size,
    sourceRowCount: sourceRowIds.size || results.length,
  };
}

function buildAggregateResult(primary: SearchAdRuleResult, results: SearchAdRuleResult[], deviceLabels: Set<string>, mediaLabels: Set<string>): SearchAdRuleResult {
  const impressions = sumMetric(results, "impressions");
  const clicks = sumMetric(results, "clicks");
  const cost = sumMetric(results, "cost");
  const conversions = sumMetric(results, "conversions");
  const salesAmount = sumMetric(results, "salesAmount");
  const sourceRowIds = Array.from(new Set(results.flatMap(sourceRowIdsFromResult))).slice(0, 100);

  return {
    ...primary,
    severity: maxSeverity(results.map((result) => result.severity)),
    metrics: {
      ...primary.metrics,
      impressions,
      clicks,
      cost,
      conversions,
      salesAmount,
      cpa: conversions > 0 ? cost / conversions : null,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : null,
      roas: cost > 0 ? (salesAmount / cost) * 100 : null,
    },
    evidencePacket: {
      ...primary.evidencePacket,
      deviceLabel: deviceLabels.size > 1 ? `${deviceLabels.size.toLocaleString("ko-KR")}개 기기` : Array.from(deviceLabels)[0] ?? primary.evidencePacket.deviceLabel,
      mediaDisplayLabel: mediaLabels.size > 1 ? `${mediaLabels.size.toLocaleString("ko-KR")}개 매체` : Array.from(mediaLabels)[0] ?? primary.evidencePacket.mediaDisplayLabel,
      sourceRowIds,
      displayGroupedCount: results.length,
    },
  };
}

function buildBreakdownItem(result: SearchAdRuleResult): RuleResultBreakdownItem {
  const deviceLabel = getDeviceLabel(result);
  const mediaLabel = getMediaLabel(result);
  const fallbackMedia = getSearchAdMediaFallback(stringFromEvidence(result.evidencePacket.mediaId));
  const mediaNetworkLabel = stringFromEvidence(result.evidencePacket.mediaNetworkLabel) ?? getSearchAdMediaNetworkLabel(fallbackMedia) ?? undefined;
  const clicks = metricNumber(result, "clicks");
  const cost = metricNumber(result, "cost");
  const conversions = metricNumber(result, "conversions");
  const salesAmount = metricNumber(result, "salesAmount");
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : null;
  const roas = cost > 0 ? (salesAmount / cost) * 100 : null;

  return {
    id: result.id,
    result,
    label: `${deviceLabel} · ${mediaLabel}`,
    deviceLabel,
    mediaLabel,
    mediaNetworkLabel,
    clicks,
    cost,
    conversions,
    salesAmount,
    conversionRate,
    roas,
  };
}

function displayGroupKey(result: SearchAdRuleResult) {
  return [
    result.brandKey,
    result.adProductType,
    result.category,
    stringFromEvidence(result.evidencePacket.actionIntent) ?? "",
    stringFromEvidence(result.evidencePacket.reportFamily) ?? stringFromEvidence(result.evidencePacket.reportType) ?? "",
    result.targetType,
    result.targetId ?? result.targetLabel,
    stringFromEvidence(result.evidencePacket.campaignId) ?? stringFromEvidence(result.evidencePacket.campaignName) ?? "",
    stringFromEvidence(result.evidencePacket.adgroupId) ?? stringFromEvidence(result.evidencePacket.adgroupName) ?? stringFromEvidence(result.evidencePacket.connectedTargetLabel) ?? "",
  ].join("|");
}

function getDeviceLabel(result: SearchAdRuleResult) {
  return stringFromEvidence(result.evidencePacket.deviceLabel) ?? getSearchAdDeviceLabel(stringFromEvidence(result.evidencePacket.device)) ?? "기기 미상";
}

function getMediaLabel(result: SearchAdRuleResult) {
  const mediaId = stringFromEvidence(result.evidencePacket.mediaId);
  const fallbackMedia = getSearchAdMediaFallback(mediaId);
  const displayLabel = stringFromEvidence(result.evidencePacket.mediaDisplayLabel) ?? stringFromEvidence(result.evidencePacket.mediaName) ?? fallbackMedia?.mediaName;
  if (displayLabel) {
    return displayLabel;
  }

  if (!mediaId) {
    return "매체 미상";
  }
  if (mediaId.includes("개 매체")) {
    return mediaId;
  }
  return `매체 ID ${mediaId}`;
}

function sourceRowIdsFromResult(result: SearchAdRuleResult) {
  const sourceRowIds = result.evidencePacket.sourceRowIds;
  if (Array.isArray(sourceRowIds)) {
    return sourceRowIds.filter((value): value is string => typeof value === "string" && value.length > 0);
  }

  const normalizedRowId = stringFromEvidence(result.evidencePacket.normalizedRowId);
  return normalizedRowId ? [normalizedRowId] : [];
}

function maxSeverity(values: RuleSeverity[]): RuleSeverity {
  if (values.includes("high")) {
    return "high";
  }
  if (values.includes("medium")) {
    return "medium";
  }
  return "low";
}

function sumMetric(results: SearchAdRuleResult[], key: string) {
  return results.reduce((total, result) => total + metricNumber(result, key), 0);
}

function metricNumber(result: SearchAdRuleResult, key: string) {
  const value = result.metrics[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function stringFromEvidence(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
