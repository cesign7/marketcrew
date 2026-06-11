import type { ChangeEvent } from "react";
import type { ProductImageStudioAssetRole } from "@/features/product-image-studio/domain/types";
import {
  canUploadProductImageStudioAssetRole,
  getProductImageStudioUploadBlockReason,
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
        <p>규격을 입력한 구성품부터 올릴 수 있습니다. 카드만 올려도 카드 단독컷을 만들 수 있습니다.</p>
      </div>
      <div className={styles.uploadGrid}>
        {getProductImageStudioUploadSlots(state).map((slot) => {
          const blockReason = getProductImageStudioUploadBlockReason(state, slot.role);
          const isDisabled = busyRole !== null || !canUploadProductImageStudioAssetRole(state, slot.role);
          const isUploaded = state.uploadedRoles.some((role) => role === slot.role);
          return (
            <label className={styles.uploadSlot} key={slot.role}>
              <span>
                {slot.label}
                {slot.required ? <em>기본</em> : <small>선택</small>}
              </span>
              <input
                accept="image/png,image/jpeg,image/webp"
                aria-label={`${slot.label} 업로드`}
                className={styles.fileInput}
                disabled={isDisabled}
                onChange={(event) => onUpload(slot.role, event)}
                type="file"
              />
              <strong>{isUploaded ? "업로드 완료" : blockReason ? "입력 필요" : "이미지 선택"}</strong>
              <p>{blockReason ?? slot.helper}</p>
            </label>
          );
        })}
      </div>
    </section>
  );
}
