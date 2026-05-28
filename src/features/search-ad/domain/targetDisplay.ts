import type { SearchAdNormalizedRow, SearchAdReportType, SearchAdRuleActionTarget, SearchAdRuleResult } from "./types";
import { getSearchAdAdExtensionTypeLabel, toSearchAdImageUrl } from "./adExtensionEvidence";

export type SearchAdRuleTargetDescriptor = {
  targetType: SearchAdRuleResult["targetType"];
  targetId?: string;
  targetLabel: string;
  targetTypeLabel: string;
  connectedTargetLabel: string;
  rawTargetId?: string;
  rawTargetCode?: string;
  targetDetailLabel?: string;
};

export type SearchAdExtensionMaterialTone = "default" | "image" | "link" | "promotion" | "shopping-extra" | "talk" | "text";

export type SearchAdExtensionMaterialDisplay = {
  typeLabel: string;
  contentLabel: string;
  tone: SearchAdExtensionMaterialTone;
};

export type SearchAdShoppingAdPreview = {
  productName: string;
  imageUrl?: string;
  mallName?: string;
  highlightLabel: string;
  priceLabel?: string;
  reviewLabel?: string;
  purchaseLabel?: string;
  scoreLabel?: string;
  deliveryLabel?: string;
  categoryLabel?: string;
  landingLabel?: string;
  mallProductId?: string;
  adId?: string;
  basisLabel: string;
};

const RULE_TARGET_TYPE_LABELS: Record<SearchAdRuleResult["targetType"], string> = {
  ad: "광고 소재",
  ad_extension: "확장소재",
  adgroup: "광고그룹",
  campaign: "캠페인",
  criterion: "타게팅",
  keyword: "키워드",
  search_term: "검색어",
};

export function describeSearchAdRuleTarget(row: SearchAdNormalizedRow): SearchAdRuleTargetDescriptor {
  if (isCriterionReport(row.reportType)) {
    const criterionId = row.criterionId ?? identifierLike(row.searchTerm, "grp-") ?? identifierLike(row.keywordText, "grp-");
    const criterion = splitCriterionId(criterionId);
    const connectedTargetLabel = row.adgroupName ?? row.campaignName ?? "연결 대상 확인 필요";

    return {
      targetType: "criterion",
      targetId: criterionId ?? row.adgroupId ?? row.campaignId ?? row.id,
      targetLabel: criterion?.label ? `${connectedTargetLabel} ${criterion.label} 타게팅` : `${connectedTargetLabel} 타게팅`,
      targetTypeLabel: getRuleTargetTypeLabel("criterion"),
      connectedTargetLabel,
      rawTargetId: criterionId,
      rawTargetCode: criterion?.code,
      targetDetailLabel: criterion?.label,
    };
  }

  if (isAdReport(row.reportType)) {
    const adId = row.adId ?? identifierLike(row.searchTerm, "nad-") ?? identifierLike(row.keywordText, "nad-");
    const connectedTargetLabel = row.adgroupName ?? row.campaignName ?? "연결 대상 확인 필요";
    const targetTypeLabel = getAdTargetTypeLabel(row.adProductType);

    return {
      targetType: "ad",
      targetId: adId ?? row.keywordId ?? row.adgroupId ?? row.campaignId ?? row.id,
      targetLabel: `${connectedTargetLabel} ${targetTypeLabel}`,
      targetTypeLabel,
      connectedTargetLabel,
      rawTargetId: adId,
    };
  }

  if (row.reportType === "ADEXTENSION") {
    const extensionId = row.extensionId ?? row.adId;
    const connectedTargetLabel = row.adgroupName ?? row.campaignName ?? "연결 대상 확인 필요";

    return {
      targetType: "ad_extension",
      targetId: extensionId ?? row.keywordId ?? row.adgroupId ?? row.campaignId ?? row.id,
      targetLabel: `${connectedTargetLabel} 확장소재`,
      targetTypeLabel: getRuleTargetTypeLabel("ad_extension"),
      connectedTargetLabel,
      rawTargetId: extensionId,
    };
  }

  const searchTerm = row.searchTerm ?? row.keywordText;
  if (searchTerm) {
    return {
      targetType: "search_term",
      targetId: row.keywordId ?? searchTerm,
      targetLabel: searchTerm,
      targetTypeLabel: getRuleTargetTypeLabel("search_term"),
      connectedTargetLabel: row.adgroupName ?? row.campaignName ?? "연결 대상 확인 필요",
      rawTargetId: row.keywordId,
    };
  }

  if (row.adgroupName || row.adgroupId) {
    return {
      targetType: "adgroup",
      targetId: row.adgroupId ?? row.id,
      targetLabel: row.adgroupName ?? "이름 없는 광고그룹",
      targetTypeLabel: getRuleTargetTypeLabel("adgroup"),
      connectedTargetLabel: row.campaignName ?? "연결 대상 확인 필요",
      rawTargetId: row.adgroupId,
    };
  }

  return {
    targetType: "campaign",
    targetId: row.campaignId ?? row.id,
    targetLabel: row.campaignName ?? "이름 없는 캠페인",
    targetTypeLabel: getRuleTargetTypeLabel("campaign"),
    connectedTargetLabel: row.campaignName ?? "연결 대상 확인 필요",
    rawTargetId: row.campaignId,
  };
}

export function getRuleTargetTypeLabel(targetType: SearchAdRuleResult["targetType"]) {
  return RULE_TARGET_TYPE_LABELS[targetType] ?? "점검 대상";
}

export function getRuleResultDisplayTargetTypeLabel(result: SearchAdRuleResult) {
  const inferredType = inferTechnicalTargetType(result.targetLabel) ?? inferTechnicalTargetType(result.targetId);
  if (inferredType) {
    return inferredType === "ad" ? getAdTargetTypeLabel(result.adProductType) : getRuleTargetTypeLabel(inferredType);
  }

  if (result.targetType === "ad") {
    return getAdTargetTypeLabel(result.adProductType);
  }

  return stringFromEvidence(result.evidencePacket.targetTypeLabel) ?? getRuleTargetTypeLabel(result.targetType);
}

export function getRuleResultDisplayTargetLabel(result: SearchAdRuleResult) {
  const readableTargetLabel = getReadableTargetLabel(result);
  if (readableTargetLabel) {
    return readableTargetLabel;
  }

  if (!isTechnicalTargetIdentifier(result.targetLabel)) {
    return result.targetLabel;
  }

  const connectedTarget = getRuleResultConnectedTarget(result);
  const typeLabel = getRuleResultDisplayTargetTypeLabel(result);
  const detailLabel = getRuleResultTargetDetailLabel(result);
  const suffix = detailLabel ? `${detailLabel} ${typeLabel}` : typeLabel;
  return connectedTarget === "-" ? suffix : `${connectedTarget} ${suffix}`;
}

export function getRuleResultConnectedTarget(result: SearchAdRuleResult) {
  return stringFromEvidence(result.evidencePacket.connectedTargetLabel) ?? stringFromEvidence(result.evidencePacket.adgroupName) ?? stringFromEvidence(result.evidencePacket.campaignName) ?? "-";
}

export function getRuleResultRawTargetId(result: SearchAdRuleResult) {
  return stringFromEvidence(result.evidencePacket.rawTargetId) ?? (isTechnicalTargetIdentifier(result.targetLabel) ? result.targetLabel : undefined) ?? result.targetId;
}

export function getRuleResultSourceReportLabel(result: SearchAdRuleResult) {
  return stringFromEvidence(result.evidencePacket.reportTypeLabel) ?? stringFromEvidence(result.evidencePacket.reportType) ?? "보고서";
}

export function getRuleResultPeriodLabel(result: SearchAdRuleResult) {
  const label = stringFromEvidence(result.evidencePacket.dataCoverageLabel);
  if (label) {
    return label;
  }

  const sourceDate = stringFromEvidence(result.evidencePacket.sourceDate);
  if (sourceDate) {
    return `수집 기준일 ${sourceDate} · 1일 기준 (목표 ${result.periodDays.toLocaleString("ko-KR")}일)`;
  }

  return `규칙 ${result.periodDays}일`;
}

export function getRuleResultTargetDetailLabel(result: SearchAdRuleResult) {
  const evidenceLabel = stringFromEvidence(result.evidencePacket.targetDetailLabel);
  if (evidenceLabel) {
    return evidenceLabel;
  }

  const rawTargetCode = stringFromEvidence(result.evidencePacket.rawTargetCode) ?? rawCodeFromTechnicalId(getRuleResultRawTargetId(result));
  return translateTargetCode(rawTargetCode);
}

export function getRuleResultCreativeLabel(result: SearchAdRuleResult) {
  const label =
    stringFromEvidence(result.evidencePacket.adDisplayLabel) ??
    stringFromEvidence(result.evidencePacket.adHeadline) ??
    stringFromEvidence(result.evidencePacket.adTitle) ??
    stringFromEvidence(result.evidencePacket.adDescription) ??
    stringFromEvidence(result.evidencePacket.creativeLabel);

  return isTechnicalTargetIdentifier(label) ? undefined : label;
}

export function getRuleResultAdLabel(result: SearchAdRuleResult) {
  return result.targetType === "ad" ? getAdTargetTypeLabel(result.adProductType) : undefined;
}

export function getRuleResultShoppingProductId(result: SearchAdRuleResult) {
  return stringFromEvidence(result.evidencePacket.mallProductId) ?? stringFromEvidence(result.evidencePacket.productId);
}

export function getRuleResultShoppingAdPreview(result: SearchAdRuleResult): SearchAdShoppingAdPreview | undefined {
  if (result.adProductType !== "shopping_search" || result.targetType !== "ad") {
    return undefined;
  }

  const productConnection = getRuleResultProductConnection(result);
  if (!productConnection.productName) {
    return undefined;
  }

  const price = stringFromEvidence(result.evidencePacket.lowPrice) ?? stringFromEvidence(result.evidencePacket.mobilePrice);
  const reviewCount = stringFromEvidence(result.evidencePacket.reviewCountSum);
  const purchaseCount = stringFromEvidence(result.evidencePacket.purchaseCnt);
  const score = stringFromEvidence(result.evidencePacket.scoreInfo);
  const deliveryFee = stringFromEvidence(result.evidencePacket.deliveryFee);
  const mallProductId = getRuleResultShoppingProductId(result);

  return {
    productName: productConnection.productName,
    ...(productConnection.imageUrl ? { imageUrl: productConnection.imageUrl } : {}),
    ...(stringFromEvidence(result.evidencePacket.mallName) ? { mallName: stringFromEvidence(result.evidencePacket.mallName) } : {}),
    highlightLabel: getAdTargetTypeLabel(result.adProductType),
    ...(price ? { priceLabel: formatWonText(price) } : {}),
    ...(reviewCount ? { reviewLabel: `리뷰 ${formatCountText(reviewCount)}` } : {}),
    ...(purchaseCount ? { purchaseLabel: `구매 ${formatCountText(purchaseCount)}` } : {}),
    ...(score ? { scoreLabel: `평점 ${score}` } : {}),
    ...(deliveryFee ? { deliveryLabel: Number(deliveryFee) > 0 ? `배송비 ${formatWonText(deliveryFee)}` : "무료배송" } : {}),
    ...(stringFromEvidence(result.evidencePacket.categoryPath) ? { categoryLabel: stringFromEvidence(result.evidencePacket.categoryPath) } : {}),
    ...(productConnection.landingLabel ? { landingLabel: productConnection.landingLabel } : {}),
    ...(mallProductId ? { mallProductId } : {}),
    ...(getRuleResultRawTargetId(result) ? { adId: getRuleResultRawTargetId(result) } : {}),
    basisLabel: "네이버 광고 API 원문 기반 재구성",
  };
}

export function getRuleResultExtensionLabel(result: SearchAdRuleResult) {
  const label =
    stringFromEvidence(result.evidencePacket.extensionDisplayLabel) ??
    stringFromEvidence(result.evidencePacket.extensionLabel) ??
    stringFromEvidence(result.evidencePacket.extensionTypeLabel);

  return sanitizeExtensionLabel(label, result);
}

export function getRuleResultExtensionContentStatusLabel(result: SearchAdRuleResult) {
  if (result.targetType !== "ad_extension" || !isShoppingExtraResult(result)) {
    return undefined;
  }

  const label =
    stringFromEvidence(result.evidencePacket.extensionDisplayLabel) ??
    stringFromEvidence(result.evidencePacket.extensionLabel) ??
    stringFromEvidence(result.evidencePacket.extensionTypeLabel);
  const contentLabel = readableExtensionContentFromLabel(label);

  return contentLabel ? undefined : "세부 항목은 네이버 API 원문에 제공되지 않음";
}

export function getRuleResultExtensionMaterialDisplay(result: SearchAdRuleResult): SearchAdExtensionMaterialDisplay | undefined {
  if (result.targetType !== "ad_extension") {
    return undefined;
  }

  const extensionLabel = getRuleResultExtensionLabel(result);
  const rawTypeLabel =
    stringFromEvidence(result.evidencePacket.extensionType) ??
    firstExtensionLabelPart(stringFromEvidence(result.evidencePacket.extensionTypeLabel)) ??
    firstExtensionLabelPart(stringFromEvidence(result.evidencePacket.extensionDisplayLabel)) ??
    firstExtensionLabelPart(stringFromEvidence(result.evidencePacket.extensionLabel)) ??
    firstExtensionLabelPart(extensionLabel);
  const typeLabel = getSearchAdAdExtensionTypeLabel(rawTypeLabel);
  const contentLabel = getExtensionMaterialContentLabel(extensionLabel, typeLabel) ?? getFallbackExtensionMaterialContentLabel(typeLabel);

  return {
    contentLabel,
    tone: getExtensionMaterialTone(rawTypeLabel, typeLabel),
    typeLabel,
  };
}

export function getRuleResultLandingLabel(result: SearchAdRuleResult) {
  const pcUrl = stringFromEvidence(result.evidencePacket.pcFinalUrl) ?? stringFromEvidence(result.evidencePacket.finalPcUrl);
  const mobileUrl = stringFromEvidence(result.evidencePacket.mobileFinalUrl) ?? stringFromEvidence(result.evidencePacket.finalMobileUrl);
  const finalUrl = stringFromEvidence(result.evidencePacket.finalUrl);

  if (pcUrl && mobileUrl && pcUrl !== mobileUrl) {
    return `PC ${pcUrl} / 모바일 ${mobileUrl}`;
  }

  return pcUrl ?? mobileUrl ?? finalUrl;
}

export function getRuleResultProductConnection(result: SearchAdRuleResult) {
  const productName = nonTechnicalString(
    stringFromEvidence(result.evidencePacket.productName) ??
      stringFromEvidence(result.evidencePacket.productTitle) ??
      stringFromEvidence(result.evidencePacket.adProductName) ??
      stringFromEvidence(result.evidencePacket.adProductTitle) ??
      stringFromEvidence(result.evidencePacket.shoppingProductName) ??
      stringFromEvidence(result.evidencePacket.shoppingProductTitle) ??
      getRuleResultCreativeLabel(result),
  );
  const imageUrl =
    stringFromEvidence(result.evidencePacket.productImageUrl) ??
    stringFromEvidence(result.evidencePacket.imageUrl) ??
    stringFromEvidence(result.evidencePacket.thumbnailUrl) ??
    stringFromEvidence(result.evidencePacket.productThumbnailUrl) ??
    stringFromEvidence(result.evidencePacket.representativeImageUrl) ??
    stringFromEvidence(result.evidencePacket.extensionImageUrl) ??
    toSearchAdImageUrl(stringFromEvidence(result.evidencePacket.extensionImagePath)) ??
    getLegacyExtensionImageUrl(result);
  const landingLabel = getRuleResultLandingLabel(result);

  return {
    ...(productName ? { productName } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(landingLabel ? { landingLabel } : {}),
    hasConnection: Boolean(productName || imageUrl || landingLabel),
  };
}

export function getSearchAdDeviceLabel(device: string | undefined) {
  if (!device) {
    return undefined;
  }

  const normalized = device.toUpperCase();
  if (normalized === "P" || normalized === "PC") {
    return "PC";
  }

  if (normalized === "M" || normalized === "MOBILE") {
    return "모바일";
  }

  return device;
}

export function getRuleResultDetailHref(result: SearchAdRuleResult) {
  return `/rule-results/${encodeURIComponent(result.id)}`;
}

export function getRuleResultActionTarget(result: SearchAdRuleResult): SearchAdRuleActionTarget | undefined {
  const adgroupId = stringFromEvidence(result.evidencePacket.adgroupId) ?? (result.targetType === "adgroup" ? result.targetId : undefined);
  if (adgroupId) {
    return {
      targetType: "adgroup",
      targetId: adgroupId,
      targetLabel:
        stringFromEvidence(result.evidencePacket.adgroupName) ??
        stringFromEvidence(result.evidencePacket.connectedTargetLabel) ??
        getRuleResultDisplayTargetLabel(result),
    };
  }

  const campaignId = stringFromEvidence(result.evidencePacket.campaignId) ?? (result.targetType === "campaign" ? result.targetId : undefined);
  if (campaignId) {
    return {
      targetType: "campaign",
      targetId: campaignId,
      targetLabel: stringFromEvidence(result.evidencePacket.campaignName) ?? getRuleResultDisplayTargetLabel(result),
    };
  }

  return undefined;
}

export function getNormalizedRowDisplayTarget(row: SearchAdNormalizedRow) {
  return describeSearchAdRuleTarget(row).targetLabel;
}

export function isSearchTermReport(reportType: SearchAdReportType) {
  return reportType === "EXPKEYWORD" || reportType === "SHOPPINGKEYWORD_DETAIL" || reportType === "SHOPPINGKEYWORD_CONVERSION_DETAIL";
}

function isCriterionReport(reportType: SearchAdReportType) {
  return reportType === "CRITERION" || reportType === "CRITERION_CONVERSION";
}

function isAdReport(reportType: SearchAdReportType) {
  return reportType === "AD" || reportType === "AD_DETAIL" || reportType === "AD_CONVERSION" || reportType === "AD_CONVERSION_DETAIL";
}

function splitCriterionId(value: string | undefined) {
  if (!value || !value.includes("~")) {
    return undefined;
  }

  const [ownerId, code] = value.split("~");
  return ownerId && code ? { ownerId, code, label: translateTargetCode(code) } : undefined;
}

function identifierLike(value: string | undefined, prefix: string) {
  return value?.startsWith(prefix) ? value : undefined;
}

function stringFromEvidence(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function nonTechnicalString(value: string | undefined) {
  return isTechnicalTargetIdentifier(value) ? undefined : value;
}

function formatWonText(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  return `${numeric.toLocaleString("ko-KR")}원`;
}

function formatCountText(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  return numeric.toLocaleString("ko-KR");
}

function sanitizeExtensionLabel(label: string | undefined, result: SearchAdRuleResult) {
  if (!label || isTechnicalTargetIdentifier(label)) {
    return undefined;
  }

  const extensionType = stringFromEvidence(result.evidencePacket.extensionType);
  const evidenceTypeLabel = stringFromEvidence(result.evidencePacket.extensionTypeLabel);
  const parts = label
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
  const rawTypeLabel = parts[0] ?? evidenceTypeLabel ?? extensionType;
  const typeLabel = getSearchAdAdExtensionTypeLabel(extensionType ?? rawTypeLabel);
  const contentLabel = parts.slice(1).find((part) => isReadableExtensionContent(part));

  if (contentLabel) {
    return `${typeLabel} · ${contentLabel}`;
  }

  if (isImageExtensionLabel(rawTypeLabel) || isImageExtensionLabel(evidenceTypeLabel) || stringFromEvidence(result.evidencePacket.extensionImageUrl)) {
    return `${typeLabel} · 이미지 소재`;
  }

  if (isShoppingExtraExtensionLabel(extensionType) || isShoppingExtraExtensionLabel(rawTypeLabel) || isShoppingExtraExtensionLabel(evidenceTypeLabel)) {
    return `${typeLabel} · 세부 항목 미제공`;
  }

  if (parts.length === 1 && rawTypeLabel) {
    return getSearchAdAdExtensionTypeLabel(rawTypeLabel);
  }

  return rawTypeLabel ? typeLabel : label;
}

function isReadableExtensionContent(value: string) {
  return !isExtensionImagePathLike(value) && !isExtensionShortIdLabel(value) && value !== "세부 항목 미제공" && !isTechnicalTargetIdentifier(value);
}

function isExtensionImagePathLike(value: string) {
  return value.startsWith("/") || /^https?:\/\//i.test(value) || /\.(?:jpe?g|png|gif|webp)(?:\?|$)/i.test(value);
}

function isImageExtensionLabel(value: string | undefined) {
  return value?.toUpperCase() === "POWER_LINK_IMAGE" || value === "파워링크 이미지";
}

function isShoppingExtraExtensionLabel(value: string | undefined) {
  return value?.toUpperCase() === "SHOPPING_EXTRA" || value === "쇼핑 부가정보" || value === "쇼핑 상품 부가 정보";
}

function isExtensionShortIdLabel(value: string) {
  return /^고유번호\s*\d+$/i.test(value.trim());
}

function getLegacyExtensionImageUrl(result: SearchAdRuleResult) {
  const reference =
    extractImageReference(stringFromEvidence(result.evidencePacket.extensionDisplayLabel)) ??
    extractImageReference(stringFromEvidence(result.evidencePacket.extensionLabel));

  return toSearchAdImageUrl(reference);
}

function extractImageReference(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return value.match(/https?:\/\/\S+\.(?:jpe?g|png|gif|webp)(?:\?\S*)?/i)?.[0] ?? value.match(/\/\S+\.(?:jpe?g|png|gif|webp)(?:\?\S*)?/i)?.[0];
}

function getReadableTargetLabel(result: SearchAdRuleResult) {
  if (result.targetType === "ad") {
    const creativeLabel = nonTechnicalString(getRuleResultCreativeLabel(result));
    const adLabel = getRuleResultAdLabel(result);
    return creativeLabel && adLabel ? `${creativeLabel} ${adLabel}` : adLabel;
  }

  if (result.targetType === "ad_extension") {
    const extensionLabel = getRuleResultExtensionLabel(result);
    const ownerLabel =
      nonTechnicalString(stringFromEvidence(result.evidencePacket.productName)) ??
      nonTechnicalString(stringFromEvidence(result.evidencePacket.adDisplayLabel)) ??
      nonTechnicalString(stringFromEvidence(result.evidencePacket.extensionOwnerLabel)) ??
      nonTechnicalString(stringFromEvidence(result.evidencePacket.adHeadline)) ??
      nonTechnicalString(getRuleResultConnectedTarget(result));

    if (extensionLabel && ownerLabel && ownerLabel !== "-") {
      if (extensionLabel.includes(ownerLabel)) {
        return extensionLabel;
      }
      return `${extensionLabel} · ${ownerLabel}`;
    }

    if (extensionLabel) {
      return extensionLabel;
    }

    if (ownerLabel && ownerLabel !== "-") {
      return `${ownerLabel} 확장소재`;
    }
  }

  return undefined;
}

function isShoppingExtraResult(result: SearchAdRuleResult) {
  return (
    isShoppingExtraExtensionLabel(stringFromEvidence(result.evidencePacket.extensionType)) ||
    isShoppingExtraExtensionLabel(stringFromEvidence(result.evidencePacket.extensionTypeLabel)) ||
    isShoppingExtraExtensionLabel(stringFromEvidence(result.evidencePacket.extensionDisplayLabel)?.split("·")[0]?.trim())
  );
}

function readableExtensionContentFromLabel(label: string | undefined) {
  const parts = label
    ?.split("·")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts?.slice(1).find((part) => isReadableExtensionContent(part));
}

function firstExtensionLabelPart(value: string | undefined) {
  return value
    ?.split("·")
    .map((part) => part.trim())
    .find(Boolean);
}

function getExtensionMaterialContentLabel(label: string | undefined, typeLabel: string) {
  const parts = label
    ?.split("·")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts?.length) {
    return undefined;
  }

  const normalizedType = getSearchAdAdExtensionTypeLabel(parts[0]);
  if (normalizedType === typeLabel && parts.length > 1) {
    return parts.slice(1).join(" · ");
  }

  if (parts[0] !== typeLabel) {
    return parts.join(" · ");
  }

  return undefined;
}

function getFallbackExtensionMaterialContentLabel(typeLabel: string) {
  if (typeLabel === "네이버 톡톡") {
    return "톡톡 연결";
  }
  if (typeLabel === "파워링크 이미지") {
    return "이미지 소재";
  }
  if (typeLabel === "이미지 추가 링크") {
    return "이미지 링크";
  }
  if (typeLabel === "프로모션") {
    return "프로모션 문구";
  }
  if (typeLabel === "쇼핑 상품 부가 정보") {
    return "세부 항목 미제공";
  }

  return typeLabel === "확장소재" ? "확장소재 확인 필요" : typeLabel;
}

function getExtensionMaterialTone(rawTypeLabel: string | undefined, typeLabel: string): SearchAdExtensionMaterialTone {
  const normalized = rawTypeLabel?.toUpperCase();
  if (normalized === "SHOPPING_EXTRA" || typeLabel === "쇼핑 상품 부가 정보") {
    return "shopping-extra";
  }
  if (normalized === "PROMOTION" || typeLabel === "프로모션") {
    return "promotion";
  }
  if (normalized === "TALK" || typeLabel === "네이버 톡톡") {
    return "talk";
  }
  if (normalized?.includes("IMAGE") || typeLabel.includes("이미지")) {
    return "image";
  }
  if (normalized?.includes("LINK") || ["가격 링크", "쇼핑 웹사이트", "웹사이트 정보", "추가 링크"].includes(typeLabel)) {
    return "link";
  }
  if (["설명 확장", "제목 확장", "추가 설명"].includes(typeLabel)) {
    return "text";
  }

  return "default";
}

function inferTechnicalTargetType(value: string | undefined): SearchAdRuleResult["targetType"] | undefined {
  if (!value) {
    return undefined;
  }

  if (/^ext-[a-z0-9-]+$/i.test(value)) {
    return "ad_extension";
  }

  if (/^nad-[a-z0-9-]+$/i.test(value)) {
    return "ad";
  }

  if (/^grp-[a-z0-9-]+~[a-z0-9]+$/i.test(value)) {
    return "criterion";
  }

  if (/^nkw-[a-z0-9-]+$/i.test(value)) {
    return "keyword";
  }

  if (/^grp-[a-z0-9-]+$/i.test(value)) {
    return "adgroup";
  }

  if (/^cmp-[a-z0-9-]+$/i.test(value)) {
    return "campaign";
  }

  return undefined;
}

function getAdTargetTypeLabel(adProductType: SearchAdRuleResult["adProductType"] | SearchAdNormalizedRow["adProductType"]) {
  return adProductType === "shopping_search" ? "상품 광고" : getRuleTargetTypeLabel("ad");
}

function isTechnicalTargetIdentifier(value: string | undefined) {
  return Boolean(inferTechnicalTargetType(value));
}

function rawCodeFromTechnicalId(value: string | undefined) {
  return value?.includes("~") ? value.split("~")[1] : undefined;
}

function translateTargetCode(code: string | undefined) {
  if (!code) {
    return undefined;
  }

  const upper = code.toUpperCase();
  if (upper === "GNF") {
    return "여성";
  }
  if (upper === "GNM") {
    return "남성";
  }
  if (upper === "GNU") {
    return "성별 미상";
  }
  if (upper === "AGXXXX") {
    return "연령 미상";
  }
  if (upper === "AD0099") {
    return "연령 전체";
  }

  const ageMatch = upper.match(/^AG(\d{2})(\d{2})$/);
  if (ageMatch) {
    return `${Number(ageMatch[1])}~${Number(ageMatch[2])}세`;
  }

  const scheduleMatch = upper.match(/^SD([A-Z]{3})(\d{2})(\d{2})$/);
  if (scheduleMatch) {
    const dayLabel = DAY_LABELS[scheduleMatch[1]];
    if (dayLabel) {
      return `${dayLabel} ${Number(scheduleMatch[2])}:00~${Number(scheduleMatch[3])}:00`;
    }
  }

  return undefined;
}

const DAY_LABELS: Record<string, string> = {
  MON: "월요일",
  TUE: "화요일",
  WED: "수요일",
  THU: "목요일",
  FRI: "금요일",
  SAT: "토요일",
  SUN: "일요일",
};
