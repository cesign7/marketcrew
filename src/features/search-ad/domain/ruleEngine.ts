import type { SearchAdNormalizedRow, SearchAdRuleCriteria, SearchAdRuleResult } from "./types";

const RULE_RUN_AT = "2026-05-26T08:00:00+09:00";

export function buildSearchAdRuleResults(rows: SearchAdNormalizedRow[], criteriaList: SearchAdRuleCriteria[], now = RULE_RUN_AT): SearchAdRuleResult[] {
  const criteriaByScope = new Map(criteriaList.filter((item) => item.enabled).map((item) => [`${item.brandKey}:${item.adProductType}`, item]));
  const results: SearchAdRuleResult[] = [];

  for (const row of rows) {
    const criteria = criteriaByScope.get(`${row.brandKey}:${row.adProductType}`);
    if (!criteria) {
      continue;
    }

    const targetLabel = row.searchTerm ?? row.keywordText ?? row.adgroupName ?? row.campaignName ?? "이름 없음";
    const targetId = row.keywordId ?? row.adgroupId ?? row.campaignId ?? row.id;
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
      normalizedRowId: row.id,
      sourceDate: row.sourceDate,
      campaignName: row.campaignName ?? null,
      adgroupName: row.adgroupName ?? null,
      keywordText: row.keywordText ?? null,
      searchTerm: row.searchTerm ?? null,
    };

    if (row.impressions >= criteria.minImpressions && row.clicks === 0) {
      results.push({
        id: ruleId("no-click", row.id),
        brandKey: row.brandKey,
        adProductType: row.adProductType,
        category: "no_click",
        targetType: "search_term",
        targetId,
        targetLabel,
        severity: "low",
        periodDays: criteria.periodDays,
        reason: `노출 ${formatNumber(row.impressions)}회가 있으나 클릭이 없어 소재나 검색어 적합도 점검이 필요합니다.`,
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
        targetType: "search_term",
        targetId,
        targetLabel,
        severity: "medium",
        periodDays: criteria.periodDays,
        reason: `클릭 ${formatNumber(row.clicks)}회와 비용 ${formatWon(row.cost)}가 있으나 전환이 없어 입찰, 제외어, 랜딩 점검이 필요합니다.`,
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
        targetType: "search_term",
        targetId,
        targetLabel,
        severity: "high",
        periodDays: criteria.periodDays,
        reason: `CPA ${formatWon(cpa)}가 목표 ${formatWon(criteria.targetCpa)}를 넘어 비용 효율 조정이 필요합니다.`,
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
        targetType: "search_term",
        targetId,
        targetLabel,
        severity: "medium",
        periodDays: criteria.periodDays,
        reason: `ROAS ${formatPercent(roas)}가 목표 ${formatPercent(criteria.targetRoas)}보다 낮아 예산 유지 여부를 점검해야 합니다.`,
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
        targetType: "search_term",
        targetId,
        targetLabel,
        severity: "low",
        periodDays: criteria.periodDays,
        reason: `클릭 ${formatNumber(row.clicks)}회에서 전환 ${formatNumber(row.conversions)}건과 매출 ${formatWon(row.salesAmount)}가 확인되어 유지 또는 확장 후보입니다.`,
        metrics,
        evidencePacket,
        createdAt: now,
      });
    }
  }

  return results;
}

function ruleId(prefix: string, rowId: string) {
  return `rule-${prefix}-${rowId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
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
