import styles from "./ProductImageStudioProductionSettingsPanel.module.css";

type ProductImageStudioNumberFieldProps = {
  readonly label: string;
  readonly onChange: (value: number) => void;
  readonly value: number;
};

export function ProductImageStudioNumberField({
  label,
  onChange,
  value,
}: ProductImageStudioNumberFieldProps) {
  return (
    <label className={styles.numberField}>
      <span>{label}</span>
      <input
        inputMode="decimal"
        min="0"
        onChange={(event) => onChange(readNumberInput(event.currentTarget.value))}
        step="0.1"
        type="number"
        value={value > 0 ? String(value) : ""}
      />
    </label>
  );
}

function readNumberInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
