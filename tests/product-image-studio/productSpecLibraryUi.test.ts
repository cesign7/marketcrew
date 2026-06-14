import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductImageStudioProductSpecsWorkspacePage } from "@/components/product-image-studio/ProductImageStudioSpecLibrary";
import { createProductImageStudioProductionSettingsPreset } from "@/features/product-image-studio/domain/productionSettingsPresets";
import { manualProductionSettings } from "./manualProductionSettings";

describe("product image studio product spec library UI", () => {
  it("renders saved specs as an independent content library with a creation form", () => {
    const preset = createProductImageStudioProductionSettingsPreset({
      cardFormat: "folded_card",
      createdAt: "2026-06-12T00:00:00.000Z",
      id: "preset-a6-folded",
      name: "A6 접이식 카드 세트",
      settings: manualProductionSettings("folded_card"),
    });

    const html = renderToStaticMarkup(
      createElement(ProductImageStudioProductSpecsWorkspacePage, {
        initialPresets: [preset],
      }),
    );

    expect(html).toContain("상품 규격");
    expect(html).toContain("새 규격");
    expect(html).toContain("규격 이름");
    expect(html).toContain("접이식 카드");
    expect(html).toContain("엽서형 카드");
    expect(html).toContain("접은 카드 가로(mm)");
    expect(html).toContain("봉투 가로(mm)");
    expect(html).toContain("저장된 규격");
    expect(html).toContain("A6 접이식 카드 세트");
    expect(html).toContain("100 x 150mm");
    expect(html).toContain("규격 저장");
    expect(html).not.toContain("규격 저장/불러오기");
  });
});
