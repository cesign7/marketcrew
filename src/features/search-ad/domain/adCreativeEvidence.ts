export type SearchAdProductEvidence = {
  productName?: string;
  productImageUrl?: string;
  mallName?: string;
  mallProductId?: string;
  lowPrice?: string;
  mobilePrice?: string;
  priceUnit?: string;
  reviewCountSum?: string;
  purchaseCnt?: string;
  deliveryFee?: string;
  scoreInfo?: string;
  categoryPath?: string;
  mallProductUrl?: string;
  mallProductMobileUrl?: string;
};

export type SearchAdTextEvidence = {
  headline?: string;
  description?: string;
  pcDisplayUrl?: string;
  mobileDisplayUrl?: string;
  adType?: string;
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
    lowPrice: readObjectString(referenceData, "lowPrice"),
    mobilePrice: readObjectString(referenceData, "mobilePrice"),
    priceUnit: readObjectString(referenceData, "priceUnit"),
    reviewCountSum: readObjectString(referenceData, "reviewCountSum"),
    purchaseCnt: readObjectString(referenceData, "purchaseCnt"),
    deliveryFee: readObjectString(referenceData, "dvlryFeeCont"),
    scoreInfo: readObjectString(referenceData, "scoreInfo"),
    categoryPath: readObjectString(referenceData, "fullMallCatNm"),
    mallProductUrl: readObjectString(referenceData, "mallProductUrl"),
    mallProductMobileUrl: readObjectString(referenceData, "mallProdMblUrl"),
  };
}

export function extractSearchAdTextEvidence(rawPayload: Record<string, unknown> | null | undefined): SearchAdTextEvidence {
  const ad = readObjectValue(rawPayload, "ad");
  const pc = readObjectValue(ad, "pc") ?? readObjectValue(rawPayload, "pc");
  const mobile = readObjectValue(ad, "mobile") ?? readObjectValue(rawPayload, "mobile");

  return {
    headline: readObjectString(ad, "headline") ?? readObjectString(rawPayload, "headline") ?? readObjectString(rawPayload, "name"),
    description: readObjectString(ad, "description") ?? readObjectString(rawPayload, "description"),
    pcDisplayUrl: readObjectString(pc, "display") ?? readObjectString(rawPayload, "pcDisplayUrl"),
    mobileDisplayUrl: readObjectString(mobile, "display") ?? readObjectString(rawPayload, "mobileDisplayUrl"),
    adType: readObjectString(rawPayload, "type") ?? readObjectString(rawPayload, "adType") ?? readObjectString(rawPayload, "adTp"),
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
