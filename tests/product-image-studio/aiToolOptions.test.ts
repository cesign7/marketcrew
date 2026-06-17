import { describe, expect, it } from "vitest";
import {
  PRODUCT_IMAGE_STUDIO_AI_TOOL_COUNT_OPTIONS,
  PRODUCT_IMAGE_STUDIO_AI_TOOL_QUALITY_OPTIONS,
  PRODUCT_IMAGE_STUDIO_AI_TOOL_RATIO_OPTIONS,
  readProductImageStudioAiToolSupportedCount,
  readProductImageStudioAiToolSupportedQuality,
  readProductImageStudioAiToolSupportedRatio,
} from "@/components/product-image-studio/ProductImageStudioAiToolWorkspaceOptions";
import {
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_COUNTS,
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_RATIOS,
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_RESOLUTIONS,
} from "@/features/product-image-studio/domain/imageGenerator";

describe("product image studio AI tool option contract", () => {
  it("offers only generator-supported counts, ratios, and resolutions", () => {
    // Given: modal options feed the image-generator request mapper.
    const ratioValues = PRODUCT_IMAGE_STUDIO_AI_TOOL_RATIO_OPTIONS.map((option) => option.value);
    const qualityValues = PRODUCT_IMAGE_STUDIO_AI_TOOL_QUALITY_OPTIONS.map((option) => option.value);

    // Then: the exposed chips match the domain contract instead of later-blocked values.
    expect(PRODUCT_IMAGE_STUDIO_AI_TOOL_COUNT_OPTIONS.every((option) => PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_COUNTS.includes(option))).toBe(true);
    expect(ratioValues.every((option) => PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_RATIOS.includes(option))).toBe(true);
    expect(qualityValues.every((option) => PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_RESOLUTIONS.includes(option))).toBe(true);
    expect(PRODUCT_IMAGE_STUDIO_AI_TOOL_COUNT_OPTIONS).not.toContain(8);
    expect(ratioValues).not.toContain("original");
    expect(qualityValues).not.toContain("4k");
  });

  it("rejects malformed option values through typed option readers", () => {
    // Given: direct option values can arrive outside the rendered chip list.
    const validCount = readProductImageStudioAiToolSupportedCount(3);
    const unsupportedCount = readProductImageStudioAiToolSupportedCount(8);
    const unsupportedRatio = readProductImageStudioAiToolSupportedRatio("original");
    const unsupportedQuality = readProductImageStudioAiToolSupportedQuality("4k");

    // Then: supported values parse and unsupported values do not reach the generator contract.
    expect(validCount).toBe(3);
    expect(unsupportedCount).toBeNull();
    expect(unsupportedRatio).toBeNull();
    expect(unsupportedQuality).toBeNull();
  });
});
