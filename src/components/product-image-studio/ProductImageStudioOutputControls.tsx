import { PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES } from "@/features/product-image-studio/domain/types";
import { getProductImageStudioOutputChoices } from "@/features/product-image-studio/domain/projectWizard";
import styles from "./ProductImageStudioWizard.module.css";

export function ProductImageStudioOutputControls() {
  return (
    <section className={styles.optionSection}>
      <div className={styles.sectionTitle}>
        <h3>출력 이미지</h3>
        <p>대표이미지와 상세페이지에 필요한 네 가지 컷을 함께 준비합니다.</p>
      </div>
      <div className={styles.choiceStack}>
        {getProductImageStudioOutputChoices().map((choice) => (
          <label className={styles.checkChoice} key={choice.outputType}>
            <input
              checked={PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES.some((outputType) => outputType === choice.outputType)}
              disabled
              readOnly
              type="checkbox"
            />
            <span>{choice.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
