"use client";

import type { ProductImageStudioMaterialRecord } from "@/features/product-image-studio/domain/materialLibrary";
import { getProductImageStudioSpecItemTypeLabel } from "@/features/product-image-studio/domain/specLibrary";
import { formatMaterialSummary } from "./productImageStudioMaterialPanelModel";
import listStyles from "./ProductImageStudioMaterialList.module.css";
import styles from "./ProductImageStudioMaterialLibrary.module.css";

type ProductImageStudioMaterialListProps = {
  readonly materials: readonly ProductImageStudioMaterialRecord[];
  readonly onEditMaterial: (material: ProductImageStudioMaterialRecord) => void;
  readonly onRemoveMaterial: (materialId: string) => void;
};

export function ProductImageStudioMaterialList({
  materials,
  onEditMaterial,
  onRemoveMaterial,
}: ProductImageStudioMaterialListProps) {
  return (
    <section className={styles.panel} aria-labelledby="saved-materials-heading">
      <div className={styles.listHeader}>
        <div>
          <h2 id="saved-materials-heading">저장된 용지·재질</h2>
          <p>상품별로 자주 쓰는 용지 정보를 빠르게 확인합니다.</p>
        </div>
        <span className={styles.countBadge}>{materials.length}개</span>
      </div>
      {materials.length > 0 ? (
        <ul className={listStyles.materialList}>
          {materials.map((material) => (
            <li className={listStyles.materialCard} key={material.id}>
              <div className={listStyles.materialCardTop}>
                {material.previewImage ? (
                  <img
                    className={listStyles.materialPreviewThumb}
                    alt={material.previewImage.alt}
                    src={material.previewImage.url}
                  />
                ) : (
                  <span
                    aria-label={`${material.colorName} 색상`}
                    className={listStyles.materialSwatch}
                    style={{ background: material.colorHex ?? "#f5f5f5" }}
                  />
                )}
                <div className={styles.specTitle}>
                  <strong className={styles.specName}>{material.name}</strong>
                  <span className={styles.meta}>{formatMaterialSummary(material)}</span>
                </div>
              </div>
              <div className={listStyles.materialTargetList} aria-label="사용할 상품">
                {material.compatibleTargets.map((target) => (
                  <span className={listStyles.targetPill} key={target}>
                    {getProductImageStudioSpecItemTypeLabel(target)}
                  </span>
                ))}
              </div>
              {material.notes ? <p className={styles.meta}>{material.notes}</p> : null}
              <div className={styles.actions}>
                <button className={styles.secondaryButton} onClick={() => onEditMaterial(material)} type="button">
                  수정
                </button>
                <button className={styles.secondaryButton} onClick={() => onRemoveMaterial(material.id)} type="button">
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyText}>저장된 용지·재질이 없습니다.</p>
      )}
    </section>
  );
}
