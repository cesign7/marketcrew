"use client";

import { Check } from "lucide-react";
import { CompactWorkModal } from "./ProductImageStudioSaasPrimitives";
import styles from "./ProductImageStudioAiToolWorkspace.module.css";

export type ProductImageStudioAiToolOption<Option extends string> = {
  readonly description: string;
  readonly label: string;
  readonly value: Option;
};

type ProductImageStudioAiToolOptionSheetProps<Option extends string> = {
  readonly eyebrow: string;
  readonly onClose: () => void;
  readonly onSelect: (value: Option) => void;
  readonly open: boolean;
  readonly options: readonly ProductImageStudioAiToolOption<Option>[];
  readonly selected: Option;
  readonly title: string;
};

export function ProductImageStudioAiToolOptionSheet<Option extends string>({
  eyebrow,
  onClose,
  onSelect,
  open,
  options,
  selected,
  title,
}: ProductImageStudioAiToolOptionSheetProps<Option>) {
  return (
    <CompactWorkModal description={eyebrow} onClose={onClose} open={open} title={title}>
      <div className={styles.sheetGrid}>
        {options.map((option) => (
          <button
            className={styles.sheetTile}
            data-active={selected === option.value ? "true" : "false"}
            key={option.value}
            onClick={() => onSelect(option.value)}
            type="button"
          >
            <strong>{option.label}</strong>
            <span>{option.description}</span>
            {selected === option.value ? <Check aria-hidden="true" size={18} strokeWidth={2.35} /> : null}
          </button>
        ))}
      </div>
    </CompactWorkModal>
  );
}
