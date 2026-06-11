import type { ChangeEvent } from "react";
import type { ProductImageStudioAssetRole } from "@/features/product-image-studio/domain/types";
import {
  getProductImageStudioUploadSlots,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import styles from "./ProductImageStudioWizard.module.css";

type ProductImageStudioUploadSectionProps = {
  readonly busyRole: ProductImageStudioAssetRole | null;
  readonly onUpload: (role: ProductImageStudioAssetRole, event: ChangeEvent<HTMLInputElement>) => void;
  readonly state: ProductImageStudioWizardState;
};

export function ProductImageStudioUploadSection({ busyRole, onUpload, state }: ProductImageStudioUploadSectionProps) {
  return (
    <section className={styles.optionSection} aria-labelledby="upload-heading">
      <div className={styles.sectionTitle}>
        <h3 id="upload-heading">디자인 업로드</h3>
        <p>필수 이미지를 올리면 콘셉트 추천 버튼이 활성화됩니다.</p>
      </div>
      <div className={styles.uploadGrid}>
        {getProductImageStudioUploadSlots(state).map((slot) => (
          <label className={styles.uploadSlot} key={slot.role}>
            <span>
              {slot.label}
              {slot.required ? <em>필수</em> : <small>선택</small>}
            </span>
            <input
              accept="image/png,image/jpeg,image/webp"
              aria-label={`${slot.label} 업로드`}
              className={styles.fileInput}
              disabled={busyRole !== null}
              onChange={(event) => onUpload(slot.role, event)}
              type="file"
            />
            <strong>{state.uploadedRoles.some((role) => role === slot.role) ? "업로드 완료" : "이미지 선택"}</strong>
            <p>{slot.helper}</p>
          </label>
        ))}
      </div>
    </section>
  );
}
