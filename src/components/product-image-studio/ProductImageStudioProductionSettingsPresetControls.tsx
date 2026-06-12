"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  applyProductImageStudioProductionSettingsPreset,
  createProductImageStudioProductionSettingsPreset,
  removeProductImageStudioProductionSettingsPreset,
  readProductImageStudioProductionSettingsPresets,
  upsertProductImageStudioProductionSettingsPreset,
  type ProductImageStudioProductionSettingsPreset,
} from "@/features/product-image-studio/domain/productionSettingsPresets";
import type { ProductImageStudioWizardState } from "@/features/product-image-studio/domain/projectWizard";
import styles from "./ProductImageStudioProductionSettingsPanel.module.css";

const STORAGE_KEY = "marketcrew.productImageStudio.productionSettingsPresets.v1";

type MessageTone = "error" | "info" | "success";

type PresetMessage = {
  readonly text: string;
  readonly tone: MessageTone;
};

type ProductImageStudioProductionSettingsPresetControlsProps = {
  readonly setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>;
  readonly state: ProductImageStudioWizardState;
};

export function ProductImageStudioProductionSettingsPresetControls({
  setState,
  state,
}: ProductImageStudioProductionSettingsPresetControlsProps) {
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<readonly ProductImageStudioProductionSettingsPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [message, setMessage] = useState<PresetMessage>({ text: "저장한 규격이 없습니다.", tone: "info" });
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) ?? null,
    [presets, selectedPresetId],
  );

  useEffect(() => {
    const loadedPresets = readProductImageStudioProductionSettingsPresets(window.localStorage.getItem(STORAGE_KEY));
    setPresets(loadedPresets);
    setSelectedPresetId(loadedPresets[0]?.id ?? "");
    setMessage(
      loadedPresets.length > 0
        ? { text: "저장된 규격을 불러왔습니다.", tone: "info" }
        : { text: "저장한 규격이 없습니다.", tone: "info" },
    );
  }, []);

  return (
    <section className={styles.presetToolbar} aria-labelledby="production-settings-preset-heading">
      <h4 id="production-settings-preset-heading">저장한 규격</h4>
      <div className={styles.presetForm}>
        <label className={styles.selectField}>
          <span>프리셋 이름</span>
          <input
            onChange={(event) => setPresetName(event.currentTarget.value)}
            placeholder="예: A6 접이식 카드 세트"
            type="text"
            value={presetName}
          />
        </label>
        <button className={styles.presetButton} onClick={handleSavePreset} type="button">
          현재 규격 저장
        </button>
      </div>

      <div className={styles.presetLoadRow}>
        <label className={styles.selectField}>
          <span>저장된 규격</span>
          <select
            onChange={(event) => setSelectedPresetId(event.currentTarget.value)}
            value={selectedPresetId}
          >
            <option value="">저장된 규격 선택</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
        <button className={styles.presetSecondaryButton} disabled={!selectedPreset} onClick={handleApplyPreset} type="button">
          불러오기
        </button>
        <button className={styles.presetDangerButton} disabled={!selectedPreset} onClick={handleRemovePreset} type="button">
          삭제
        </button>
      </div>

      <p className={styles.presetMessage} data-tone={message.tone}>
        {message.text}
      </p>
    </section>
  );

  function handleSavePreset(): void {
    const name = presetName.trim();
    if (name.length === 0) {
      setMessage({ text: "프리셋 이름을 입력해 주세요.", tone: "error" });
      return;
    }

    const preset = createProductImageStudioProductionSettingsPreset({
      cardFormat: state.cardFormat,
      createdAt: new Date().toISOString(),
      id: createPresetId(),
      name,
      settings: state.productionSettings,
    });
    persistPresets(upsertProductImageStudioProductionSettingsPreset(presets, preset), {
      selectedId: preset.id,
      successMessage: "현재 규격을 저장했습니다.",
    });
    setPresetName("");
  }

  function handleApplyPreset(): void {
    if (!selectedPreset) {
      setMessage({ text: "불러올 규격을 선택해 주세요.", tone: "error" });
      return;
    }
    setState((current) => applyProductImageStudioProductionSettingsPreset(current, selectedPreset));
    setMessage({ text: "규격을 불러왔습니다.", tone: "success" });
  }

  function handleRemovePreset(): void {
    if (!selectedPreset) {
      setMessage({ text: "삭제할 규격을 선택해 주세요.", tone: "error" });
      return;
    }
    const nextPresets = removeProductImageStudioProductionSettingsPreset(presets, selectedPreset.id);
    persistPresets(nextPresets, {
      selectedId: nextPresets[0]?.id ?? "",
      successMessage: "저장한 규격을 삭제했습니다.",
    });
  }

  function persistPresets(
    nextPresets: readonly ProductImageStudioProductionSettingsPreset[],
    options: { readonly selectedId: string; readonly successMessage: string },
  ): void {
    if (!writePresetsToStorage(nextPresets)) {
      setMessage({ text: "브라우저에 규격을 저장하지 못했습니다.", tone: "error" });
      return;
    }
    setPresets(nextPresets);
    setSelectedPresetId(options.selectedId);
    setMessage(
      nextPresets.length > 0
        ? { text: options.successMessage, tone: "success" }
        : { text: "저장한 규격이 없습니다.", tone: "info" },
    );
  }
}

function createPresetId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `preset-${Date.now().toString(36)}`;
}

function writePresetsToStorage(presets: readonly ProductImageStudioProductionSettingsPreset[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return true;
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }
    throw error;
  }
}
