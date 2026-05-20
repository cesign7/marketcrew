import { createHash } from "node:crypto";

import { Prisma } from "@/app/generated/prisma/client";
import type { SearchAdReportType } from "@/lib/integrations/naver-search-ad/client";
import type { KeywordPerformanceMeta } from "@/lib/integrations/naver-search-ad/snapshots";

export interface SearchAdReportPerformanceRow {
  reportType: SearchAdReportType;
  date: Date;
  campaignId: string | null;
  adgroupId: string | null;
  keywordId: string | null;
  keyword: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number | null;
  avgCpc: number | null;
  conversions: number | null;
  conversionRate: number | null;
  conversionSales: number | null;
  roas: number | null;
  costPerConversion: number | null;
  avgRank: number | null;
  raw: Record<string, unknown>;
}

export interface KeywordPerformanceRowsFromReportInput {
  accountId: string;
  reportRows: SearchAdReportPerformanceRow[];
  keywordMetaById: Map<string, KeywordPerformanceMeta>;
}

const headerAliases = {
  date: ["date", "basic date", "statdt"],
  campaignId: ["campaign id", "campaignid", "ncccampaignid"],
  adgroupId: ["ad group id", "adgroup id", "adgroupid", "nccadgroupid"],
  keywordId: [
    "keyword id",
    "ad keyword id",
    "adkeyword id",
    "ncckeywordid",
    "keywordid",
  ],
  keyword: ["keyword", "ad keyword", "registered keyword", "schkeyword"],
  impressions: ["impression", "impressions", "impression count", "impcnt"],
  clicks: ["click", "clicks", "click count", "clkcnt"],
  cost: ["cost", "salesamt", "cost summation", "cost vat included"],
  ctr: ["ctr", "click through rate"],
  avgCpc: ["cpc", "average cpc", "avg cpc", "avg. cpc"],
  conversions: ["ccnt", "conversion count", "conversions"],
  conversionRate: ["crto", "conversion rate"],
  conversionSales: ["convamt", "sales by conversion", "conversion sales"],
  roas: ["ror", "roas"],
  costPerConversion: ["cpconv", "cost per conversion"],
  avgRank: ["avgrnk", "avg rank", "avg. rank", "average rank"],
} as const;

type CanonicalHeader = keyof typeof headerAliases;

export function parseSearchAdStatReport(
  text: string,
  reportType: SearchAdReportType,
): SearchAdReportPerformanceRow[] {
  const lines = getReportLines(text);

  if (lines.length === 0) {
    return [];
  }

  const delimiter = detectDelimiter(lines[0]);
  const firstLineHeaders = parseReportHeaders(lines[0], delimiter);

  if (!hasReportHeaderRow(firstLineHeaders)) {
    return lines.flatMap((line) =>
      parseHeaderlessReportLine(line, delimiter, reportType),
    );
  }

  return lines.slice(1).flatMap((line) => {
    const values = parseDelimitedLine(line, delimiter);
    return parseReportLineFromHeaders(values, firstLineHeaders, reportType);
  });
}

export function countSearchAdStatReportDataRows(text: string) {
  const lines = getReportLines(text);

  if (lines.length === 0) {
    return 0;
  }

  const delimiter = detectDelimiter(lines[0]);
  const firstLineHeaders = parseReportHeaders(lines[0], delimiter);

  return hasReportHeaderRow(firstLineHeaders)
    ? Math.max(lines.length - 1, 0)
    : lines.length;
}

function parseReportLineFromHeaders(
  values: string[],
  headers: ReturnType<typeof resolveHeader>[],
  reportType: SearchAdReportType,
): SearchAdReportPerformanceRow[] {
  const raw = safeReportRawFromEntries(
    values.map((value, index) => [
      headers[index]?.raw ?? `column${index}`,
      value,
    ]),
  );
  const valueByHeader = new Map<CanonicalHeader, string>();

  values.forEach((value, index) => {
    const header = headers[index]?.canonical;

    if (header) {
      valueByHeader.set(header, value);
    }
  });

  const date = parseReportDate(valueByHeader.get("date"));

  if (!date) {
    return [];
  }

  return [
    {
      reportType,
      date,
      campaignId: optionalString(valueByHeader.get("campaignId")),
      adgroupId: optionalString(valueByHeader.get("adgroupId")),
      keywordId: optionalString(valueByHeader.get("keywordId")),
      keyword: optionalString(valueByHeader.get("keyword")),
      impressions: optionalNumber(valueByHeader.get("impressions")) ?? 0,
      clicks: optionalNumber(valueByHeader.get("clicks")) ?? 0,
      cost: Math.round(optionalNumber(valueByHeader.get("cost")) ?? 0),
      ctr: optionalNumber(valueByHeader.get("ctr")),
      avgCpc: optionalNumber(valueByHeader.get("avgCpc")),
      conversions: optionalNumber(valueByHeader.get("conversions")),
      conversionRate: optionalNumber(valueByHeader.get("conversionRate")),
      conversionSales: optionalNumber(valueByHeader.get("conversionSales")),
      roas: optionalNumber(valueByHeader.get("roas")),
      costPerConversion: optionalNumber(valueByHeader.get("costPerConversion")),
      avgRank: optionalNumber(valueByHeader.get("avgRank")),
      raw,
    },
  ];
}

function parseHeaderlessReportLine(
  line: string,
  delimiter: string,
  reportType: SearchAdReportType,
): SearchAdReportPerformanceRow[] {
  const values = parseDelimitedLine(line, delimiter);
  const date = parseReportDate(values[0]);

  if (!date) {
    return [];
  }

  return [
    {
      reportType,
      date,
      campaignId: optionalReportString(values[2]),
      adgroupId: optionalReportString(values[3]),
      keywordId: null,
      keyword: optionalReportString(values[4]),
      impressions: optionalNumber(values[11]) ?? 0,
      clicks: optionalNumber(values[12]) ?? 0,
      cost: Math.round(optionalNumber(values[13]) ?? 0),
      ctr: null,
      avgCpc: null,
      conversions: null,
      conversionRate: null,
      conversionSales: null,
      roas: null,
      costPerConversion: null,
      avgRank: optionalNumber(values[14]),
      raw: safeReportRawFromEntries(
        values.map((value, index) => [`column${index}`, value]),
      ),
    },
  ];
}

export function toKeywordPerformanceRowsFromReport({
  accountId,
  reportRows,
  keywordMetaById,
}: KeywordPerformanceRowsFromReportInput) {
  const keywordMetaByAdgroupKeyword = new Map<string, KeywordPerformanceMeta>();

  for (const meta of keywordMetaById.values()) {
    keywordMetaByAdgroupKeyword.set(
      adgroupKeywordKey(meta.adgroupId, meta.keyword),
      meta,
    );
  }

  return reportRows.flatMap((row) => {
    const matchedMeta =
      (row.keywordId ? keywordMetaById.get(row.keywordId) : undefined) ??
      (row.adgroupId && row.keyword
        ? keywordMetaByAdgroupKeyword.get(adgroupKeywordKey(row.adgroupId, row.keyword))
        : undefined);
    const fallbackMeta = matchedMeta ? null : reportFallbackMeta(row);
    const meta = matchedMeta ?? fallbackMeta;

    if (!meta) {
      return [];
    }

    return [
      {
        accountId,
        campaignId: meta.campaignId,
        adgroupId: meta.adgroupId,
        keywordId: meta.keywordId,
        keyword: meta.keyword,
        date: row.date,
        impressions: row.impressions,
        clicks: row.clicks,
        cost: row.cost,
        ctr: row.ctr,
        avgCpc: row.avgCpc,
        avgRank: row.avgRank,
        conversions: row.conversions,
        conversionRate: row.conversionRate,
        conversionSales: row.conversionSales
          ? Math.round(row.conversionSales)
          : row.conversionSales,
        roas: row.roas,
        costPerConversion: row.costPerConversion,
        rawJson: toInputJson({
          ...row.raw,
          source: "naver-stat-report",
          reportMappingSource: matchedMeta ? "snapshot" : "report-fallback",
          sourceKeywordId: row.keywordId,
        }),
      },
    ];
  });
}

function reportFallbackMeta(
  row: SearchAdReportPerformanceRow,
): KeywordPerformanceMeta | null {
  if (!row.campaignId || !row.adgroupId || !row.keyword) {
    return null;
  }

  return {
    campaignId: row.campaignId,
    adgroupId: row.adgroupId,
    keywordId: syntheticReportKeywordId(row),
    keyword: row.keyword,
  };
}

function detectDelimiter(headerLine: string) {
  const tabCount = (headerLine.match(/\t/g) ?? []).length;
  const commaCount = (headerLine.match(/,/g) ?? []).length;

  return tabCount >= commaCount ? "\t" : ",";
}

function getReportLines(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
}

function parseReportHeaders(line: string, delimiter: string) {
  return parseDelimitedLine(line, delimiter).map((header) =>
    resolveHeader(header),
  );
}

function hasReportHeaderRow(headers: ReturnType<typeof resolveHeader>[]) {
  return headers.some((header) => header.canonical === "date");
}

function safeReportRawFromEntries(entries: [string, string][]) {
  return Object.fromEntries(
    entries.filter(([key]) => !isSensitiveReportRawKey(key)),
  );
}

function isSensitiveReportRawKey(key: string) {
  const normalized = normalizeHeader(key);
  return normalized === "column1" || normalized.includes("customer");
}

function parseDelimitedLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());

  return values;
}

function resolveHeader(raw: string): {
  raw: string;
  canonical: CanonicalHeader | null;
} {
  const normalized = normalizeHeader(raw);

  for (const [canonical, aliases] of Object.entries(headerAliases)) {
    if (aliases.some((alias) => normalizeHeader(alias) === normalized)) {
      return {
        raw,
        canonical: canonical as CanonicalHeader,
      };
    }
  }

  return { raw, canonical: null };
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function parseReportDate(value: string | undefined) {
  const normalized = optionalString(value);

  if (!normalized) {
    return null;
  }

  if (/^\d{8}$/.test(normalized)) {
    return dateFromKstDate(
      `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`,
    );
  }

  const dateOnly = normalized.match(/^\d{4}-\d{2}-\d{2}/)?.[0];

  if (dateOnly) {
    return dateFromKstDate(dateOnly);
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateFromKstDate(date: string) {
  return new Date(`${date}T00:00:00.000+09:00`);
}

function optionalString(value: string | undefined) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function optionalReportString(value: string | undefined) {
  const normalized = optionalString(value);
  return normalized && normalized !== "-" ? normalized : null;
}

function optionalNumber(value: string | undefined) {
  if (!value || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value.replaceAll(",", "").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function adgroupKeywordKey(adgroupId: string, keyword: string) {
  return `${adgroupId}\u0000${keyword.trim().toLowerCase()}`;
}

function syntheticReportKeywordId(row: SearchAdReportPerformanceRow) {
  const hash = createHash("sha256")
    .update(
      [
        row.reportType,
        row.campaignId ?? "",
        row.adgroupId ?? "",
        row.keyword?.trim().toLowerCase() ?? "",
      ].join("\u0000"),
    )
    .digest("hex")
    .slice(0, 24);

  return `stat-report:${hash}`;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}
