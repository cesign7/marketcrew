import type { SearchAdNormalizedRow, SearchAdRuleCriteria, SearchAdRuleResult } from "./types";
import { describeSearchAdRuleTarget } from "./targetDisplay";
import { getReportTypeLabel } from "./reportTypes";

const RULE_RUN_AT = "2026-05-26T08:00:00+09:00";

export function buildSearchAdRuleResults(rows: SearchAdNormalizedRow[], criteriaList: SearchAdRuleCriteria[], now = RULE_RUN_AT): SearchAdRuleResult[] {
  const criteriaByScope = new Map(criteriaList.filter((item) => item.enabled).map((item) => [`${item.brandKey}:${item.adProductType}`, item]));
  const results: SearchAdRuleResult[] = [];

  for (const row of rows) {
    const criteria = criteriaByScope.get(`${row.brandKey}:${row.adProductType}`);
    if (!criteria) {
      continue;
    }

    const target = describeSearchAdRuleTarget(row);
    const cpa = row.conversions > 0 ? row.cost / row.conversions : null;
    const roas = row.cost > 0 ? (row.salesAmount / row.cost) * 100 : null;
    const metrics = {
      impressions: row.impressions,
      clicks: row.clicks,
      cost: row.cost,
      conversions: row.conversions,
      salesAmount: row.salesAmount,
      cpa,
      roas,
    };
    const evidencePacket = {
      reportRowId: row.reportRowId,
      reportId: reportIdFromRowId(row.reportRowId),
      reportType: row.reportType,
      reportTypeLabel: getReportTypeLabel(row.reportType),
      normalizedRowId: row.id,
      sourceDate: row.sourceDate,
      campaignName: row.campaignName ?? null,
      campaignId: row.campaignId ?? null,
      adgroupName: row.adgroupName ?? null,
      adgroupId: row.adgroupId ?? null,
      keywordId: row.keywordId ?? null,
      keywordText: row.keywordText ?? null,
      searchTerm: row.searchTerm ?? null,
      adId: row.adId ?? null,
      criterionId: row.criterionId ?? null,
      extensionId: row.extensionId ?? null,
      device: row.device ?? null,
      mediaId: row.mediaId ?? null,
      targetTypeLabel: target.targetTypeLabel,
      connectedTargetLabel: target.connectedTargetLabel,
      rawTargetId: target.rawTargetId ?? null,
      rawTargetCode: target.rawTargetCode ?? null,
      targetDetailLabel: target.targetDetailLabel ?? null,
    };

    if (row.impressions >= criteria.minImpressions && row.clicks === 0) {
      results.push({
        id: ruleId("no-click", row.id),
        brandKey: row.brandKey,
        adProductType: row.adProductType,
        category: "no_click",
        targetType: target.targetType,
        targetId: target.targetId,
        targetLabel: target.targetLabel,
        severity: "low",
        periodDays: criteria.periodDays,
        reason: `${targetReasonSubject(target.targetType)} 노출 ${formatNumber(row.impressions)}회가 있으나 클릭이 없어 적합도 점검이 필요합니다.`,
        metrics,
        evidencePacket,
        createdAt: now,
      });
      continue;
    }

    if (row.clicks >= criteria.minClicks && row.cost >= criteria.minCost && row.conversions === 0) {
      results.push({
        id: ruleId("low-efficiency", row.id),
        brandKey: row.brandKey,
        adProductType: row.adProductType,
        category: "low_efficiency",
        targetType: target.targetType,
        targetId: target.targetId,
        targetLabel: target.targetLabel,
        severity: "medium",
        periodDays: criteria.periodDays,
        reason: `${targetReasonSubject(target.targetType)} 클릭 ${formatNumber(row.clicks)}회와 비용 ${formatWon(row.cost)}가 있으나 전환이 없어 입찰, 제외어, 랜딩 점검이 필요합니다.`,
        metrics,
        evidencePacket,
        createdAt: now,
      });
      continue;
    }

    if (criteria.targetCpa !== null && cpa !== null && cpa > criteria.targetCpa) {
      results.push({
        id: ruleId("high-cpa", row.id),
        brandKey: row.brandKey,
        adProductType: row.adProductType,
        category: "high_cpa",
        targetType: target.targetType,
        targetId: target.targetId,
        targetLabel: target.targetLabel,
        severity: "high",
        periodDays: criteria.periodDays,
        reason: `${targetReasonSubject(target.targetType)} CPA ${formatWon(cpa)}가 목표 ${formatWon(criteria.targetCpa)}를 넘어 비용 효율 조정이 필요합니다.`,
        metrics,
        evidencePacket,
        createdAt: now,
      });
      continue;
    }

    if (criteria.targetRoas !== null && roas !== null && row.cost >= criteria.minCost && roas < criteria.targetRoas) {
      results.push({
        id: ruleId("low-roas", row.id),
        brandKey: row.brandKey,
        adProductType: row.adProductType,
        category: "low_roas",
        targetType: target.targetType,
        targetId: target.targetId,
        targetLabel: target.targetLabel,
        severity: "medium",
        periodDays: criteria.periodDays,
        reason: `${targetReasonSubject(target.targetType)} ROAS ${formatPercent(roas)}가 목표 ${formatPercent(criteria.targetRoas)}보다 낮아 예산 유지 여부를 점검해야 합니다.`,
        metrics,
        evidencePacket,
        createdAt: now,
      });
      continue;
    }

    if (
      row.clicks >= criteria.minClicks &&
      row.conversions > 0 &&
      (criteria.targetCpa === null || (cpa !== null && cpa <= criteria.targetCpa)) &&
      (criteria.targetRoas === null || (roas !== null && roas >= criteria.targetRoas))
    ) {
      results.push({
        id: ruleId("good-performance", row.id),
        brandKey: row.brandKey,
        adProductType: row.adProductType,
        category: "good_performance",
        targetType: target.targetType,
        targetId: target.targetId,
        targetLabel: target.targetLabel,
        severity: "low",
        periodDays: criteria.periodDays,
        reason: `${targetReasonSubject(target.targetType)} 클릭 ${formatNumber(row.clicks)}회에서 전환 ${formatNumber(row.conversions)}건과 매출 ${formatWon(row.salesAmount)}가 확인되어 유지 또는 확장 후보입니다.`,
        metrics,
        evidencePacket,
        createdAt: now,
      });
    }
  }

  return results;
}

export function buildSearchAdPeriodRuleResults(rows: SearchAdNormalizedRow[], criteriaList: SearchAdRuleCriteria[], now = RULE_RUN_AT): SearchAdRuleResult[] {
  const enabledCriteria = criteriaList.filter((item) => item.enabled);
  const results: SearchAdRuleResult[] = [];

  for (const criteria of enabledCriteria) {
    const scopedRows = rows.filter((row) => row.brandKey === criteria.brandKey && row.adProductType === criteria.adProductType);
    const endDate = latestSourceDate(scopedRows);
    if (!endDate) {
      continue;
    }

    const startDate = addDays(endDate, -(criteria.periodDays - 1));
    const windowRows = scopedRows.filter((row) => row.sourceDate >= startDate && row.sourceDate <= endDate);
    const actualDataDays = countDistinct(windowRows.map((row) => row.sourceDate));
    const collectedStartDate = earliestSourceDate(windowRows) ?? endDate;
    const coverageStatus = getCoverageStatus(actualDataDays, criteria.periodDays);
    const coverageWarningLabel = getCoverageWarningLabel(coverageStatus);
    const dataCoverageLabel = formatCoverageLabel(collectedStartDate, endDate, actualDataDays, criteria.periodDays);
    const groupedRows = groupPeriodRows(windowRows, criteria.periodDays);

    for (const groupRows of groupedRows.values()) {
      const aggregatedRow = aggregatePeriodRows(groupRows, criteria.periodDays, endDate);
      const [result] = buildSearchAdRuleResults([aggregatedRow], [criteria], now);
      if (!result) {
        continue;
      }

      results.push({
        ...result,
        reason: withCoverageWarning(result.reason, coverageStatus, coverageWarningLabel, actualDataDays, criteria.periodDays),
        evidencePacket: {
          ...result.evidencePacket,
          criteriaPeriodDays: criteria.periodDays,
          actualDataDays,
          dataWindowStart: collectedStartDate,
          dataWindowEnd: endDate,
          ruleWindowStart: startDate,
          ruleWindowEnd: endDate,
          dataCoverageLabel,
          coverageStatus,
          coverageWarningLabel,
          sourceRowIds: groupRows.map((row) => row.id).slice(0, 30),
        },
      });
    }
  }

  return results;
}

function ruleId(prefix: string, rowId: string) {
  const rawId = `rule-${prefix}-${rowId}`;
  const readableId = rawId.replace(/[^\p{L}\p{N}_-]/gu, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${readableId}-${stableHash(rawId)}`;
}

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

function targetReasonSubject(targetType: SearchAdRuleResult["targetType"]) {
  if (targetType === "criterion") {
    return "이 타게팅에서";
  }

  if (targetType === "ad") {
    return "이 광고 소재에서";
  }

  if (targetType === "ad_extension") {
    return "이 확장소재에서";
  }

  if (targetType === "adgroup") {
    return "이 광고그룹에서";
  }

  if (targetType === "campaign") {
    return "이 캠페인에서";
  }

  return "이 검색어에서";
}

function reportIdFromRowId(reportRowId: string) {
  const match = reportRowId.match(/^(report-[^-]+)-row-/);
  return match?.[1] ?? null;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("ko-KR");
}

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function groupPeriodRows(rows: SearchAdNormalizedRow[], periodDays: number) {
  const groups = new Map<string, SearchAdNormalizedRow[]>();
  for (const row of rows) {
    const key = periodGroupKey(row, periodDays);
    const group = groups.get(key);
    if (group) {
      group.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  return groups;
}

function periodGroupKey(row: SearchAdNormalizedRow, periodDays: number) {
  const target = describeSearchAdRuleTarget(row);
  return [
    periodDays,
    row.brandKey,
    row.adProductType,
    row.reportType,
    row.campaignId ?? row.campaignName ?? "",
    row.adgroupId ?? row.adgroupName ?? "",
    target.targetType,
    target.targetId ?? target.targetLabel,
    row.device ?? "",
    row.mediaId ?? "",
  ].join("|");
}

function aggregatePeriodRows(rows: SearchAdNormalizedRow[], periodDays: number, endDate: string): SearchAdNormalizedRow {
  const sortedRows = [...rows].sort((a, b) => b.sourceDate.localeCompare(a.sourceDate) || b.cost - a.cost || b.clicks - a.clicks);
  const base = sortedRows[0] ?? rows[0];

  return {
    ...base,
    id: ruleId(`period-${periodDays}`, periodGroupKey(base, periodDays)),
    reportRowId: `period-${periodDays}-${base.reportRowId}`,
    impressions: sum(rows, "impressions"),
    clicks: sum(rows, "clicks"),
    cost: sum(rows, "cost"),
    conversions: sum(rows, "conversions"),
    salesAmount: sum(rows, "salesAmount"),
    sourceDate: endDate,
  };
}

function sum(rows: SearchAdNormalizedRow[], key: "impressions" | "clicks" | "cost" | "conversions" | "salesAmount") {
  return rows.reduce((total, row) => total + row[key], 0);
}

function latestSourceDate(rows: SearchAdNormalizedRow[]) {
  return rows.reduce<string | undefined>((latest, row) => {
    if (!latest || row.sourceDate > latest) {
      return row.sourceDate;
    }

    return latest;
  }, undefined);
}

function earliestSourceDate(rows: SearchAdNormalizedRow[]) {
  return rows.reduce<string | undefined>((earliest, row) => {
    if (!earliest || row.sourceDate < earliest) {
      return row.sourceDate;
    }

    return earliest;
  }, undefined);
}

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function countDistinct(values: string[]) {
  return new Set(values).size;
}

function getCoverageStatus(actualDays: number, requiredDays: number) {
  if (actualDays >= requiredDays) {
    return "complete";
  }

  if (actualDays > 1) {
    return "partial";
  }

  return "insufficient";
}

function getCoverageWarningLabel(status: ReturnType<typeof getCoverageStatus>) {
  if (status === "complete") {
    return "정상 판단";
  }

  if (status === "partial") {
    return "일부 기간 판단";
  }

  return "임시 판단";
}

function formatCoverageLabel(startDate: string, endDate: string, actualDays: number, periodDays: number) {
  const dateLabel = startDate === endDate ? `수집 기준일 ${endDate}` : `수집 ${startDate}~${endDate}`;
  return `${dateLabel} · 실제 ${actualDays.toLocaleString("ko-KR")}일치 / 규칙 ${periodDays}일`;
}

function withCoverageWarning(reason: string, status: ReturnType<typeof getCoverageStatus>, label: string, actualDays: number, periodDays: number) {
  if (status === "complete") {
    return reason;
  }

  return `${label}: 실제 ${actualDays.toLocaleString("ko-KR")}일치만 수집되어 규칙 ${periodDays}일 기준으로는 보수적으로 봐야 합니다. ${reason}`;
}
