import type { AdProductType, BrandKey, SearchAdRuleCriteria } from "./types";

export type SearchAdRuleCriteriaInput = {
  id?: unknown;
  brandKey?: unknown;
  adProductType?: unknown;
  periodDays?: unknown;
  minImpressions?: unknown;
  minClicks?: unknown;
  minCost?: unknown;
  targetCpa?: unknown;
  targetRoas?: unknown;
  enabled?: unknown;
};

export function normalizeSearchAdRuleCriteriaInput(input: SearchAdRuleCriteriaInput): SearchAdRuleCriteria {
  const brandKey = parseBrandKey(input.brandKey);
  const adProductType = parseAdProductType(input.adProductType);
  return {
    id: parseRequiredString(input.id, "기준 ID"),
    brandKey,
    adProductType,
    periodDays: parsePositiveInteger(input.periodDays, "기준 기간", 1, 120),
    minImpressions: parsePositiveNumber(input.minImpressions, "최소 노출", 0),
    minClicks: parsePositiveNumber(input.minClicks, "최소 클릭", 0),
    minCost: parsePositiveNumber(input.minCost, "최소 비용", 0),
    targetCpa: parseNullablePositiveNumber(input.targetCpa, "목표 CPA"),
    targetRoas: parseNullablePositiveNumber(input.targetRoas, "목표 ROAS"),
    enabled: typeof input.enabled === "boolean" ? input.enabled : true,
  };
}

export function sortSearchAdRuleCriteria(criteria: SearchAdRuleCriteria[]) {
  return [...criteria].sort((left, right) => {
    const brand = left.brandKey.localeCompare(right.brandKey);
    if (brand !== 0) {
      return brand;
    }

    return left.adProductType.localeCompare(right.adProductType);
  });
}

function parseRequiredString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label}를 확인해 주세요.`);
  }

  return value.trim();
}

function parseBrandKey(value: unknown): BrandKey {
  if (value === "coffeeprint" || value === "stickersee") {
    return value;
  }

  throw new Error("브랜드를 확인해 주세요.");
}

function parseAdProductType(value: unknown): AdProductType {
  if (value === "powerlink" || value === "shopping_search") {
    return value;
  }

  throw new Error("광고유형을 확인해 주세요.");
}

function parsePositiveInteger(value: unknown, label: string, min: number, max: number) {
  const numberValue = parseNumber(value, label);
  if (!Number.isInteger(numberValue) || numberValue < min || numberValue > max) {
    throw new Error(`${label}은 ${min}~${max} 사이의 정수로 입력해 주세요.`);
  }

  return numberValue;
}

function parsePositiveNumber(value: unknown, label: string, min: number) {
  const numberValue = parseNumber(value, label);
  if (numberValue < min) {
    throw new Error(`${label}은 ${min.toLocaleString("ko-KR")} 이상이어야 합니다.`);
  }

  return numberValue;
}

function parseNullablePositiveNumber(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return parsePositiveNumber(value, label, 0);
}

function parseNumber(value: unknown, label: string) {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value.replaceAll(",", "")) : Number.NaN;
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${label}은 숫자로 입력해 주세요.`);
  }

  return numberValue;
}
