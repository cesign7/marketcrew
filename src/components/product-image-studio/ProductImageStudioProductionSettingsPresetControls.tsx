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
import styles from "./ProductImageStudioProductionSettingsPresetControls.module.css";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
    <>
      <section className={styles.toolbar} aria-labelledby="production-settings-preset-heading">
        <div>
          <h4 id="production-settings-preset-heading">저장한 규격</h4>
          <p>{presets.length > 0 ? `${presets.length}개 저장됨` : "자주 쓰는 규격은 따로 저장해 불러옵니다."}</p>
        </div>
        <button className={styles.primaryButton} onClick={() => setIsDialogOpen(true)} type="button">
          규격 저장/불러오기
        </button>
      </section>

      {isDialogOpen ? (
        <div className={styles.backdrop}>
          <section
            aria-labelledby="production-settings-preset-dialog-heading"
            aria-modal="true"
            className={styles.dialog}
            role="dialog"
          >
            <div className={styles.dialogHeader}>
              <div>
                <h4 id="production-settings-preset-dialog-heading">규격 저장/불러오기</h4>
                <p>현재 입력한 카드, 봉투, 스티커 규격을 저장하거나 기존 규격을 불러옵니다.</p>
              </div>
              <button className={styles.closeButton} onClick={() => setIsDialogOpen(false)} type="button">
                닫기
              </button>
            </div>

            <div className={styles.presetForm}>
              <label className={styles.selectField}>
                <span>저장 이름</span>
                <input
                  onChange={(event) => setPresetName(event.currentTarget.value)}
                  placeholder="예: A6 접이식 카드 세트"
                  type="text"
                  value={presetName}
                />
              </label>
              <button className={styles.primaryButton} onClick={handleSavePreset} type="button">
                현재 규격 저장
              </button>
            </div>

            <div className={styles.presetLoadRow}>
              <label className={styles.selectField}>
                <span>저장된 규격</span>
                <select onChange={(event) => setSelectedPresetId(event.currentTarget.value)} value={selectedPresetId}>
                  <option value="">저장된 규격 선택</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className={styles.secondaryButton} disabled={!selectedPreset} onClick={handleApplyPreset} type="button">
                불러오기
              </button>
              <button className={styles.dangerButton} disabled={!selectedPreset} onClick={handleRemovePreset} type="button">
                삭제
              </button>
            </div>

            <p className={styles.message} data-tone={message.tone}>
              {message.text}
            </p>
          </section>
        </div>
      ) : null}
    </>
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
