import type { Dispatch, SetStateAction } from "react";
import type { ProductImageStudioSizeMm } from "@/features/product-image-studio/domain/productionSettings";
import type {
  ProductImageStudioPrintSides,
  ProductImageStudioSpecItemDraft,
} from "@/features/product-image-studio/domain/specLibrary";
import styles from "./ProductImageStudioSpecLibrary.module.css";

export function SizeFields({
  labels,
  onChange,
  size,
}: {
  readonly labels: readonly [string, string];
  readonly onChange: (update: Partial<ProductImageStudioSizeMm>) => void;
  readonly size: ProductImageStudioSizeMm;
}) {
  return (
    <div className={styles.fieldGrid}>
      <NumberField label={labels[0]} onChange={(width) => onChange({ width })} value={size.width} />
      <NumberField label={labels[1]} onChange={(height) => onChange({ height })} value={size.height} />
    </div>
  );
}

export function PaperFields({
  draft,
  onPaperFinishChange,
  onPaperWeightChange,
}: {
  readonly draft: Extract<ProductImageStudioSpecItemDraft, { readonly type: "folded_card" | "postcard" }>;
  readonly onPaperFinishChange: (value: string) => void;
  readonly onPaperWeightChange: (value: number) => void;
}) {
  return (
    <div className={styles.fieldGrid}>
      <label className={styles.field}>
        <span>종이 표면</span>
        <select onChange={(event) => onPaperFinishChange(event.currentTarget.value)} value={draft.paperFinish}>
          <option value="matte">무광</option>
          <option value="glossy">유광</option>
          <option value="textured">질감지</option>
        </select>
      </label>
      <NumberField label="용지 두께(gsm)" onChange={onPaperWeightChange} value={draft.paperWeightGsm} />
    </div>
  );
}

export function SidesField({
  setDraft,
  value,
}: {
  readonly setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>;
  readonly value: ProductImageStudioPrintSides;
}) {
  return (
    <label className={styles.field}>
      <span>인쇄면</span>
      <select onChange={(event) => updateSides(setDraft, event.currentTarget.value)} value={value}>
        <option value="front_back">앞면/뒷면</option>
        <option value="front_only">앞면만</option>
      </select>
    </label>
  );
}

export function NumberField({
  label,
  onChange,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: number) => void;
  readonly value: number;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        inputMode="decimal"
        min="0"
        onChange={(event) => onChange(readNumber(event.currentTarget.value))}
        step="0.1"
        type="number"
        value={value > 0 ? String(value) : ""}
      />
    </label>
  );
}

function updateSides(setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>, value: string): void {
  const sides: ProductImageStudioPrintSides = value === "front_only" ? "front_only" : "front_back";
  setDraft((current) => current.type === "postcard" || current.type === "business_card" ? { ...current, sides } : current);
}

function readNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
