import {
  getProductImageStudioAvailableOutputs,
  getProductImageStudioOutputChoices,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import styles from "./ProductImageStudioWizard.module.css";

type ProductImageStudioOutputControlsProps = {
  readonly state: ProductImageStudioWizardState;
};

export function ProductImageStudioOutputControls({ state }: ProductImageStudioOutputControlsProps) {
  const availableOutputs = getProductImageStudioAvailableOutputs(state);

  return (
    <section className={styles.optionSection}>
      <div className={styles.sectionTitle}>
        <h3>출력 이미지</h3>
        <p>업로드한 구성품과 입력한 규격 기준으로 만들 수 있는 컷만 준비합니다.</p>
      </div>
      <div className={styles.choiceStack}>
        {getProductImageStudioOutputChoices().map((choice) => (
          <label className={styles.checkChoice} key={choice.outputType}>
            <input
              checked={availableOutputs.some((outputType) => outputType === choice.outputType)}
              disabled
              readOnly
              type="checkbox"
            />
            <span>{choice.label}</span>
          </label>
        ))}
      </div>
      {availableOutputs.length === 0 ? (
        <p className={styles.emptyText}>카드 규격을 입력하고 카드 이미지만 올려도 카드 단독컷부터 만들 수 있습니다.</p>
      ) : null}
    </section>
  );
}
