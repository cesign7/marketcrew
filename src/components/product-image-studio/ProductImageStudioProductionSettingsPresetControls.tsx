"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  readProductImageStudioProductionSettingsPresetsFromStorage,
} from "@/features/product-image-studio/client/productionSettingsPresetStorage";
import {
  applyProductImageStudioProductionSettingsPreset,
  type ProductImageStudioProductionSettingsPreset,
} from "@/features/product-image-studio/domain/productionSettingsPresets";
import type { ProductImageStudioWizardState } from "@/features/product-image-studio/domain/projectWizard";
import styles from "./ProductImageStudioProductionSettingsPresetControls.module.css";

type MessageTone = "error" | "info" | "success";

type PresetMessage = {
  readonly text: string;
  readonly tone: MessageTone;
};

type ProductImageStudioProductionSettingsPresetControlsProps = {
  readonly setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>;
};

export function ProductImageStudioProductionSettingsPresetControls({
  setState,
}: ProductImageStudioProductionSettingsPresetControlsProps) {
  const [presets, setPresets] = useState<readonly ProductImageStudioProductionSettingsPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [message, setMessage] = useState<PresetMessage>({ text: "저장한 규격이 없습니다.", tone: "info" });
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) ?? null,
    [presets, selectedPresetId],
  );

  useEffect(() => {
    const loadedPresets = readProductImageStudioProductionSettingsPresetsFromStorage(window.localStorage);
    setPresets(loadedPresets);
    setSelectedPresetId(loadedPresets[0]?.id ?? "");
    setMessage(
      loadedPresets.length > 0
        ? { text: "저장된 규격을 불러왔습니다.", tone: "info" }
        : { text: "저장한 규격이 없습니다.", tone: "info" },
    );
  }, []);

  return (
    <section className={styles.toolbar} aria-labelledby="production-settings-preset-heading">
      <div className={styles.heading}>
        <h4 id="production-settings-preset-heading">저장한 규격</h4>
        <p>{presets.length > 0 ? `${presets.length}개 저장됨` : "상품 규격 메뉴에서 저장해 둔 값을 불러옵니다."}</p>
      </div>
      <div className={styles.controls}>
        <label className={styles.selectField}>
          <span>저장된 규격 선택</span>
          <select onChange={(event) => setSelectedPresetId(event.currentTarget.value)} value={selectedPresetId}>
            <option value="">저장된 규격 선택</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
        <button className={styles.primaryButton} disabled={!selectedPreset} onClick={handleApplyPreset} type="button">
          불러오기
        </button>
        <Link className={styles.secondaryButton} href="/product-image-studio/specs" prefetch={false}>
          상품 규격 관리
        </Link>
      </div>
      <p className={styles.message} data-tone={message.tone}>
        {message.text}
      </p>
    </section>
  );

  function handleApplyPreset(): void {
    if (!selectedPreset) {
      setMessage({ text: "불러올 규격을 선택해 주세요.", tone: "error" });
      return;
    }
    setState((current) => applyProductImageStudioProductionSettingsPreset(current, selectedPreset));
    setMessage({ text: "규격을 불러왔습니다.", tone: "success" });
  }
}
