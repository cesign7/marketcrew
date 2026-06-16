"use client";

import {
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_COUNTS,
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_CONTRACTS,
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_LABELS,
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_RATIOS,
  PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_RESOLUTIONS,
  type ProductImageStudioImageGeneratorCount,
  type ProductImageStudioImageGeneratorModelLabel,
  type ProductImageStudioImageGeneratorRatio,
  type ProductImageStudioImageGeneratorResolution,
} from "@/features/product-image-studio/domain/imageGenerator";
import styles from "./ProductImageStudioGenerationOptionControls.module.css";

type ProductImageStudioGenerationOptionControlsProps = {
  readonly count: ProductImageStudioImageGeneratorCount;
  readonly description?: string;
  readonly modelLabel: ProductImageStudioImageGeneratorModelLabel;
  readonly namePrefix?: string;
  readonly onCountChange: (count: ProductImageStudioImageGeneratorCount) => void;
  readonly onModelLabelChange: (modelLabel: ProductImageStudioImageGeneratorModelLabel) => void;
  readonly onRatioChange: (ratio: ProductImageStudioImageGeneratorRatio) => void;
  readonly onResolutionChange: (resolution: ProductImageStudioImageGeneratorResolution) => void;
  readonly ratio: ProductImageStudioImageGeneratorRatio;
  readonly resolution: ProductImageStudioImageGeneratorResolution;
  readonly title?: string;
};

export function ProductImageStudioGenerationOptionControls({
  count,
  description,
  modelLabel,
  namePrefix = "",
  onCountChange,
  onModelLabelChange,
  onRatioChange,
  onResolutionChange,
  ratio,
  resolution,
  title,
}: ProductImageStudioGenerationOptionControlsProps) {
  const countName = getControlName(namePrefix, "count");
  const ratioName = getControlName(namePrefix, "ratio");
  const resolutionName = getControlName(namePrefix, "resolution");

  return (
    <section className={styles.panel} aria-label={title ?? "생성 옵션"}>
      {title ? (
        <div className={styles.header}>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
      ) : null}

      <fieldset className={styles.optionGroup}>
        <legend>모델</legend>
        <div className={styles.segmented}>
          {PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_LABELS.map((option) => (
            <button
              aria-pressed={modelLabel === option}
              className={styles.segmentButton}
              data-selected={modelLabel === option ? "true" : "false"}
              key={option}
              onClick={() => onModelLabelChange(option)}
              type="button"
            >
              {PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_CONTRACTS[option].displayLabel}
            </button>
          ))}
        </div>
      </fieldset>

      <div className={styles.compactGrid}>
        <label className={styles.selectField}>
          <span>개수</span>
          <select name={countName} onChange={(event) => onCountChange(parseCount(event.currentTarget.value, count))} value={count}>
            {PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_COUNTS.map((option) => (
              <option key={option} value={option}>
                {option}장
              </option>
            ))}
          </select>
        </label>
        <RadioGroup label="비율" name={ratioName} options={PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_RATIOS} selected={ratio} onSelect={onRatioChange} />
        <RadioGroup
          label="해상도"
          name={resolutionName}
          options={PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_RESOLUTIONS}
          selected={resolution}
          onSelect={onResolutionChange}
        />
      </div>
    </section>
  );
}

type RadioGroupProps<Option extends string> = {
  readonly label: string;
  readonly name: string;
  readonly onSelect: (option: Option) => void;
  readonly options: readonly Option[];
  readonly selected: Option;
};

function RadioGroup<Option extends string>({ label, name, onSelect, options, selected }: RadioGroupProps<Option>) {
  return (
    <fieldset className={styles.optionGroup}>
      <legend>{label}</legend>
      <div className={styles.segmented}>
        {options.map((option) => (
          <label className={styles.radioSegment} data-selected={selected === option ? "true" : "false"} key={option}>
            <input checked={selected === option} name={name} onChange={() => onSelect(option)} type="radio" value={option} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function parseCount(value: string, fallback: ProductImageStudioImageGeneratorCount): ProductImageStudioImageGeneratorCount {
  const numericValue = Number(value);
  for (const option of PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_COUNTS) {
    if (option === numericValue) {
      return option;
    }
  }
  return fallback;
}

function getControlName(prefix: string, baseName: "count" | "ratio" | "resolution"): string {
  return prefix.length > 0 ? `${prefix}${baseName[0]?.toUpperCase() ?? ""}${baseName.slice(1)}` : baseName;
}
