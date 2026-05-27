import type { SearchAdNormalizedRow, SearchAdRuleCriteria, SearchAdRuleResult } from "./types";
import { describeSearchAdRuleTarget, getSearchAdDeviceLabel } from "./targetDisplay";
import { getReportTypeLabel } from "./reportTypes";

const RULE_RUN_AT = "2026-05-26T08:00:00+09:00";
const CONVERSION_UNCONFIRMED_BRANDS = new Set<SearchAdNormalizedRow["brandKey"]>(["coffeeprint"]);

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
      ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : null,
      conversionRate: row.clicks > 0 ? (row.conversions / row.clicks) * 100 : null,
    };
    const evidencePacket = {
      reportRowId: row.reportRowId,
      reportId: reportIdFromRowId(row.reportRowId),
      reportType: row.reportType,
      reportFamily: ruleReportFamily(row.reportType),
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
      deviceLabel: getSearchAdDeviceLabel(row.device) ?? null,
      mediaId: row.mediaId ?? null,
      targetTypeLabel: target.targetTypeLabel,
      connectedTargetLabel: target.connectedTargetLabel,
      rawTargetId: target.rawTargetId ?? null,
      rawTargetCode: target.rawTargetCode ?? null,
      targetDetailLabel: target.targetDetailLabel ?? null,
      seasonHint: inferSeasonHint([row.searchTerm, row.keywordText, row.adgroupName, row.campaignName]) ?? null,
      measurementStatus: getMeasurementStatus(row.brandKey),
      measurementStatusLabel: getMeasurementStatusLabel(row.brandKey),
      measurementCaution: getMeasurementCaution(row.brandKey),
    };

    if (hasUnconfirmedConversionMeasurement(row) && row.conversions > 0 && row.cost >= criteria.minCost) {
      results.push({
        id: ruleId("needs-review-conversion-policy", row.id),
        brandKey: row.brandKey,
        adProductType: row.adProductType,
        category: "needs_review",
        targetType: target.targetType,
        targetId: target.targetId,
        targetLabel: target.targetLabel,
        severity: "high",
        periodDays: criteria.periodDays,
        reason: `${targetReasonSubject(target.targetType)} 전환 ${formatNumber(row.conversions)}건이 잡혔지만 커피프린트 전환 기준이 구매/매출로 확정되지 않았습니다. 우수 성과나 ROAS로 단정하기 전에 회원가입, 시안완료, 구매 중 무엇을 전환으로 보는지 먼저 확인해야 합니다.`,
        metrics,
        evidencePacket: withRuleEvidenceContext(evidencePacket, row, target.targetType, "needs_review"),
        createdAt: now,
      });
      continue;
    }

    if (row.conversions > 0 && row.salesAmount === 0 && row.cost >= criteria.minCost) {
      results.push({
        id: ruleId("needs-review-missing-sales", row.id),
        brandKey: row.brandKey,
        adProductType: row.adProductType,
        category: "needs_review",
        targetType: target.targetType,
        targetId: target.targetId,
        targetLabel: target.targetLabel,
        severity: "high",
        periodDays: criteria.periodDays,
        reason: `${targetReasonSubject(target.targetType)} 전환 ${formatNumber(row.conversions)}건은 있으나 전환매출이 0원입니다. ROAS 판단 전에 전환매출 연동과 주문 금액 전달 상태를 먼저 확인해야 합니다.`,
        metrics,
        evidencePacket: withRuleEvidenceContext(evidencePacket, row, target.targetType, "needs_review"),
        createdAt: now,
      });
      continue;
    }

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
        evidencePacket: withRuleEvidenceContext(evidencePacket, row, target.targetType, "no_click"),
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
        reason: `${targetReasonSubject(target.targetType)} 클릭 ${formatNumber(row.clicks)}회와 비용 ${formatWon(row.cost)}가 있으나 전환이 없어 입찰, 제외어, 랜딩 점검이 필요합니다.${hasUnconfirmedConversionMeasurement(row) ? " 단, 커피프린트는 전환 기준 확정 전이므로 중지 전에 실제 주문 흐름도 함께 확인합니다." : ""}`,
        metrics,
        evidencePacket: withRuleEvidenceContext(evidencePacket, row, target.targetType, "low_efficiency"),
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
        evidencePacket: withRuleEvidenceContext(evidencePacket, row, target.targetType, "high_cpa"),
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
        evidencePacket: withRuleEvidenceContext(evidencePacket, row, target.targetType, "low_roas"),
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
        evidencePacket: withRuleEvidenceContext(evidencePacket, row, target.targetType, "good_performance"),
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

function hasUnconfirmedConversionMeasurement(row: SearchAdNormalizedRow) {
  return CONVERSION_UNCONFIRMED_BRANDS.has(row.brandKey);
}

function getMeasurementStatus(brandKey: SearchAdNormalizedRow["brandKey"]) {
  return CONVERSION_UNCONFIRMED_BRANDS.has(brandKey) ? "conversion_unconfirmed" : "confirmed";
}

function getMeasurementStatusLabel(brandKey: SearchAdNormalizedRow["brandKey"]) {
  return CONVERSION_UNCONFIRMED_BRANDS.has(brandKey) ? "전환 기준 확인 필요" : "전환 기준 사용 가능";
}

function getMeasurementCaution(brandKey: SearchAdNormalizedRow["brandKey"]) {
  if (!CONVERSION_UNCONFIRMED_BRANDS.has(brandKey)) {
    return null;
  }

  return "커피프린트는 전환 목적과 전환매출 세팅이 확정되기 전까지 CPA/ROAS/우수 후보를 보수적으로 봅니다.";
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
    ruleReportFamily(row.reportType),
    row.campaignId ?? row.campaignName ?? "",
    row.adgroupId ?? row.adgroupName ?? "",
    target.targetType,
    target.targetId ?? target.targetLabel,
    row.device ?? "",
    row.mediaId ?? "",
  ].join("|");
}

function ruleReportFamily(reportType: SearchAdNormalizedRow["reportType"]) {
  if (reportType === "SHOPPINGKEYWORD_DETAIL" || reportType === "SHOPPINGKEYWORD_CONVERSION_DETAIL") {
    return "shopping_search_term";
  }

  if (reportType === "CRITERION" || reportType === "CRITERION_CONVERSION") {
    return "criterion_targeting";
  }

  if (reportType === "AD" || reportType === "AD_CONVERSION") {
    return "ad_performance";
  }

  return reportType;
}

function withRuleEvidenceContext(
  evidencePacket: Record<string, unknown>,
  row: SearchAdNormalizedRow,
  targetType: SearchAdRuleResult["targetType"],
  category: SearchAdRuleResult["category"],
) {
  const actionIntent = getRuleActionIntent(row, targetType, category);
  return {
    ...evidencePacket,
    actionIntent: actionIntent.key,
    actionIntentLabel: actionIntent.label,
    actionIntentDescription: actionIntent.description,
  };
}

function getRuleActionIntent(row: SearchAdNormalizedRow, targetType: SearchAdRuleResult["targetType"], category: SearchAdRuleResult["category"]) {
  if (category === "needs_review") {
    return {
      key: "data_check",
      label: "데이터 점검 후보",
      description: "전환매출, 연결 대상, 수집 상태를 먼저 확인합니다.",
    };
  }

  if (targetType === "criterion" || row.reportType === "CRITERION" || row.reportType === "CRITERION_CONVERSION") {
    return {
      key: "targeting_adjustment",
      label: "타게팅 조정 후보",
      description: "기기, 성별, 연령, 시간대별 입찰과 노출 조건을 점검합니다.",
    };
  }

  if (category === "low_efficiency" && targetType === "search_term") {
    if (row.adProductType === "shopping_search") {
      return {
        key: "landing_check",
        label: "랜딩 점검 후보",
        description: "검색어와 상품명, 이미지, 랜딩 적합도를 먼저 봅니다.",
      };
    }

    return {
      key: "negative_keyword",
      label: "제외어 후보",
      description: "유지할 방어 검색어가 아니면 제외어 또는 입찰 하향을 검토합니다.",
    };
  }

  if (category === "high_cpa" || category === "low_roas") {
    return {
      key: "bid_adjustment",
      label: "입찰 조정 후보",
      description: "목표 CPA와 ROAS를 기준으로 입찰, 예산, 노출 범위를 조정합니다.",
    };
  }

  if (category === "good_performance" && targetType === "search_term") {
    if (row.adProductType === "shopping_search") {
      return {
        key: "shopping_expand",
        label: "상품 확장 후보",
        description: "성과가 확인된 검색어와 맞는 상품, 이미지, 예산 확대를 검토합니다.",
      };
    }

    return {
      key: "keyword_expand",
      label: "키워드 추가 후보",
      description: "실제 유입 검색어를 등록 키워드나 유사 키워드 후보로 봅니다.",
    };
  }

  if (category === "no_click") {
    return {
      key: "fit_check",
      label: "노출 적합도 점검",
      description: "노출은 있으나 클릭이 없으므로 문구, 상품명, 순위를 확인합니다.",
    };
  }

  return {
    key: "operation_check",
    label: "운영 점검 후보",
    description: "상세 근거를 확인한 뒤 조치 방향을 정합니다.",
  };
}

function inferSeasonHint(values: Array<string | undefined>) {
  const text = values.filter(Boolean).join(" ");
  if (!text) {
    return undefined;
  }

  const normalized = text.replace(/\s/g, "");
  const seasonRules = [
    { label: "설날/새해", patterns: ["설날", "구정", "새해", "신년"] },
    { label: "추석", patterns: ["추석", "한가위"] },
    { label: "부처님오신날", patterns: ["부처님오신날", "석가탄신일", "부처님"] },
    { label: "스승의날", patterns: ["스승의날", "선생님선물"] },
    { label: "어린이날", patterns: ["어린이날"] },
    { label: "어버이날", patterns: ["어버이날", "부모님선물"] },
    { label: "크리스마스", patterns: ["크리스마스", "성탄"] },
    { label: "생일/답례", patterns: ["생일", "답례", "구디백"] },
  ];

  return seasonRules.find((rule) => rule.patterns.some((pattern) => normalized.includes(pattern)))?.label;
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
  return `${dateLabel} · ${formatCoverageBasisLabel(actualDays, periodDays)}`;
}

function formatCoverageBasisLabel(actualDays: number, periodDays: number) {
  if (actualDays >= periodDays) {
    return `최근 ${periodDays.toLocaleString("ko-KR")}일 기준`;
  }

  const actualLabel = actualDays === 1 ? "1일 기준" : `실제 ${actualDays.toLocaleString("ko-KR")}일 기준`;
  return `${actualLabel} (목표 ${periodDays.toLocaleString("ko-KR")}일)`;
}

function withCoverageWarning(reason: string, status: ReturnType<typeof getCoverageStatus>, label: string, actualDays: number, periodDays: number) {
  if (status === "complete") {
    return reason;
  }

  return `${label}: 실제 ${actualDays.toLocaleString("ko-KR")}일치만 수집되어 규칙 ${periodDays}일 기준으로는 보수적으로 봐야 합니다. ${reason}`;
}
