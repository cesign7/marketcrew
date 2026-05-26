import { AD_PRODUCTS, BRANDS, getAdProductLabel, getBrandLabel } from "./reportTypes";
import type { SearchAdStateRecord } from "./types";

export type SearchAdStateSortKey = "brand" | "adProduct" | "name" | "state" | "bidAmount" | "dailyBudget" | "collectedAt";

export type SearchAdStateSort = {
  key: SearchAdStateSortKey;
  direction: "asc" | "desc";
};

export function sortSearchAdStateRecords(records: SearchAdStateRecord[], sort?: SearchAdStateSort): SearchAdStateRecord[] {
  return [...records].sort((left, right) => {
    if (!sort) {
      return compareDefault(left, right);
    }

    const primary = compareByKey(left, right, sort.key);
    if (primary !== 0) {
      return sort.direction === "asc" ? primary : -primary;
    }

    return compareDefault(left, right);
  });
}

function compareDefault(left: SearchAdStateRecord, right: SearchAdStateRecord) {
  return (
    compareText(labelBrand(left), labelBrand(right)) ||
    compareText(labelAdProduct(left), labelAdProduct(right)) ||
    compareText(left.name, right.name) ||
    compareText(left.providerId, right.providerId)
  );
}

function compareByKey(left: SearchAdStateRecord, right: SearchAdStateRecord, key: SearchAdStateSortKey) {
  if (key === "brand") {
    return compareText(labelBrand(left), labelBrand(right));
  }

  if (key === "adProduct") {
    return compareText(labelAdProduct(left), labelAdProduct(right));
  }

  if (key === "name") {
    return compareText(left.name, right.name);
  }

  if (key === "state") {
    return compareText(stateLabel(left.userLock), stateLabel(right.userLock));
  }

  if (key === "bidAmount") {
    return compareNullableNumber(left.bidAmount, right.bidAmount);
  }

  if (key === "dailyBudget") {
    return compareNullableNumber(left.dailyBudget, right.dailyBudget);
  }

  return compareText(left.collectedAt, right.collectedAt);
}

function labelBrand(record: SearchAdStateRecord) {
  if (!record.brandKey) {
    return "999:매핑 필요";
  }

  return `${BRANDS.findIndex((brand) => brand.key === record.brandKey)}:${getBrandLabel(record.brandKey)}`;
}

function labelAdProduct(record: SearchAdStateRecord) {
  if (!record.adProductType) {
    return "999:매핑 필요";
  }

  return `${AD_PRODUCTS.findIndex((product) => product.key === record.adProductType)}:${getAdProductLabel(record.adProductType)}`;
}

function stateLabel(value: boolean | null) {
  if (value === true) {
    return "꺼짐";
  }

  if (value === false) {
    return "켜짐";
  }

  return "확인 필요";
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "ko-KR", { numeric: true, sensitivity: "base" });
}

function compareNullableNumber(left: number | null | undefined, right: number | null | undefined) {
  if (left == null && right == null) {
    return 0;
  }

  if (left == null) {
    return 1;
  }

  if (right == null) {
    return -1;
  }

  return left - right;
}
