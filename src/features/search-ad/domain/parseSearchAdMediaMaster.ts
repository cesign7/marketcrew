import crypto from "node:crypto";
import type { SearchAdMediaMasterRow } from "./types";

export const SEARCH_AD_MEDIA_MASTER_PARSER_VERSION = "search-ad-media-master-parser-v1";

export type ParsedSearchAdMediaMaster = {
  checksum: string;
  parserVersion: string;
  rows: SearchAdMediaMasterRow[];
};

const MEDIA_MASTER_COLUMNS = [
  "mediaType",
  "mediaId",
  "mediaName",
  "mediaUrl",
  "naverAdNetwork",
  "portalSite",
  "pcMedia",
  "mobileMedia",
  "searchAdNetwork",
  "contentsAdNetwork",
  "groupId",
  "contractedAt",
  "revokedAt",
] as const;

export function parseSearchAdMediaMaster(rawText: string): ParsedSearchAdMediaMaster {
  const checksum = crypto.createHash("sha256").update(rawText).digest("hex");
  const rows = rawText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .map((line, index) => parseMediaMasterLine(line, index + 1));

  return {
    checksum,
    parserVersion: SEARCH_AD_MEDIA_MASTER_PARSER_VERSION,
    rows,
  };
}

function parseMediaMasterLine(line: string, rowNumber: number): SearchAdMediaMasterRow {
  const values = line.split("\t");
  if (values.length < 3) {
    throw new Error(`SEARCH_AD_MEDIA_MASTER_PARSE_FAILED:expected_at_least=3:actual=${values.length}:row=${rowNumber}`);
  }

  const rawRow = Object.fromEntries(
    MEDIA_MASTER_COLUMNS.map((key, index) => {
      const value = values[index];
      if (isBooleanColumn(key)) {
        return [key, parseBoolean(value)];
      }
      return [key, normalizeString(value) ?? null];
    }),
  ) as Record<string, string | boolean | null>;

  const mediaId = normalizeString(values[1]);
  const mediaName = normalizeString(values[2]);
  if (!mediaId || !mediaName) {
    throw new Error(`SEARCH_AD_MEDIA_MASTER_PARSE_FAILED:missing_media_id_or_name:row=${rowNumber}`);
  }

  return {
    id: `media-master-${mediaId}-${rowNumber}`,
    mediaId,
    mediaType: normalizeString(values[0]) ?? "media",
    mediaName,
    mediaUrl: normalizeString(values[3]),
    naverAdNetwork: parseBoolean(values[4]),
    portalSite: parseBoolean(values[5]),
    pcMedia: parseBoolean(values[6]),
    mobileMedia: parseBoolean(values[7]),
    searchAdNetwork: parseBoolean(values[8]),
    contentsAdNetwork: parseBoolean(values[9]),
    groupId: normalizeString(values[10]),
    contractedAt: normalizeString(values[11]),
    revokedAt: normalizeString(values[12]),
    rawRow,
  };
}

function isBooleanColumn(key: (typeof MEDIA_MASTER_COLUMNS)[number]) {
  return ["naverAdNetwork", "portalSite", "pcMedia", "mobileMedia", "searchAdNetwork", "contentsAdNetwork"].includes(key);
}

function parseBoolean(value: string | undefined) {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }
  if (["true", "1", "y", "yes"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "n", "no"].includes(normalized)) {
    return false;
  }
  return null;
}

function normalizeString(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== "-" ? trimmed : undefined;
}
