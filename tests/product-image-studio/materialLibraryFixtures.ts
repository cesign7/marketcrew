import {
  createProductImageStudioMaterialRecord,
  type ProductImageStudioMaterialRecord,
} from "@/features/product-image-studio/domain/materialLibrary";

export function createTestStorage(initialEntries: readonly (readonly [string, string])[] = []) {
  const entries = new Map<string, string>(initialEntries);
  return {
    entries,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
}

export function createMaterial(
  overrides: Partial<ProductImageStudioMaterialRecord> = {},
): ProductImageStudioMaterialRecord {
  const material = createProductImageStudioMaterialRecord({
    colorHex: "#F4E7D3",
    colorName: "웜 아이보리",
    compatibleTargets: ["postcard", "folded_card"],
    createdAt: "2026-06-15T00:00:00.000Z",
    id: "material-warm-ivory-300",
    name: "웜 아이보리 300gsm",
    notes: "카드와 엽서용",
    previewImage: { alt: "웜 아이보리 종이 질감", url: "data:image/png;base64,iVBORw0KGgo=" },
    sizeMm: { height: 150, width: 100 },
    surface: "matte",
    thickness: { unit: "gsm", value: 300 },
    ...overrides,
  });
  if (!material) {
    throw new Error("Expected valid material fixture");
  }
  return material;
}
