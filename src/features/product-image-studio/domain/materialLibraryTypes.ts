import type { ProductImageStudioSizeMm } from "@/features/product-image-studio/domain/productionSettings";
import {
  PRODUCT_IMAGE_STUDIO_SPEC_ITEM_TYPES,
  type ProductImageStudioSpecItemType,
} from "@/features/product-image-studio/domain/specLibrary";

export const PRODUCT_IMAGE_STUDIO_MATERIAL_TARGETS = PRODUCT_IMAGE_STUDIO_SPEC_ITEM_TYPES;
export type ProductImageStudioMaterialTarget = ProductImageStudioSpecItemType;

export const PRODUCT_IMAGE_STUDIO_MATERIAL_THICKNESS_UNITS = ["gsm", "mm"] as const;
export type ProductImageStudioMaterialThicknessUnit =
  (typeof PRODUCT_IMAGE_STUDIO_MATERIAL_THICKNESS_UNITS)[number];

export type ProductImageStudioMaterialPreviewImage = {
  readonly alt: string;
  readonly url: string;
};

export type ProductImageStudioMaterialThickness = {
  readonly unit: ProductImageStudioMaterialThicknessUnit;
  readonly value: number;
};

export type ProductImageStudioMaterialRecord = {
  readonly colorHex?: string;
  readonly colorName: string;
  readonly compatibleTargets: readonly ProductImageStudioMaterialTarget[];
  readonly createdAt: string;
  readonly id: string;
  readonly name: string;
  readonly notes?: string;
  readonly previewImage?: ProductImageStudioMaterialPreviewImage;
  readonly sizeMm?: ProductImageStudioSizeMm;
  readonly surface: string;
  readonly thickness: ProductImageStudioMaterialThickness;
};
