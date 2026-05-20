export interface SearchAdCampaign {
  id: string;
  name: string;
  raw: Record<string, unknown>;
}

export interface SearchAdAdgroup {
  id: string;
  campaignId: string;
  name: string;
  raw: Record<string, unknown>;
}

export interface SearchAdKeyword {
  id: string;
  adgroupId: string;
  campaignId: string;
  keyword: string;
  bidAmount: number | null;
  raw: Record<string, unknown>;
}

export interface SearchAdStat {
  id: string;
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

export function normalizeCampaigns(rows: unknown[]): SearchAdCampaign[] {
  return rows.map((row) => {
    const object = recordFromRow(row);
    const id = requiredString(object, "nccCampaignId");

    return {
      id,
      name: optionalString(object.name) ?? id,
      raw: object,
    };
  });
}

export function normalizeAdgroups(rows: unknown[]): SearchAdAdgroup[] {
  return rows.map((row) => {
    const object = recordFromRow(row);
    const id = requiredString(object, "nccAdgroupId");
    const campaignId = requiredString(object, "nccCampaignId");

    return {
      id,
      campaignId,
      name: optionalString(object.name) ?? id,
      raw: object,
    };
  });
}

export function normalizeKeywords(
  rows: unknown[],
  adgroupCampaignMap: Map<string, string>,
): SearchAdKeyword[] {
  return rows.map((row) => {
    const object = recordFromRow(row);
    const id = requiredString(object, "nccKeywordId");
    const adgroupId = requiredString(object, "nccAdgroupId");
    const campaignId =
      optionalString(object.nccCampaignId) ?? adgroupCampaignMap.get(adgroupId);

    if (!campaignId) {
      throw new Error(`Naver Search Ad row is missing nccCampaignId.`);
    }

    return {
      id,
      adgroupId,
      campaignId,
      keyword: requiredString(object, "keyword"),
      bidAmount: optionalNumber(object.bidAmt),
      raw: object,
    };
  });
}

export function normalizeStats(rows: unknown[]): SearchAdStat[] {
  return rows.map((row) => {
    const object = recordFromRow(row);

    return {
      id: statEntityId(object),
      impressions: optionalNumber(object.impCnt) ?? 0,
      clicks: optionalNumber(object.clkCnt) ?? 0,
      cost: optionalNumber(object.salesAmt) ?? 0,
      ctr: optionalNumber(object.ctr),
      avgCpc: optionalNumber(object.cpc),
      avgRank: optionalNumber(object.avgRnk),
      conversions: optionalNumber(object.ccnt),
      conversionRate: optionalNumber(object.crto),
      conversionSales: optionalNumber(object.convAmt),
      roas: optionalNumber(object.ror),
      costPerConversion: optionalNumber(object.cpConv),
      raw: object,
    };
  });
}

function recordFromRow(row: unknown) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("Naver Search Ad response row must be an object.");
  }

  return row as Record<string, unknown>;
}

function statEntityId(row: Record<string, unknown>) {
  const id =
    optionalString(row.id) ??
    optionalString(row.nccKeywordId) ??
    optionalString(row.nccAdgroupId) ??
    optionalString(row.nccCampaignId);

  if (!id) {
    throw new Error("Naver Search Ad stat row is missing id.");
  }

  return id;
}

function requiredString(row: Record<string, unknown>, field: string) {
  const value = optionalString(row[field]);

  if (!value) {
    throw new Error(`Naver Search Ad row is missing ${field}.`);
  }

  return value;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : null;
}

function optionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}
