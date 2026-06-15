import { createElement, isValidElement } from "react";
import type { ReactNode, SetStateAction } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductImageStudioProductionSettingsPanel } from "@/components/product-image-studio/ProductImageStudioProductionSettingsPanel";
import { ProductImageStudioProductSpecsWorkspacePage } from "@/components/product-image-studio/ProductImageStudioSpecLibrary";
import {
  createDefaultMaterialDraft,
  type ProductImageStudioMaterialDraft,
} from "@/components/product-image-studio/productImageStudioMaterialPanelModel";
import {
  createProductImageStudioMaterialRecord,
  type ProductImageStudioMaterialRecord,
} from "@/features/product-image-studio/domain/materialLibrary";
import {
  createInitialProductImageStudioWizardState,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";

type MaterialPanelMessage = { readonly text: string; readonly tone: "error" | "info" | "success" };

type SaveMaterialProps = {
  readonly children?: ReactNode;
  readonly onSaveMaterial?: () => void;
};

afterEach(() => {
  vi.doUnmock("react");
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("product image studio material library UI", () => {
  it("renders the material library tab with saved materials and natural Korean form labels", () => {
    // Given: a saved material exists in the local material library.
    const material = createMaterial();

    // When: the specs workspace opens directly on the material tab.
    const html = renderToStaticMarkup(
      createElement(ProductImageStudioProductSpecsWorkspacePage, {
        initialActiveTab: "materials",
        initialMaterials: [material],
      }),
    );

    // Then: the compact CRUD surface renders without bringing back old reusable paper fields.
    expect(html).toContain("용지·재질");
    expect(html).toContain("저장된 용지·재질");
    expect(html).toContain("재질 이름");
    expect(html).toContain("사용할 상품");
    expect(html).toContain("표면감");
    expect(html).toContain("두께 값");
    expect(html).toContain("두께 단위");
    expect(html).toContain("색상 이름");
    expect(html).toContain("색상 HEX");
    expect(html).toContain("재질 이미지(선택)");
    expect(html).toContain("PNG, JPG, WebP");
    expect(html).toContain('accept="image/png,image/jpeg,image/webp"');
    expect(html).toContain("사이즈(선택)");
    expect(html).toContain("메모(선택)");
    expect(html).toContain("엽서(비접이)");
    expect(html).toContain("카드(접이식)");
    expect(html).toContain("봉투");
    expect(html).toContain("스티커");
    expect(html).toContain("명함");
    expect(html).toContain("랑데뷰 내추럴 240g");
    expect(html).toContain('alt="랑데뷰 내추럴 240g 재질 미리보기"');
    expect(html).toContain('src="data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AA/vuUAAA="');
    expect(html).toContain("내추럴 화이트");
    expect(html).toContain("240 gsm");
    expect(html).toContain("100 x 150mm");
    expect(html).toContain("재질 저장");
    expect(html).not.toContain("종이 표면");
    expect(html).not.toContain("용지 두께(gsm)");
  });

  it("keeps paper controls available in manual AI production settings only", () => {
    const manualHtml = renderToStaticMarkup(
      createElement(ProductImageStudioProductionSettingsPanel, {
        setState: ignoreWizardStateUpdate,
        state: createInitialProductImageStudioWizardState(),
      }),
    );

    expect(manualHtml).toContain("종이 표면");
    expect(manualHtml).toContain("용지 두께(gsm)");
  });

  it("shows a browser storage failure message from the material panel save flow", async () => {
    // Given: the material panel has a valid draft, but browser storage rejects the write.
    const draft: ProductImageStudioMaterialDraft = {
      ...createDefaultMaterialDraft(),
      compatibleTargets: ["folded_card"],
      name: "랑데뷰 내추럴 240g",
    };
    let stateCallIndex = 0;
    let savedMessage: MaterialPanelMessage | null = null;
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota exceeded");
        },
      },
    });
    vi.resetModules();
    vi.doMock("react", async (importOriginal) => {
      const original = await importOriginal<typeof import("react")>();
      return {
        ...original,
        useEffect: () => undefined,
        useState: (initialState: MaterialPanelMessage) => {
          stateCallIndex += 1;
          if (stateCallIndex === 1) {
            return [draft, () => undefined] as const;
          }
          if (stateCallIndex === 2) {
            return [[], () => undefined] as const;
          }
          return [
            initialState,
            (update: SetStateAction<MaterialPanelMessage>) => {
              savedMessage = typeof update === "function" ? update(initialState) : update;
            },
          ] as const;
        },
      };
    });
    const { ProductImageStudioMaterialPanel } = await import(
      "@/components/product-image-studio/ProductImageStudioMaterialPanel"
    );

    // When: the save handler runs through the component flow.
    const onSaveMaterial = findSaveMaterialHandler(ProductImageStudioMaterialPanel({}));
    if (!onSaveMaterial) {
      throw new Error("Expected material panel save handler");
    }
    onSaveMaterial();

    // Then: the panel-level message uses the Korean quota/write failure copy.
    expect(savedMessage).toEqual({
      text: "브라우저에 재질을 저장하지 못했습니다.",
      tone: "error",
    });
  });
});

function ignoreWizardStateUpdate(_update: SetStateAction<ProductImageStudioWizardState>): void {}

function createMaterial(): ProductImageStudioMaterialRecord {
  const material = createProductImageStudioMaterialRecord({
    colorHex: "#F7F1E3",
    colorName: "내추럴 화이트",
    compatibleTargets: ["folded_card", "envelope"],
    createdAt: "2026-06-15T00:00:00.000Z",
    id: "material-rendezvous-natural-240",
    name: "랑데뷰 내추럴 240g",
    notes: "고급 인쇄용",
    previewImage: {
      alt: "랑데뷰 내추럴 240g 재질 미리보기",
      url: "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AA/vuUAAA=",
    },
    sizeMm: { height: 150, width: 100 },
    surface: "매트",
    thickness: { unit: "gsm", value: 240 },
  });
  if (!material) {
    throw new Error("Expected valid material fixture");
  }
  return material;
}

function findSaveMaterialHandler(node: ReactNode): (() => void) | null {
  if (!isValidElement<SaveMaterialProps>(node)) {
    return null;
  }
  if (node.props.onSaveMaterial) {
    return node.props.onSaveMaterial;
  }
  const children = node.props.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const handler = findSaveMaterialHandler(child);
      if (handler) {
        return handler;
      }
    }
  }
  return findSaveMaterialHandler(children);
}
