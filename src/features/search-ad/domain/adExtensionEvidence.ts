export type SearchAdAdExtensionEvidence = {
  extensionContentLabel?: string;
  extensionDisplayLabel: string;
  extensionImagePath?: string;
  extensionImageUrl?: string;
  extensionLabel: string;
  extensionShortId?: string;
  extensionType?: string;
  extensionTypeLabel: string;
};

const SEARCH_AD_IMAGE_BASE_URL = "https://searchad-phinf.pstatic.net";

const EXTENSION_TYPE_LABELS: Record<string, string> = {
  BOOKING: "예약",
  DESCRIPTION: "설명 확장",
  DESCRIPTION_EXTRA: "추가 설명",
  HEADLINE: "제목 확장",
  IMAGE_SUB_LINKS: "이미지 추가 링크",
  LOCATION: "위치",
  PHONE: "전화",
  POWER_LINK_IMAGE: "파워링크 이미지",
  PRICE_LINKS: "가격 링크",
  PROMOTION: "프로모션",
  SHOPPING_EXTRA: "쇼핑 상품 부가 정보",
  SHOPPING_WEB: "쇼핑 웹사이트",
  SUB_LINKS: "추가 링크",
  TALK: "네이버 톡톡",
  WEBSITE_INFO: "웹사이트 정보",
};

const EXTENSION_TYPE_LABEL_ALIASES: Record<string, string> = {
  "쇼핑 부가정보": "쇼핑 상품 부가 정보",
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

const IMAGE_REFERENCE_KEYS = new Set(["imagePath", "imageUrl", "mobileImagePath", "mobileImageUrl", "pcImagePath", "pcImageUrl", "thumbnailPath", "thumbnailUrl"]);

export function getSearchAdAdExtensionTypeLabel(type: string | undefined) {
  if (!type) {
    return "확장소재";
  }

  const alias = EXTENSION_TYPE_LABEL_ALIASES[type.trim()];
  if (alias) {
    return alias;
  }

  const normalized = type.toUpperCase();
  return EXTENSION_TYPE_LABELS[normalized] ?? type;
}

export function extractSearchAdAdExtensionEvidence(rawPayload: Record<string, unknown> | null | undefined): SearchAdAdExtensionEvidence {
  const extensionType = readString(rawPayload, "type");
  const extensionTypeLabel = getSearchAdAdExtensionTypeLabel(extensionType);
  const payload = parseExtensionPayload(rawPayload?.adExtension);
  const extensionContentLabel = firstReadableContent(payload);
  const missingContentLabel = isShoppingExtraWithoutPayload(extensionType, payload, extensionContentLabel) ? "세부 항목 미제공" : undefined;
  const extensionImagePath = firstImageReference(payload);
  const extensionImageUrl = toSearchAdImageUrl(extensionImagePath);
  const imageLabel = extensionImageUrl ? buildImageLabel(payload) : undefined;
  const extensionShortId = shortExtensionId(readString(rawPayload, "nccAdExtensionId"));
  const visibleContentLabel = extensionContentLabel ?? missingContentLabel;
  const extensionLabel = visibleContentLabel ?? imageLabel ?? extensionTypeLabel;
  const extensionDisplayLabel = visibleContentLabel
    ? `${extensionTypeLabel} · ${visibleContentLabel}`
    : imageLabel
      ? `${extensionTypeLabel} · ${imageLabel}`
      : extensionTypeLabel;

  return {
    ...(extensionContentLabel ? { extensionContentLabel } : {}),
    extensionDisplayLabel,
    ...(extensionImagePath ? { extensionImagePath } : {}),
    ...(extensionImageUrl ? { extensionImageUrl } : {}),
    extensionLabel,
    ...(extensionShortId ? { extensionShortId } : {}),
    ...(extensionType ? { extensionType } : {}),
    extensionTypeLabel,
  };
}

function isShoppingExtraWithoutPayload(extensionType: string | undefined, payload: unknown, extensionContentLabel: string | undefined) {
  return extensionType?.toUpperCase() === "SHOPPING_EXTRA" && !extensionContentLabel && (payload === null || payload === undefined);
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

function firstImageReference(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const imageReference = firstImageReference(item);
      if (imageReference) {
        return imageReference;
      }
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const [key, item] of Object.entries(record)) {
    if (!IMAGE_REFERENCE_KEYS.has(key) || typeof item !== "string") {
      continue;
    }
    const imageReference = item.trim();
    if (imageReference) {
      return imageReference;
    }
  }

  for (const item of Object.values(record)) {
    const imageReference = firstImageReference(item);
    if (imageReference) {
      return imageReference;
    }
  }

  return undefined;
}

function cleanReadableText(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed) || isImagePathLike(trimmed)) {
    return undefined;
  }

  return trimmed;
}

export function toSearchAdImageUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `${SEARCH_AD_IMAGE_BASE_URL}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function buildImageLabel(payload: unknown) {
  const sizeLabel = readImageSize(payload);
  return sizeLabel ? `이미지 소재 ${sizeLabel}` : "이미지 소재";
}

function readImageSize(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const width = readNumberLike(record.imageWidth);
  const height = readNumberLike(record.imageHeight);
  return width && height ? `${width}x${height}` : undefined;
}

function readNumberLike(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(value);
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return value;
  }

  return undefined;
}

function isImagePathLike(value: string) {
  return value.startsWith("/") || /\.(?:jpe?g|png|gif|webp)(?:\?|$)/i.test(value);
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
