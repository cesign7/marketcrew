"use client";

import { Badge, Briefcase, Mail, PanelTop, RectangleHorizontal, Sticker } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getProductImageStudioSpecItemTypeLabel,
  PRODUCT_IMAGE_STUDIO_SPEC_ITEM_TYPES,
  type ProductImageStudioSpecItemType,
} from "@/features/product-image-studio/domain/specLibrary";
import styles from "./ProductImageStudioSpecTypePicker.module.css";

type ProductImageStudioSpecTypePickerProps = {
  readonly onSelect: (type: ProductImageStudioSpecItemType) => void;
  readonly selectedType: ProductImageStudioSpecItemType;
};

const PRODUCT_SPEC_TYPE_HELPERS: Record<ProductImageStudioSpecItemType, string> = {
  business_card: "명함 앞면과 뒷면 규격",
  envelope: "플랩 형태와 봉투 크기",
  folded_card: "접은 크기와 펼친 크기",
  postcard: "비접이 단면 또는 양면 카드",
  sticker: "원형 또는 사각 스티커",
};

const PRODUCT_SPEC_TYPE_ICONS: Record<ProductImageStudioSpecItemType, LucideIcon> = {
  business_card: Briefcase,
  envelope: Mail,
  folded_card: PanelTop,
  postcard: RectangleHorizontal,
  sticker: Sticker,
};

export function ProductImageStudioSpecTypePicker({
  onSelect,
  selectedType,
}: ProductImageStudioSpecTypePickerProps) {
  return (
    <div className={styles.typeGrid} aria-label="상품 규격 유형">
      {PRODUCT_IMAGE_STUDIO_SPEC_ITEM_TYPES.map((type) => {
        const Icon = PRODUCT_SPEC_TYPE_ICONS[type] ?? Badge;
        const isSelected = type === selectedType;
        return (
          <button
            aria-pressed={isSelected}
            className={isSelected ? styles.selectedTypeCard : styles.typeCard}
            key={type}
            onClick={() => onSelect(type)}
            type="button"
          >
            <span className={styles.typeIcon} aria-hidden="true">
              <Icon size={20} strokeWidth={2} />
            </span>
            <span>
              <strong>{getProductImageStudioSpecItemTypeLabel(type)}</strong>
              <small>{PRODUCT_SPEC_TYPE_HELPERS[type]}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
