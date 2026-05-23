import type { ApprovalRequest } from "@/lib/domain";

const DEPRECATED_CROSS_BRAND_APPROVAL_ID_PARTS = ["provider-channel-balance-stickersee-coffeeprint"];
const DEPRECATED_CROSS_BRAND_EXACT_TEXT_PARTS = [
  "스마트스토어/자체몰 매출 균형",
  "스마트스토어와 자체몰의 매출 균형",
];

export function isDeprecatedCrossBrandApprovalId(id: string): boolean {
  return DEPRECATED_CROSS_BRAND_APPROVAL_ID_PARTS.some((part) => id.includes(part));
}

export function containsDeprecatedCrossBrandJudgment(text: string | undefined): boolean {
  if (!text) {
    return false;
  }

  if (DEPRECATED_CROSS_BRAND_APPROVAL_ID_PARTS.some((part) => text.includes(part))) {
    return true;
  }

  if (DEPRECATED_CROSS_BRAND_EXACT_TEXT_PARTS.some((part) => text.includes(part))) {
    return true;
  }

  const compact = text.replace(/\s+/g, "");
  if (compact.includes("스마트스토어/자체몰매출균형") || compact.includes("스마트스토어와자체몰의매출균형")) {
    return true;
  }

  const explicitlySeparatesBrands = /비교하지|묶지\s*않|통합하지|분리|별도|각각|서로 다른 브랜드/.test(text);
  if (explicitlySeparatesBrands) {
    return false;
  }

  const referencesSeparatedBrands =
    compact.includes("스티커씨와커피프린트") ||
    compact.includes("스티커씨/커피프린트") ||
    compact.includes("스마트스토어와자체몰") ||
    compact.includes("스마트스토어/자체몰");
  const comparesOrMergesBrands = /비교|균형|통합|밸런스|balance|channel-balance/i.test(text);

  return referencesSeparatedBrands && comparesOrMergesBrands;
}

export function isDeprecatedCrossBrandApproval(
  approval: Pick<ApprovalRequest, "id" | "title" | "evidenceSummary">,
): boolean {
  return (
    isDeprecatedCrossBrandApprovalId(approval.id) ||
    containsDeprecatedCrossBrandJudgment(approval.title) ||
    containsDeprecatedCrossBrandJudgment(approval.evidenceSummary)
  );
}

export function filterActiveApprovalRequests<TApproval extends Pick<ApprovalRequest, "id" | "title" | "evidenceSummary">>(
  approvalRequests: TApproval[],
): TApproval[] {
  return approvalRequests.filter((approval) => !isDeprecatedCrossBrandApproval(approval));
}
