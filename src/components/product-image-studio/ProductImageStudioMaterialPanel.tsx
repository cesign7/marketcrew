"use client";

import { useEffect, useState } from "react";
import {
  readProductImageStudioMaterialLibraryFromStorage,
  writeProductImageStudioMaterialLibraryToStorage,
} from "@/features/product-image-studio/client/materialLibraryStorage";
import type { ProductImageStudioMaterialRecord } from "@/features/product-image-studio/domain/materialLibrary";
import { ProductImageStudioMaterialForm } from "./ProductImageStudioMaterialForm";
import { ProductImageStudioMaterialList } from "./ProductImageStudioMaterialList";
import {
  createDefaultMaterialDraft,
  createMaterialDraftFromRecord,
  createMaterialRecordFromDraft,
  upsertMaterialRecord,
  type ProductImageStudioMaterialDraft,
} from "./productImageStudioMaterialPanelModel";
import styles from "./ProductImageStudioMaterialLibrary.module.css";

type ProductImageStudioMaterialPanelProps = {
  readonly initialMaterials?: readonly ProductImageStudioMaterialRecord[];
};

type ProductImageStudioMaterialMessage = {
  readonly text: string;
  readonly tone: "error" | "info" | "success";
};

export function ProductImageStudioMaterialPanel({ initialMaterials = [] }: ProductImageStudioMaterialPanelProps) {
  const [draft, setDraft] = useState<ProductImageStudioMaterialDraft>(createDefaultMaterialDraft);
  const [materials, setMaterials] = useState<readonly ProductImageStudioMaterialRecord[]>(initialMaterials);
  const [message, setMessage] = useState<ProductImageStudioMaterialMessage>({
    text: "자주 쓰는 용지와 재질을 저장해 둡니다.",
    tone: "info",
  });

  useEffect(() => {
    setMaterials(readProductImageStudioMaterialLibraryFromStorage(window.localStorage));
  }, []);

  return (
    <div className={styles.materialLayout}>
      <ProductImageStudioMaterialList
        materials={materials}
        onEditMaterial={handleEditMaterial}
        onRemoveMaterial={handleRemoveMaterial}
      />
      <div className={styles.materialFormStack}>
        <ProductImageStudioMaterialForm
          draft={draft}
          onCancelEdit={handleCancelEdit}
          onSaveMaterial={handleSaveMaterial}
          setDraft={setDraft}
        />
        <p className={styles.message} data-tone={message.tone}>
          {message.text}
        </p>
      </div>
    </div>
  );

  function handleSaveMaterial(): void {
    const material = createMaterialRecordFromDraft(draft, materials);
    if (material.kind === "invalid") {
      setMessage({ text: material.message, tone: "error" });
      return;
    }
    const nextMaterials = upsertMaterialRecord(materials, material.record);
    if (!writeProductImageStudioMaterialLibraryToStorage(window.localStorage, nextMaterials)) {
      setMessage({ text: "브라우저에 재질을 저장하지 못했습니다.", tone: "error" });
      return;
    }
    setMaterials(nextMaterials);
    setDraft(createDefaultMaterialDraft());
    setMessage({ text: "용지·재질을 저장했습니다.", tone: "success" });
  }

  function handleEditMaterial(material: ProductImageStudioMaterialRecord): void {
    setDraft(createMaterialDraftFromRecord(material));
    setMessage({ text: `${material.name} 정보를 수정합니다.`, tone: "info" });
  }

  function handleRemoveMaterial(materialId: string): void {
    const nextMaterials = materials.filter((material) => material.id !== materialId);
    if (!writeProductImageStudioMaterialLibraryToStorage(window.localStorage, nextMaterials)) {
      setMessage({ text: "브라우저에서 용지·재질을 삭제하지 못했습니다.", tone: "error" });
      return;
    }
    setMaterials(nextMaterials);
    if (draft.editingId === materialId) {
      setDraft(createDefaultMaterialDraft());
    }
    setMessage({ text: "용지·재질을 삭제했습니다.", tone: "success" });
  }

  function handleCancelEdit(): void {
    setDraft(createDefaultMaterialDraft());
    setMessage({ text: "새 용지·재질 입력으로 돌아왔습니다.", tone: "info" });
  }
}
