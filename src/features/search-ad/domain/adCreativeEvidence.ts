export type SearchAdProductEvidence = {
  productName?: string;
  productImageUrl?: string;
  mallName?: string;
  mallProductId?: string;
};

export function extractSearchAdProductEvidence(rawPayload: Record<string, unknown> | null | undefined): SearchAdProductEvidence {
  const ad = readObjectValue(rawPayload, "ad");
  const referenceData = readObjectValue(rawPayload, "referenceData");

  return {
    productName:
      readObjectString(ad, "productName") ??
      readObjectString(ad, "productTitle") ??
      readObjectString(referenceData, "productTitle") ??
      readObjectString(referenceData, "productName"),
    productImageUrl:
      readObjectString(referenceData, "imageUrl") ??
      readObjectString(referenceData, "thumbnailUrl") ??
      readObjectString(referenceData, "productImageUrl") ??
      readObjectString(ad, "imageUrl") ??
      readObjectString(ad, "thumbnailUrl"),
    mallName: readObjectString(referenceData, "mallName"),
    mallProductId: readObjectString(referenceData, "mallProductId"),
  };
}

function readObjectValue(source: unknown, key: string) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const value = (source as Record<string, unknown>)[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readObjectString(source: unknown, key: string) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
