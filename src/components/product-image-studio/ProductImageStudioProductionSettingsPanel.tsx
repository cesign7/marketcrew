import type { Dispatch, SetStateAction } from "react";
import {
  buildProductImageStudioValidationChecklist,
  PRODUCT_IMAGE_STUDIO_GENERATION_METHOD_OPTIONS,
  PRODUCT_IMAGE_STUDIO_OUTPUT_PURPOSE_OPTIONS,
  PRODUCT_IMAGE_STUDIO_SHOT_ANGLE_OPTIONS,
  type ProductImageStudioOutputPurpose,
  type ProductImageStudioProductionSettings,
  type ProductImageStudioShotAngle,
} from "@/features/product-image-studio/domain/productionSettings";
import type { ProductImageStudioWizardState } from "@/features/product-image-studio/domain/projectWizard";
import { ProductImageStudioManualSpecFields } from "./ProductImageStudioManualSpecFields";
import { ProductImageStudioProductionSettingsPresetControls } from "./ProductImageStudioProductionSettingsPresetControls";
import styles from "./ProductImageStudioProductionSettingsPanel.module.css";

type ProductImageStudioProductionSettingsPanelProps = {
  readonly setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>;
  readonly state: ProductImageStudioWizardState;
};

export function ProductImageStudioProductionSettingsPanel({
  setState,
  state,
}: ProductImageStudioProductionSettingsPanelProps) {
  const checklist = buildProductImageStudioValidationChecklist(state.productionSettings);

  return (
    <section className={styles.panel} aria-labelledby="production-settings-heading">
      <div className={styles.heading}>
        <div>
          <h3 id="production-settings-heading">상품 사양</h3>
          <p>인쇄물의 실제 mm 규격을 입력하면 업로드한 구성품 기준으로 목업 장면을 만듭니다.</p>
        </div>
        <span>{state.productionSettings.scene.designPreservation === "exact_composite" ? "디자인 원본 보존" : "AI 보정 허용"}</span>
      </div>

      <ProductImageStudioProductionSettingsPresetControls setState={setState} state={state} />

      <ProductImageStudioManualSpecFields setState={setState} state={state} />

      <div className={styles.controlGrid}>
        <label className={styles.selectField}>
          <span>사용 위치</span>
          <select
            onChange={(event) => updateOutputPurpose(event.currentTarget.value, setState)}
            value={state.productionSettings.scene.outputPurpose}
          >
            {PRODUCT_IMAGE_STUDIO_OUTPUT_PURPOSE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.selectField}>
          <span>촬영 구도</span>
          <select
            onChange={(event) => updateShotAngle(event.currentTarget.value, setState)}
            value={state.productionSettings.scene.shotAngle}
          >
            {PRODUCT_IMAGE_STUDIO_SHOT_ANGLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <details className={styles.advancedDisclosure}>
        <summary>
          <span>고급 생성 방식</span>
          <small>{getSelectedGenerationMethodLabel(state.productionSettings)}</small>
        </summary>
        <fieldset className={styles.methodGroup}>
          <legend>생성 방식</legend>
          {PRODUCT_IMAGE_STUDIO_GENERATION_METHOD_OPTIONS.map((option) => (
            <label
              className={option.value === state.productionSettings.scene.generationMethod ? styles.selectedMethod : styles.method}
              key={option.value}
            >
              <input
                checked={option.value === state.productionSettings.scene.generationMethod}
                name="generationMethod"
                onChange={() =>
                  setState((current) => ({
                    ...current,
                    productionSettings: {
                      ...current.productionSettings,
                      scene: { ...current.productionSettings.scene, generationMethod: option.value },
                    },
                  }))
                }
                type="radio"
              />
              <span>{option.label}</span>
              <small>{option.helper}</small>
            </label>
          ))}
        </fieldset>
      </details>

      <section className={styles.checklist} aria-labelledby="production-checklist-heading">
        <h4 id="production-checklist-heading">자동 검수 기준</h4>
        <ul>
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}

function updateOutputPurpose(
  value: string,
  setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>,
): void {
  const outputPurpose = readOutputPurpose(value);
  if (!outputPurpose) {
    return;
  }
  setState((current) => ({ ...current, productionSettings: updateScene(current.productionSettings, { outputPurpose }) }));
}

function updateShotAngle(value: string, setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>): void {
  const shotAngle = readShotAngle(value);
  if (!shotAngle) {
    return;
  }
  setState((current) => ({ ...current, productionSettings: updateScene(current.productionSettings, { shotAngle }) }));
}

function updateScene(
  settings: ProductImageStudioProductionSettings,
  update: Partial<Pick<ProductImageStudioProductionSettings["scene"], "outputPurpose" | "shotAngle">>,
): ProductImageStudioProductionSettings {
  return { ...settings, scene: { ...settings.scene, ...update } };
}

function getSelectedGenerationMethodLabel(settings: ProductImageStudioProductionSettings): string {
  return (
    PRODUCT_IMAGE_STUDIO_GENERATION_METHOD_OPTIONS.find((option) => option.value === settings.scene.generationMethod)
      ?.label ?? "목업 합성 우선"
  );
}

function readOutputPurpose(value: string): ProductImageStudioOutputPurpose | null {
  return PRODUCT_IMAGE_STUDIO_OUTPUT_PURPOSE_OPTIONS.find((option) => option.value === value)?.value ?? null;
}

function readShotAngle(value: string): ProductImageStudioShotAngle | null {
  return PRODUCT_IMAGE_STUDIO_SHOT_ANGLE_OPTIONS.find((option) => option.value === value)?.value ?? null;
}
