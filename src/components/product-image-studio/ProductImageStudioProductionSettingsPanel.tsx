import type { Dispatch, SetStateAction } from "react";
import { assertNever } from "@/features/product-image-studio/domain/types";
import {
  applyProductImageStudioSpecPreset,
  buildProductImageStudioValidationChecklist,
  listProductImageStudioSpecPresets,
  PRODUCT_IMAGE_STUDIO_GENERATION_METHOD_OPTIONS,
  PRODUCT_IMAGE_STUDIO_OUTPUT_PURPOSE_OPTIONS,
  PRODUCT_IMAGE_STUDIO_SHOT_ANGLE_OPTIONS,
  type ProductImageStudioCardSpec,
  type ProductImageStudioOutputPurpose,
  type ProductImageStudioProductionSettings,
  type ProductImageStudioSealStickerSpec,
  type ProductImageStudioShotAngle,
} from "@/features/product-image-studio/domain/productionSettings";
import type { ProductImageStudioWizardState } from "@/features/product-image-studio/domain/projectWizard";
import styles from "./ProductImageStudioProductionSettingsPanel.module.css";

type ProductImageStudioProductionSettingsPanelProps = {
  readonly setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>;
  readonly state: ProductImageStudioWizardState;
};

export function ProductImageStudioProductionSettingsPanel({
  setState,
  state,
}: ProductImageStudioProductionSettingsPanelProps) {
  const presets = listProductImageStudioSpecPresets(state.cardFormat);
  const checklist = buildProductImageStudioValidationChecklist(state.productionSettings);

  return (
    <section className={styles.panel} aria-labelledby="production-settings-heading">
      <div className={styles.heading}>
        <div>
          <h3 id="production-settings-heading">상품 사양</h3>
          <p>카드, 봉투, 봉합스티커의 실제 크기를 기준으로 목업 장면을 만듭니다.</p>
        </div>
        <span>{state.productionSettings.scene.designPreservation === "exact_composite" ? "디자인 원본 보존" : "AI 보정 허용"}</span>
      </div>

      <fieldset className={styles.presetGroup}>
        <legend>인쇄물 규격</legend>
        {presets.map((preset) => (
          <label className={preset.id === state.productionSettings.presetId ? styles.selectedPreset : styles.preset} key={preset.id}>
            <input
              checked={preset.id === state.productionSettings.presetId}
              name="productionSpecPreset"
              onChange={() =>
                setState((current) => ({
                  ...current,
                  productionSettings: applyProductImageStudioSpecPreset(
                    current.productionSettings,
                    current.cardFormat,
                    preset.id,
                  ),
                }))
              }
              type="radio"
            />
            <span>{preset.label}</span>
            <small>{preset.summary}</small>
          </label>
        ))}
      </fieldset>

      <dl className={styles.specList}>
        <div>
          <dt>카드</dt>
          <dd>{describeCardSpec(state.productionSettings.card)}</dd>
        </div>
        <div>
          <dt>봉투</dt>
          <dd>{formatSize(state.productionSettings.envelope.sizeMm.width, state.productionSettings.envelope.sizeMm.height)}</dd>
        </div>
        <div>
          <dt>봉합스티커</dt>
          <dd>{describeSealStickerSpec(state.productionSettings.sealSticker)}</dd>
        </div>
      </dl>

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

function readOutputPurpose(value: string): ProductImageStudioOutputPurpose | null {
  return PRODUCT_IMAGE_STUDIO_OUTPUT_PURPOSE_OPTIONS.find((option) => option.value === value)?.value ?? null;
}

function readShotAngle(value: string): ProductImageStudioShotAngle | null {
  return PRODUCT_IMAGE_STUDIO_SHOT_ANGLE_OPTIONS.find((option) => option.value === value)?.value ?? null;
}

function describeCardSpec(card: ProductImageStudioCardSpec): string {
  switch (card.format) {
    case "folded_card":
      return `접은 크기 ${formatSize(card.foldedSizeMm.width, card.foldedSizeMm.height)}, 펼친 크기 ${formatSize(card.openSizeMm.width, card.openSizeMm.height)}`;
    case "postcard_flat":
      return `엽서 크기 ${formatSize(card.sizeMm.width, card.sizeMm.height)}`;
    default:
      return assertNever(card);
  }
}

function describeSealStickerSpec(sealSticker: ProductImageStudioSealStickerSpec): string {
  switch (sealSticker.shape) {
    case "circle":
      return `원형 ${sealSticker.sizeMm.diameter}mm`;
    case "rectangle":
      return `사각 ${formatSize(sealSticker.sizeMm.width, sealSticker.sizeMm.height)}`;
    default:
      return assertNever(sealSticker);
  }
}

function formatSize(width: number, height: number): string {
  return `${width}x${height}mm`;
}
