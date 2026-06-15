"use client";

import { LockKeyhole, LockKeyholeOpen, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { readProductImageStudioMaterialLibraryFromStorage } from "@/features/product-image-studio/client/materialLibraryStorage";
import type { ProductImageStudioMaterialRecord } from "@/features/product-image-studio/domain/materialLibrary";
import {
  createInitialProductImageStudioAiMaterialSelectionState,
  formatProductImageStudioAiMaterialSummary,
  getProductImageStudioAiMaterialSelectionChoices,
  selectNextProductImageStudioAiMaterial,
  syncProductImageStudioAiMaterialSelectionState,
  toggleProductImageStudioAiMaterialSelectionLock,
  type ProductImageStudioAiMaterialSelectionGroupId,
  type ProductImageStudioAiMaterialSelectionState,
} from "./productImageStudioAiMaterialSelectionModel";
import styles from "./ProductImageStudioAiMaterialSelectionPanel.module.css";

type ProductImageStudioAiMaterialSelectionPanelProps = {
  readonly initialMaterials?: readonly ProductImageStudioMaterialRecord[];
};

export function ProductImageStudioAiMaterialSelectionPanel({
  initialMaterials = [],
}: ProductImageStudioAiMaterialSelectionPanelProps) {
  const [materials, setMaterials] = useState<readonly ProductImageStudioMaterialRecord[]>(initialMaterials);
  const [selectionState, setSelectionState] = useState<ProductImageStudioAiMaterialSelectionState>(() =>
    createInitialProductImageStudioAiMaterialSelectionState(initialMaterials),
  );
  const choices = getProductImageStudioAiMaterialSelectionChoices(materials, selectionState);

  useEffect(() => {
    const storedMaterials = readProductImageStudioMaterialLibraryFromStorage(window.localStorage);
    setMaterials(storedMaterials);
    setSelectionState((current) => syncProductImageStudioAiMaterialSelectionState(storedMaterials, current));
  }, []);

  return (
    <section className={styles.materialSelectionPanel} aria-label="용지·재질 선택">
      <div className={styles.sectionTitle}>
        <h3>용지·재질 선택</h3>
        <p>저장된 용지 후보를 구성품별로 확인합니다.</p>
      </div>

      {choices.length === 0 ? (
        <div className={styles.materialEmptyState}>
          <p>상품 규격 관리에서 용지·재질을 먼저 저장해 주세요.</p>
          <a href="/product-image-studio/specs">용지·재질 관리로 이동</a>
        </div>
      ) : (
        <ul className={styles.materialChoiceList}>
          {choices.map((choice) => (
            <li className={styles.materialChoiceItem} key={choice.groupId}>
              <div className={styles.materialChoiceMain}>
                <span className={styles.materialTargetLabel}>{choice.label}</span>
                <strong>{choice.selectedMaterial?.name ?? "선택된 재질 없음"}</strong>
                {choice.selectedMaterial ? (
                  <small>{formatProductImageStudioAiMaterialSummary(choice.selectedMaterial)}</small>
                ) : (
                  <small>저장된 후보를 다시 확인해 주세요.</small>
                )}
              </div>
              <div className={styles.materialChoiceActions}>
                <button
                  aria-label={`${choice.label} 재질 ${choice.locked ? "고정 해제" : "고정"}`}
                  aria-pressed={choice.locked}
                  className={styles.materialLockButton}
                  onClick={() => handleToggleLock(choice.groupId)}
                  type="button"
                >
                  {choice.locked ? (
                    <LockKeyhole aria-hidden="true" size={15} />
                  ) : (
                    <LockKeyholeOpen aria-hidden="true" size={15} />
                  )}
                  {choice.locked ? "고정됨" : "고정"}
                </button>
                <button
                  aria-label={`${choice.label} 재질 변경`}
                  className={styles.materialSwapButton}
                  disabled={choice.locked || !choice.canSwap}
                  onClick={() => handleSelectNext(choice.groupId)}
                  type="button"
                >
                  <RotateCw aria-hidden="true" size={15} />
                  변경
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  function handleToggleLock(groupId: ProductImageStudioAiMaterialSelectionGroupId): void {
    setSelectionState((current) => toggleProductImageStudioAiMaterialSelectionLock(current, groupId));
  }

  function handleSelectNext(groupId: ProductImageStudioAiMaterialSelectionGroupId): void {
    setSelectionState((current) => selectNextProductImageStudioAiMaterial(materials, current, groupId));
  }
}
