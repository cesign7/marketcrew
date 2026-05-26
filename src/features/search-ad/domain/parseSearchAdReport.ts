import crypto from "node:crypto";
import { inferAdProductFromReportType } from "./reportTypes";
import { getReportColumns, SEARCH_AD_REPORT_PARSER_VERSION } from "./reportColumnSchemas";
import type { BrandKey, SearchAdNormalizedRow, SearchAdRawReportRow, SearchAdReportType } from "./types";

type ParseOptions = {
  reportFileId: string;
  sourceDate: string;
  strictColumnCount?: boolean;
};

export type ParsedSearchAdReport = {
  checksum: string;
  parserVersion: string;
  rows: SearchAdRawReportRow[];
  normalizedRows: SearchAdNormalizedRow[];
};

export function parseSearchAdReport(reportType: SearchAdReportType, rawText: string, options: ParseOptions): ParsedSearchAdReport {
  const columns = getReportColumns(reportType);
  const checksum = crypto.createHash("sha256").update(rawText).digest("hex");
  const lines = rawText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  const rows = lines.map((line, index) => {
    const values = line.split("\t");
    if ((options.strictColumnCount ?? true) && values.length !== columns.length) {
      throw new Error(`SEARCH_AD_REPORT_PARSE_FAILED:${reportType}:expected=${columns.length}:actual=${values.length}:row=${index + 1}`);
    }

    const rawRow: Record<string, string | number | null> = {};
    for (let columnIndex = 0; columnIndex < Math.max(values.length, columns.length); columnIndex += 1) {
      const column = columns[columnIndex] ?? {
        key: `unknown${String(columnIndex + 1).padStart(2, "0")}`,
        label: `알 수 없는 필드 ${columnIndex + 1}`,
        description: "스키마에 없는 원문 필드",
      };
      rawRow[column.key] = column.numeric ? parseReportNumber(values[columnIndex]) : normalizeReportString(values[columnIndex]);
    }

    const searchableText = Object.values(rawRow).join(" ");
    const brandKey = inferBrandKey(searchableText);
    const adProductType = inferAdProductFromReportType(reportType);

    return {
      id: `${options.reportFileId}-row-${index + 1}`,
      reportFileId: options.reportFileId,
      rowNumber: index + 1,
      rawRow,
      brandKey,
      adProductType,
      mappingStatus: brandKey ? "mapped" : "unmapped",
    } satisfies SearchAdRawReportRow;
  });

  return {
    checksum,
    parserVersion: SEARCH_AD_REPORT_PARSER_VERSION,
    rows,
    normalizedRows: rows
      .filter((row) => row.brandKey && row.adProductType)
      .map((row) => normalizeRawRow(reportType, row as SearchAdRawReportRow & { brandKey: BrandKey }, options.sourceDate)),
  };
}

export function normalizeRawRow(reportType: SearchAdReportType, row: SearchAdRawReportRow & { brandKey: BrandKey }, sourceDate: string): SearchAdNormalizedRow {
  const raw = row.rawRow;
  const fallbackLabel =
    stringValue(raw.targetName) ??
    stringValue(raw.searchTerm) ??
    stringValue(raw.keywordText) ??
    stringValue(raw.productName) ??
    stringValue(raw.adId) ??
    stringValue(raw.criterionId);

  return {
    id: `${row.id}-normalized`,
    reportRowId: row.id,
    reportType,
    brandKey: row.brandKey,
    adProductType: row.adProductType ?? inferAdProductFromReportType(reportType),
    campaignId: stringValue(raw.campaignId),
    campaignName: stringValue(raw.campaignName),
    adgroupId: stringValue(raw.adgroupId),
    adgroupName: stringValue(raw.adgroupName),
    keywordId: stringValue(raw.keywordId),
    keywordText: stringValue(raw.keywordText) ?? fallbackLabel,
    searchTerm: stringValue(raw.searchTerm) ?? fallbackLabel,
    impressions: numberValue(raw.impressions),
    clicks: numberValue(raw.clicks),
    cost: numberValue(raw.cost),
    conversions: numberValue(raw.conversions) || numberValue(raw.directConversions),
    salesAmount: numberValue(raw.salesAmount) || numberValue(raw.directSalesAmount),
    sourceDate,
  };
}

export function inferBrandKey(value: string): BrandKey | undefined {
  const normalized = value.toLowerCase();
  if (normalized.includes("커피프린트") || normalized.includes("coffeeprint") || normalized.includes("coffee-print")) {
    return "coffeeprint";
  }

  if (normalized.includes("스티커씨") || normalized.includes("stickersee") || normalized.includes("sticker-see")) {
    return "stickersee";
  }

  return undefined;
}

export function parseReportNumber(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const normalized = value.replace(/,/g, "").replace(/%$/, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeReportString(value: string | undefined) {
  if (value === undefined || value === "") {
    return null;
  }

  return value;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
