"use client";

import { useEffect, useState } from "react";
import { WorkspaceSupportShell } from "@/components/product-image-studio/ProductImageStudioWorkspaceSupportLayout";
import {
  readProductImageStudioProductionSettingsPresetsFromStorage,
  writeProductImageStudioProductionSettingsPresetsToStorage,
} from "@/features/product-image-studio/client/productionSettingsPresetStorage";
import {
  readProductImageStudioSpecLibraryFromStorage,
  writeProductImageStudioSpecLibraryToStorage,
} from "@/features/product-image-studio/client/specLibraryStorage";
import type { ProductImageStudioMaterialRecord } from "@/features/product-image-studio/domain/materialLibrary";
import {
  createDefaultProductImageStudioSpecItemDraft,
  createProductImageStudioSpecItem,
  createProductImageStudioSpecSet,
  getProductImageStudioSpecItemIssue,
  getProductImageStudioSpecItemSummary,
  getProductImageStudioSpecItemTypeLabel,
  removeProductImageStudioSpecItem,
  removeProductImageStudioSpecItemFromSets,
  removeProductImageStudioSpecSet,
  upsertProductImageStudioSpecItem,
  upsertProductImageStudioSpecSet,
  type ProductImageStudioSpecItem,
  type ProductImageStudioSpecItemDraft,
  type ProductImageStudioSpecItemType,
  type ProductImageStudioSpecSet,
} from "@/features/product-image-studio/domain/specLibrary";
import { createProductImageStudioProductionPresetFromSpecSet } from "@/features/product-image-studio/domain/specLibraryToProductionPreset";
import { ProductImageStudioIndividualSpecPanel } from "./ProductImageStudioIndividualSpecPanel";
import { ProductImageStudioMaterialPanel } from "./ProductImageStudioMaterialPanel";
import { ProductImageStudioSpecSetBuilder } from "./ProductImageStudioSpecSetBuilder";
import styles from "./ProductImageStudioSpecLibrary.module.css";

type ProductImageStudioProductSpecsWorkspacePageProps = {
  readonly initialActiveTab?: ProductImageStudioSpecLibraryTab;
  readonly initialItems?: readonly ProductImageStudioSpecItem[];
  readonly initialMaterials?: readonly ProductImageStudioMaterialRecord[];
  readonly initialSets?: readonly ProductImageStudioSpecSet[];
};

type ProductImageStudioSpecLibraryTab = "items" | "sets" | "materials";

type ProductImageStudioSpecLibraryMessage = {
  readonly text: string;
  readonly tone: "error" | "info" | "success";
};

export function ProductImageStudioProductSpecsWorkspacePage({
  initialActiveTab = "items",
  initialItems = [],
  initialMaterials = [],
  initialSets = [],
}: ProductImageStudioProductSpecsWorkspacePageProps) {
  const [activeTab, setActiveTab] = useState<ProductImageStudioSpecLibraryTab>(initialActiveTab);
  const [draft, setDraft] = useState<ProductImageStudioSpecItemDraft>(() => createDefaultProductImageStudioSpecItemDraft("folded_card"));
  const [items, setItems] = useState<readonly ProductImageStudioSpecItem[]>(initialItems);
  const [message, setMessage] = useState<ProductImageStudioSpecLibraryMessage>({
    text: "아이콘을 선택해 필요한 규격만 입력합니다.",
    tone: "info",
  });
  const [selectedItemIds, setSelectedItemIds] = useState<readonly string[]>([]);
  const [setName, setSetName] = useState("");
  const [sets, setSets] = useState<readonly ProductImageStudioSpecSet[]>(initialSets);

  useEffect(() => {
    const storedLibrary = readProductImageStudioSpecLibraryFromStorage(window.localStorage);
    setItems(storedLibrary.items);
    setSets(storedLibrary.sets);
  }, []);

  return (
    <WorkspaceSupportShell
      activePath="/product-image-studio/specs"
      description="개별 인쇄물 규격과 세트, 용지·재질을 로컬 라이브러리로 관리합니다."
      showPrimaryAction={false}
      title="상품 규격"
    >
      <div className={styles.tabBar} role="tablist" aria-label="상품 규격 관리 방식">
        <button aria-selected={activeTab === "items"} onClick={() => setActiveTab("items")} role="tab" type="button">
          개별 규격
        </button>
        <button aria-selected={activeTab === "sets"} onClick={() => setActiveTab("sets")} role="tab" type="button">
          세트 규격
        </button>
        <button
          aria-selected={activeTab === "materials"}
          onClick={() => setActiveTab("materials")}
          role="tab"
          type="button"
        >
          용지·재질
        </button>
      </div>

      {renderActiveTab()}
    </WorkspaceSupportShell>
  );

  function renderActiveTab() {
    switch (activeTab) {
      case "items":
        return (
          <ProductImageStudioIndividualSpecPanel
            draft={draft}
            items={items}
            message={message}
            onRemoveItem={handleRemoveItem}
            onSaveItem={handleSaveItem}
            onSelectType={handleSelectType}
            selectedType={draft.type}
            setDraft={setDraft}
          />
        );
      case "sets":
        return (
          <ProductImageStudioSpecSetBuilder
            items={items}
            onRemoveSet={handleRemoveSet}
            onSaveSet={handleSaveSet}
            selectedItemIds={selectedItemIds}
            setName={setName}
            sets={sets}
            setSelectedItemIds={setSelectedItemIds}
            setSetName={setSetName}
          />
        );
      case "materials":
        return <ProductImageStudioMaterialPanel initialMaterials={initialMaterials} />;
    }
    const unreachableTab: never = activeTab;
    return unreachableTab;
  }

  function handleSelectType(type: ProductImageStudioSpecItemType): void {
    setDraft(createDefaultProductImageStudioSpecItemDraft(type));
    setMessage({ text: `${getProductImageStudioSpecItemTypeLabel(type)} 입력으로 전환했습니다.`, tone: "info" });
  }

  function handleSaveItem(): void {
    const issue = getProductImageStudioSpecItemIssue(draft);
    if (issue) {
      setMessage({ text: issue, tone: "error" });
      return;
    }
    const item = createProductImageStudioSpecItem({ ...draft, createdAt: new Date().toISOString(), id: createId("spec") });
    persistLibrary(upsertProductImageStudioSpecItem(items, item), sets, "개별 규격을 저장했습니다.");
    setDraft(createDefaultProductImageStudioSpecItemDraft(draft.type));
  }

  function handleRemoveItem(itemId: string): void {
    const nextItems = removeProductImageStudioSpecItem(items, itemId);
    const nextSets = removeProductImageStudioSpecItemFromSets(sets, itemId);
    persistLibrary(nextItems, nextSets, "개별 규격을 삭제했습니다.");
    setSelectedItemIds(selectedItemIds.filter((selectedItemId) => selectedItemId !== itemId));
  }

  function handleSaveSet(name: string, itemIds: readonly string[]): void {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setMessage({ text: "세트 이름을 입력해 주세요.", tone: "error" });
      return;
    }
    if (itemIds.length === 0) {
      setMessage({ text: "세트에 넣을 개별 규격을 선택해 주세요.", tone: "error" });
      return;
    }
    const specSet = createProductImageStudioSpecSet({
      createdAt: new Date().toISOString(),
      id: createId("set"),
      itemIds,
      name: trimmedName,
    });
    const nextSets = upsertProductImageStudioSpecSet(sets, specSet);
    persistLibrary(items, nextSets, "세트 규격을 저장했습니다.");
    persistGenerationPreset(specSet);
    setSetName("");
    setSelectedItemIds([]);
  }

  function handleRemoveSet(setId: string): void {
    persistLibrary(items, removeProductImageStudioSpecSet(sets, setId), "세트 규격을 삭제했습니다.");
  }

  function persistLibrary(
    nextItems: readonly ProductImageStudioSpecItem[],
    nextSets: readonly ProductImageStudioSpecSet[],
    successMessage: string,
  ): void {
    if (!writeProductImageStudioSpecLibraryToStorage(window.localStorage, { items: nextItems, sets: nextSets })) {
      setMessage({ text: "브라우저에 규격을 저장하지 못했습니다.", tone: "error" });
      return;
    }
    setItems(nextItems);
    setSets(nextSets);
    setMessage({ text: successMessage, tone: "success" });
  }

  function persistGenerationPreset(specSet: ProductImageStudioSpecSet): void {
    const preset = createProductImageStudioProductionPresetFromSpecSet({
      createdAt: specSet.createdAt,
      id: `preset-${specSet.id}`,
      items,
      set: specSet,
    });
    if (!preset) {
      return;
    }
    const presets = readProductImageStudioProductionSettingsPresetsFromStorage(window.localStorage);
    writeProductImageStudioProductionSettingsPresetsToStorage(window.localStorage, [preset, ...presets]);
  }
}

function createId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now().toString(36)}`;
}
