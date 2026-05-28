export type SearchAdAdExtensionEvidence = {
  extensionContentLabel?: string;
  extensionDisplayLabel: string;
  extensionLabel: string;
  extensionShortId?: string;
  extensionType?: string;
  extensionTypeLabel: string;
};

const EXTENSION_TYPE_LABELS: Record<string, string> = {
  BOOKING: "예약",
  DESCRIPTION: "설명 확장",
  DESCRIPTION_EXTRA: "추가 설명",
  HEADLINE: "제목 확장",
  LOCATION: "위치",
  PHONE: "전화",
  PRICE_LINKS: "가격 링크",
  PROMOTION: "프로모션",
  SHOPPING_EXTRA: "쇼핑 부가정보",
  SHOPPING_WEB: "쇼핑 웹사이트",
  SUB_LINKS: "추가 링크",
  TALK: "네이버 톡톡",
  WEBSITE_INFO: "웹사이트 정보",
};

const CONTENT_KEYS = new Set([
  "description",
  "displayText",
  "headline",
  "linkName",
  "linkText",
  "name",
  "phrase",
  "text",
  "title",
]);

export function getSearchAdAdExtensionTypeLabel(type: string | undefined) {
  if (!type) {
    return "확장소재";
  }

  const normalized = type.toUpperCase();
  return EXTENSION_TYPE_LABELS[normalized] ?? type;
}

export function extractSearchAdAdExtensionEvidence(rawPayload: Record<string, unknown> | null | undefined): SearchAdAdExtensionEvidence {
  const extensionType = readString(rawPayload, "type");
  const extensionTypeLabel = getSearchAdAdExtensionTypeLabel(extensionType);
  const payload = parseExtensionPayload(rawPayload?.adExtension);
  const extensionContentLabel = firstReadableContent(payload);
  const extensionShortId = shortExtensionId(readString(rawPayload, "nccAdExtensionId"));
  const extensionLabel = extensionContentLabel ?? extensionTypeLabel;
  const extensionDisplayLabel = extensionContentLabel ? `${extensionTypeLabel} · ${extensionContentLabel}` : extensionShortId ? `${extensionTypeLabel} · ${extensionShortId}` : extensionTypeLabel;

  return {
    ...(extensionContentLabel ? { extensionContentLabel } : {}),
    extensionDisplayLabel,
    extensionLabel,
    ...(extensionShortId ? { extensionShortId } : {}),
    ...(extensionType ? { extensionType } : {}),
    extensionTypeLabel,
  };
}

function parseExtensionPayload(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function firstReadableContent(value: unknown): string | undefined {
  if (typeof value === "string") {
    return cleanReadableText(value);
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const content = firstReadableContent(item);
      if (content) {
        return content;
      }
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const [key, item] of Object.entries(record)) {
    if (!CONTENT_KEYS.has(key)) {
      continue;
    }
    const content = typeof item === "string" ? cleanReadableText(item) : undefined;
    if (content) {
      return content;
    }
  }

  for (const item of Object.values(record)) {
    const content = firstReadableContent(item);
    if (content) {
      return content;
    }
  }

  return undefined;
}

function cleanReadableText(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function shortExtensionId(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/(\d{6,})$/);
  return match ? `고유번호 ${match[1].slice(-6)}` : undefined;
}

function readString(source: unknown, key: string) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
