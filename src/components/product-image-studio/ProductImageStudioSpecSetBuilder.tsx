"use client";

import { Layers3, PackagePlus } from "lucide-react";
import {
  getProductImageStudioSpecItemSummary,
  getProductImageStudioSpecItemTypeLabel,
  type ProductImageStudioSpecItem,
  type ProductImageStudioSpecSet,
} from "@/features/product-image-studio/domain/specLibrary";
import styles from "./ProductImageStudioSpecLibrary.module.css";

type ProductImageStudioSpecSetBuilderProps = {
  readonly items: readonly ProductImageStudioSpecItem[];
  readonly onRemoveSet: (setId: string) => void;
  readonly onSaveSet: (name: string, itemIds: readonly string[]) => void;
  readonly selectedItemIds: readonly string[];
  readonly setName: string;
  readonly sets: readonly ProductImageStudioSpecSet[];
  readonly setSelectedItemIds: (itemIds: readonly string[]) => void;
  readonly setSetName: (name: string) => void;
};

export function ProductImageStudioSpecSetBuilder({
  items,
  onRemoveSet,
  onSaveSet,
  selectedItemIds,
  setName,
  sets,
  setSelectedItemIds,
  setSetName,
}: ProductImageStudioSpecSetBuilderProps) {
  return (
    <div className={styles.setLayout}>
      <section className={styles.panel} aria-labelledby="spec-set-builder-heading">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="spec-set-builder-heading">세트 만들기</h2>
            <p>저장한 개별 규격을 골라 카드+봉투+스티커 같은 세트로 묶습니다.</p>
          </div>
          <span className={styles.iconBadge} aria-hidden="true">
            <PackagePlus size={18} />
          </span>
        </div>

        <label className={styles.field}>
          <span>세트 이름</span>
          <input
            onChange={(event) => setSetName(event.currentTarget.value)}
            placeholder="예: 연하장 카드+봉투+스티커"
            type="text"
            value={setName}
          />
        </label>

        {items.length > 0 ? (
          <div className={styles.pickList} aria-label="세트에 넣을 개별 규격">
            {items.map((item) => (
              <label className={styles.pickItem} key={item.id}>
                <input
                  checked={selectedItemIds.some((itemId) => itemId === item.id)}
                  onChange={() => setSelectedItemIds(toggleSelectedItem(selectedItemIds, item.id))}
                  type="checkbox"
                />
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {getProductImageStudioSpecItemTypeLabel(item.type)} · {getProductImageStudioSpecItemSummary(item)}
                  </small>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>세트로 묶을 개별 규격이 없습니다.</p>
        )}

        <button
          className={styles.primaryButton}
          disabled={items.length === 0}
          onClick={() => onSaveSet(setName, selectedItemIds)}
          type="button"
        >
          세트 저장
        </button>
      </section>

      <section className={styles.panel} aria-labelledby="saved-spec-set-heading">
        <div className={styles.listHeader}>
          <div>
            <h2 id="saved-spec-set-heading">저장된 세트</h2>
            <p>생성 화면에서는 카드가 포함된 세트를 규격으로 불러올 수 있습니다.</p>
          </div>
          <span className={styles.countBadge}>{sets.length}개</span>
        </div>
        {sets.length > 0 ? (
          <ul className={styles.specList}>
            {sets.map((set) => (
              <li className={styles.specItem} key={set.id}>
                <div className={styles.specTop}>
                  <span className={styles.iconBadge} aria-hidden="true">
                    <Layers3 size={17} />
                  </span>
                  <div className={styles.specTitle}>
                    <strong className={styles.specName}>{set.name}</strong>
                    <span className={styles.meta}>{getSetItemLabels(items, set.itemIds).join(" + ")}</span>
                  </div>
                </div>
                <button className={styles.secondaryButton} onClick={() => onRemoveSet(set.id)} type="button">
                  삭제
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyText}>저장된 세트가 없습니다.</p>
        )}
      </section>
    </div>
  );
}

function toggleSelectedItem(selectedItemIds: readonly string[], itemId: string): readonly string[] {
  return selectedItemIds.some((selectedItemId) => selectedItemId === itemId)
    ? selectedItemIds.filter((selectedItemId) => selectedItemId !== itemId)
    : [...selectedItemIds, itemId];
}

function getSetItemLabels(items: readonly ProductImageStudioSpecItem[], itemIds: readonly string[]): readonly string[] {
  const labels: string[] = [];
  for (const itemId of itemIds) {
    const item = items.find((candidate) => candidate.id === itemId);
    if (item) {
      labels.push(getProductImageStudioSpecItemTypeLabel(item.type));
    }
  }
  return labels.length > 0 ? labels : ["연결된 규격 없음"];
}
