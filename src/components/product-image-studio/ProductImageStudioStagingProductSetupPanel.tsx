"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { readProductImageStudioMaterialLibraryFromStorage } from "@/features/product-image-studio/client/materialLibraryStorage";
import { readProductImageStudioSpecLibraryFromStorage } from "@/features/product-image-studio/client/specLibraryStorage";
import type { ProductImageStudioMaterialRecord } from "@/features/product-image-studio/domain/materialLibrary";
import {
  getProductImageStudioSpecItemSummary,
  getProductImageStudioSpecItemTypeLabel,
  type ProductImageStudioSpecItem,
  type ProductImageStudioSpecSet,
} from "@/features/product-image-studio/domain/specLibrary";
import type { ProductImageStudioWizardState } from "@/features/product-image-studio/domain/projectWizard";
import {
  applyProductImageStudioMaterialToStagingState,
  applyProductImageStudioSpecItemToStagingState,
  applyProductImageStudioSpecSetToStagingState,
} from "./productImageStudioStagingProductSetupModel";
import { formatProductImageStudioAiMaterialSummary } from "./productImageStudioAiMaterialSelectionModel";
import styles from "./ProductImageStudioStagingProductSetupPanel.module.css";

type ProductImageStudioStagingProductSetupPanelProps = {
  readonly setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>;
};

type ProductSpecSourceMode = "item" | "set";

type SetupMessage = {
  readonly text: string;
  readonly tone: "error" | "info" | "success";
};

export function ProductImageStudioStagingProductSetupPanel({
  setState,
}: ProductImageStudioStagingProductSetupPanelProps) {
  const [items, setItems] = useState<readonly ProductImageStudioSpecItem[]>([]);
  const [sets, setSets] = useState<readonly ProductImageStudioSpecSet[]>([]);
  const [materials, setMaterials] = useState<readonly ProductImageStudioMaterialRecord[]>([]);
  const [sourceMode, setSourceMode] = useState<ProductSpecSourceMode>("item");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedSetId, setSelectedSetId] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [message, setMessage] = useState<SetupMessage>({
    text: "저장한 상품 규격을 선택하면 실제 mm 값이 적용됩니다.",
    tone: "info",
  });
  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);
  const selectedSet = useMemo(() => sets.find((set) => set.id === selectedSetId) ?? null, [sets, selectedSetId]);
  const selectedMaterial = useMemo(
    () => materials.find((material) => material.id === selectedMaterialId) ?? null,
    [materials, selectedMaterialId],
  );

  useEffect(() => {
    const specLibrary = readProductImageStudioSpecLibraryFromStorage(window.localStorage);
    const storedMaterials = readProductImageStudioMaterialLibraryFromStorage(window.localStorage);
    setItems(specLibrary.items);
    setSets(specLibrary.sets);
    setMaterials(storedMaterials);
    setSelectedItemId(specLibrary.items[0]?.id ?? "");
    setSelectedSetId(specLibrary.sets[0]?.id ?? "");
    setSelectedMaterialId(storedMaterials[0]?.id ?? "");
  }, []);

  return (
    <section className={styles.panel} aria-label="상품 설정">
      <div className={styles.heading}>
        <div>
          <h4>상품 설정</h4>
          <p>상품 규격과 용지 재질을 고른 뒤 디자인을 업로드합니다.</p>
        </div>
        <Link href="/product-image-studio/specs" prefetch={false}>
          상품 규격 관리
        </Link>
      </div>

      <div className={styles.segmented} role="tablist" aria-label="규격 선택 방식">
        <button aria-selected={sourceMode === "item"} onClick={() => setSourceMode("item")} role="tab" type="button">
          개별 규격 상품
        </button>
        <button aria-selected={sourceMode === "set"} onClick={() => setSourceMode("set")} role="tab" type="button">
          세트 규격 상품
        </button>
      </div>

      {sourceMode === "item" ? renderItemControls() : renderSetControls()}
      {renderMaterialControls()}

      <p className={styles.message} data-tone={message.tone}>
        {message.text}
      </p>
    </section>
  );

  function renderItemControls() {
    return (
      <div className={styles.controlRow}>
        <label className={styles.selectField}>
          <span>개별 규격</span>
          <select onChange={(event) => setSelectedItemId(event.currentTarget.value)} value={selectedItemId}>
            <option value="">저장된 개별 규격이 없습니다.</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {getProductImageStudioSpecItemTypeLabel(item.type)} · {getProductImageStudioSpecItemSummary(item)}
              </option>
            ))}
          </select>
        </label>
        <button disabled={!selectedItem} onClick={handleApplyItem} type="button">
          규격 적용
        </button>
      </div>
    );
  }

  function renderSetControls() {
    return (
      <div className={styles.controlRow}>
        <label className={styles.selectField}>
          <span>세트 규격</span>
          <select onChange={(event) => setSelectedSetId(event.currentTarget.value)} value={selectedSetId}>
            <option value="">저장된 세트 규격이 없습니다.</option>
            {sets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name} · {set.itemIds.length}개 구성
              </option>
            ))}
          </select>
        </label>
        <button disabled={!selectedSet} onClick={handleApplySet} type="button">
          세트 적용
        </button>
      </div>
    );
  }

  function renderMaterialControls() {
    return materials.length === 0 ? (
      <div className={styles.emptyState}>
        <div>
          <strong>용지·재질 선택</strong>
          <p>상품 규격 관리에서 용지·재질을 먼저 저장해 주세요.</p>
        </div>
        <Link href="/product-image-studio/specs" prefetch={false}>
          용지·재질 관리로 이동
        </Link>
      </div>
    ) : (
      <div className={styles.controlRow}>
        <label className={styles.selectField}>
          <span>용지·재질 선택</span>
          <select name="stagingMaterial" onChange={(event) => setSelectedMaterialId(event.currentTarget.value)} value={selectedMaterialId}>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name} · {formatProductImageStudioAiMaterialSummary(material)}
              </option>
            ))}
          </select>
        </label>
        <button disabled={!selectedMaterial} onClick={handleApplyMaterial} type="button">
          재질 적용
        </button>
      </div>
    );
  }

  function handleApplyItem(): void {
    if (!selectedItem) {
      setMessage({ text: "적용할 개별 규격을 선택해 주세요.", tone: "error" });
      return;
    }
    setState((current) => applyProductImageStudioSpecItemToStagingState(current, selectedItem));
    setMessage({ text: `${selectedItem.name} 규격을 적용했습니다.`, tone: "success" });
  }

  function handleApplySet(): void {
    if (!selectedSet) {
      setMessage({ text: "적용할 세트 규격을 선택해 주세요.", tone: "error" });
      return;
    }
    setState((current) => applyProductImageStudioSpecSetToStagingState(current, items, selectedSet));
    setMessage({ text: `${selectedSet.name} 세트 규격을 적용했습니다.`, tone: "success" });
  }

  function handleApplyMaterial(): void {
    if (!selectedMaterial) {
      setMessage({ text: "적용할 용지 재질을 선택해 주세요.", tone: "error" });
      return;
    }
    setState((current) => applyProductImageStudioMaterialToStagingState(current, selectedMaterial));
    setMessage({ text: `${selectedMaterial.name} 재질을 적용했습니다.`, tone: "success" });
  }
}
