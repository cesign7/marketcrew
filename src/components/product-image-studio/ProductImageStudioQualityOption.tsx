import type { Dispatch, SetStateAction } from "react";
import type { ProductImageStudioQualityMode } from "@/features/product-image-studio/domain/types";
import {
  setProductImageStudioQualityMode,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import styles from "./ProductImageStudioWizard.module.css";

type ProductImageStudioQualityOptionProps = {
  readonly current: ProductImageStudioQualityMode;
  readonly label: string;
  readonly mode: ProductImageStudioQualityMode;
  readonly setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>;
};

export function ProductImageStudioQualityOption({
  current,
  label,
  mode,
  setState,
}: ProductImageStudioQualityOptionProps) {
  return (
    <label className={current === mode ? styles.selectedSegment : styles.segment}>
      <input
        checked={current === mode}
        name="qualityMode"
        onChange={() => setState((state) => setProductImageStudioQualityMode(state, mode))}
        type="radio"
      />
      <span>{label}</span>
    </label>
  );
}
