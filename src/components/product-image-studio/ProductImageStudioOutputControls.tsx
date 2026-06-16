import {
  getProductImageStudioAvailableOutputs,
  getProductImageStudioOutputChoices,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import styles from "./ProductImageStudioOutputControls.module.css";

type ProductImageStudioOutputControlsProps = {
  readonly state: ProductImageStudioWizardState;
};

export function ProductImageStudioOutputControls({ state }: ProductImageStudioOutputControlsProps) {
  const availableOutputs = getProductImageStudioAvailableOutputs(state);
  const availableChoices = getProductImageStudioOutputChoices().filter((choice) =>
    availableOutputs.some((outputType) => outputType === choice.outputType),
  );

  return (
    <section className={styles.optionSection}>
      <div className={styles.sectionTitle}>
        <h3>생성 가능 컷</h3>
        <p>업로드한 디자인 기준으로 가능한 컷만 자동으로 켜집니다.</p>
      </div>
      {availableChoices.length > 0 ? (
        <div className={styles.outputChipList}>
          {availableChoices.map((choice) => (
            <span className={styles.outputChip} key={choice.outputType}>
              {choice.label}
            </span>
          ))}
        </div>
      ) : (
        <p className={styles.emptyText}>카드 규격을 입력하고 카드 이미지만 올려도 카드 단독컷부터 만들 수 있습니다.</p>
      )}
    </section>
  );
}
