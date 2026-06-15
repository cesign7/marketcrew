"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  PRODUCT_IMAGE_STUDIO_MATERIAL_TARGETS,
  PRODUCT_IMAGE_STUDIO_MATERIAL_THICKNESS_UNITS,
} from "@/features/product-image-studio/domain/materialLibrary";
import { getProductImageStudioSpecItemTypeLabel } from "@/features/product-image-studio/domain/specLibrary";
import {
  readMaterialThicknessUnit,
  toggleMaterialTarget,
  type ProductImageStudioMaterialDraft,
} from "./productImageStudioMaterialPanelModel";
import { ProductImageStudioMaterialImageField } from "./ProductImageStudioMaterialImageField";
import styles from "./ProductImageStudioMaterialLibrary.module.css";

type ProductImageStudioMaterialFormProps = {
  readonly draft: ProductImageStudioMaterialDraft;
  readonly onCancelEdit: () => void;
  readonly onSaveMaterial: () => void;
  readonly setDraft: Dispatch<SetStateAction<ProductImageStudioMaterialDraft>>;
};

export function ProductImageStudioMaterialForm({
  draft,
  onCancelEdit,
  onSaveMaterial,
  setDraft,
}: ProductImageStudioMaterialFormProps) {
  return (
    <section className={styles.panel} aria-labelledby="material-form-heading">
      <div className={styles.panelHeader}>
        <div>
          <h2 id="material-form-heading">{draft.editingId ? "용지·재질 수정" : "용지·재질 추가"}</h2>
          <p>이름과 사용 상품만 먼저 고르고, 필요한 세부값은 바로 조정합니다.</p>
        </div>
        <span className={styles.countBadge}>{draft.editingId ? "수정 중" : "새 재질"}</span>
      </div>

      <div className={styles.formStack}>
        <label className={styles.field}>
          <span>재질 이름</span>
          <input
            onChange={(event) => {
              const value = event.currentTarget.value;
              setDraft((current) => ({ ...current, name: value }));
            }}
            placeholder="예: 랑데뷰 내추럴 240g"
            type="text"
            value={draft.name}
          />
        </label>

        <fieldset className={styles.materialFieldset}>
          <legend>사용할 상품</legend>
          <div className={styles.targetGrid}>
            {PRODUCT_IMAGE_STUDIO_MATERIAL_TARGETS.map((target) => (
              <label className={styles.targetChip} key={target}>
                <input
                  checked={draft.compatibleTargets.some((selectedTarget) => selectedTarget === target)}
                  onChange={() =>
                    setDraft((current) => ({
                      ...current,
                      compatibleTargets: toggleMaterialTarget(current.compatibleTargets, target),
                    }))
                  }
                  type="checkbox"
                />
                <span>{getProductImageStudioSpecItemTypeLabel(target)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>표면감</span>
            <input
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDraft((current) => ({ ...current, surface: value }));
              }}
              placeholder="예: 매트, 러프, 유광"
              type="text"
              value={draft.surface}
            />
          </label>
          <label className={styles.field}>
            <span>색상 이름</span>
            <input
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDraft((current) => ({ ...current, colorName: value }));
              }}
              placeholder="예: 내추럴 화이트"
              type="text"
              value={draft.colorName}
            />
          </label>
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>두께 값</span>
            <input
              inputMode="decimal"
              min="0"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDraft((current) => ({ ...current, thicknessValue: value }));
              }}
              step="0.1"
              type="number"
              value={draft.thicknessValue}
            />
          </label>
          <label className={styles.field}>
            <span>두께 단위</span>
            <select
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDraft((current) => ({
                  ...current,
                  thicknessUnit: readMaterialThicknessUnit(value),
                }));
              }}
              value={draft.thicknessUnit}
            >
              {PRODUCT_IMAGE_STUDIO_MATERIAL_THICKNESS_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={styles.field}>
          <span>색상 HEX</span>
          <input
            onChange={(event) => {
              const value = event.currentTarget.value;
              setDraft((current) => ({ ...current, colorHex: value }));
            }}
            placeholder="#F7F1E3"
            type="text"
            value={draft.colorHex}
          />
        </label>

        <ProductImageStudioMaterialImageField draft={draft} setDraft={setDraft} />

        <fieldset className={styles.materialFieldset}>
          <legend>사이즈(선택)</legend>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>가로(mm)</span>
              <input
                inputMode="decimal"
                min="0"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setDraft((current) => ({ ...current, sizeWidth: value }));
                }}
                step="0.1"
                type="number"
                value={draft.sizeWidth}
              />
            </label>
            <label className={styles.field}>
              <span>세로(mm)</span>
              <input
                inputMode="decimal"
                min="0"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setDraft((current) => ({ ...current, sizeHeight: value }));
                }}
                step="0.1"
                type="number"
                value={draft.sizeHeight}
              />
            </label>
          </div>
        </fieldset>

        <label className={styles.field}>
          <span>메모(선택)</span>
          <textarea
            onChange={(event) => {
              const value = event.currentTarget.value;
              setDraft((current) => ({ ...current, notes: value }));
            }}
            placeholder="예: 고급 카드류에 우선 사용"
            rows={3}
            value={draft.notes}
          />
        </label>
      </div>

      <div className={styles.actions}>
        <button className={styles.primaryButton} onClick={onSaveMaterial} type="button">
          재질 저장
        </button>
        {draft.editingId ? (
          <button className={styles.secondaryButton} onClick={onCancelEdit} type="button">
            새 재질
          </button>
        ) : null}
      </div>
    </section>
  );
}
