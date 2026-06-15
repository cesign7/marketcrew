"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  getProductImageStudioSpecItemSummary,
  getProductImageStudioSpecItemTypeLabel,
  type ProductImageStudioSpecItem,
  type ProductImageStudioSpecItemDraft,
  type ProductImageStudioSpecItemType,
} from "@/features/product-image-studio/domain/specLibrary";
import { ProductImageStudioSpecItemForm } from "./ProductImageStudioSpecItemForm";
import { ProductImageStudioSpecTypePicker } from "./ProductImageStudioSpecTypePicker";
import styles from "./ProductImageStudioSpecLibrary.module.css";

type ProductImageStudioSpecLibraryMessage = {
  readonly text: string;
  readonly tone: "error" | "info" | "success";
};

type ProductImageStudioIndividualSpecPanelProps = {
  readonly draft: ProductImageStudioSpecItemDraft;
  readonly items: readonly ProductImageStudioSpecItem[];
  readonly message: ProductImageStudioSpecLibraryMessage;
  readonly onRemoveItem: (itemId: string) => void;
  readonly onSaveItem: () => void;
  readonly onSelectType: (type: ProductImageStudioSpecItemType) => void;
  readonly selectedType: ProductImageStudioSpecItemType;
  readonly setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>;
};

export function ProductImageStudioIndividualSpecPanel({
  draft,
  items,
  message,
  onRemoveItem,
  onSaveItem,
  onSelectType,
  selectedType,
  setDraft,
}: ProductImageStudioIndividualSpecPanelProps) {
  return (
    <div className={styles.layout}>
      <section className={styles.panel} aria-labelledby="product-spec-create-heading">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="product-spec-create-heading">아이콘으로 규격 추가</h2>
            <p>먼저 상품을 고르면 필요한 입력값만 표시됩니다.</p>
          </div>
          <span className={styles.countBadge}>{getProductImageStudioSpecItemTypeLabel(selectedType)}</span>
        </div>
        <ProductImageStudioSpecTypePicker onSelect={onSelectType} selectedType={selectedType} />
        <ProductImageStudioSpecItemForm draft={draft} setDraft={setDraft} />
        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={onSaveItem} type="button">
            규격 저장
          </button>
          <p className={styles.message} data-tone={message.tone}>
            {message.text}
          </p>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="product-spec-list-heading">
        <div className={styles.listHeader}>
          <div>
            <h2 id="product-spec-list-heading">저장된 개별 규격</h2>
            <p>세트 규격에서 필요한 항목만 골라 묶습니다.</p>
          </div>
          <span className={styles.countBadge}>{items.length}개</span>
        </div>
        {items.length > 0 ? (
          <ul className={styles.specList}>
            {items.map((item) => (
              <li className={styles.specItem} key={item.id}>
                <div className={styles.specTop}>
                  <div className={styles.specTitle}>
                    <strong className={styles.specName}>{item.name}</strong>
                    <span className={styles.meta}>
                      {getProductImageStudioSpecItemTypeLabel(item.type)} · {getProductImageStudioSpecItemSummary(item)}
                    </span>
                  </div>
                </div>
                <button className={styles.secondaryButton} onClick={() => onRemoveItem(item.id)} type="button">
                  삭제
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyText}>저장된 개별 규격이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
