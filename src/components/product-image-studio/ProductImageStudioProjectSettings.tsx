import type { Dispatch, SetStateAction } from "react";
import {
  changeProductImageStudioCardFormat,
  getProductImageStudioPoseOptions,
  setProductImageStudioProjectName,
  toggleProductImageStudioPose,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import styles from "./ProductImageStudioWizard.module.css";

type ProductImageStudioProjectSettingsProps = {
  readonly setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>;
  readonly state: ProductImageStudioWizardState;
};

export function ProductImageStudioProjectSettings({ setState, state }: ProductImageStudioProjectSettingsProps) {
  return (
    <>
      <label className={styles.field}>
        <span>프로젝트 이름</span>
        <input
          onChange={(event) => setState((current) => setProductImageStudioProjectName(current, event.target.value))}
          placeholder="예: 봄 초대장 세트"
          type="text"
          value={state.projectName}
        />
      </label>

      <fieldset className={styles.segmentGroup}>
        <legend>카드 형식</legend>
        <label className={state.cardFormat === "folded_card" ? styles.selectedSegment : styles.segment}>
          <input
            checked={state.cardFormat === "folded_card"}
            name="cardFormat"
            onChange={() => setState((current) => changeProductImageStudioCardFormat(current, "folded_card"))}
            type="radio"
          />
          <span>접이식 카드</span>
        </label>
        <label className={state.cardFormat === "postcard_flat" ? styles.selectedSegment : styles.segment}>
          <input
            checked={state.cardFormat === "postcard_flat"}
            name="cardFormat"
            onChange={() => setState((current) => changeProductImageStudioCardFormat(current, "postcard_flat"))}
            type="radio"
          />
          <span>엽서형 카드</span>
        </label>
      </fieldset>

      <section className={styles.optionSection} aria-labelledby="pose-heading">
        <div className={styles.sectionTitle}>
          <h3 id="pose-heading">카드 자세</h3>
          <p>카드 형식에 맞는 설정샷 자세를 고릅니다.</p>
        </div>
        <div className={styles.choiceGrid}>
          {getProductImageStudioPoseOptions(state.cardFormat).map((poseOption) => (
            <label className={styles.checkChoice} key={poseOption.pose}>
              <input
                checked={state.selectedCardPoses.some((pose) => pose === poseOption.pose)}
                onChange={() => setState((current) => toggleProductImageStudioPose(current, poseOption.pose))}
                type="checkbox"
              />
              <span>{poseOption.label}</span>
            </label>
          ))}
        </div>
      </section>
    </>
  );
}
