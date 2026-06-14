"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ProductImageStudioManualSpecFields } from "@/components/product-image-studio/ProductImageStudioManualSpecFields";
import { WorkspaceSupportShell } from "@/components/product-image-studio/ProductImageStudioWorkspaceSupportLayout";
import {
  readProductImageStudioProductionSettingsPresetsFromStorage,
  writeProductImageStudioProductionSettingsPresetsToStorage,
} from "@/features/product-image-studio/client/productionSettingsPresetStorage";
import type {
  ProductImageStudioCardSpec,
  ProductImageStudioProductionSettings,
  ProductImageStudioSealStickerSpec,
  ProductImageStudioSizeMm,
} from "@/features/product-image-studio/domain/productionSettings";
import { parseProductImageStudioProductionSettings } from "@/features/product-image-studio/domain/productionSettings";
import {
  createProductImageStudioProductionSettingsPreset,
  removeProductImageStudioProductionSettingsPreset,
  upsertProductImageStudioProductionSettingsPreset,
  type ProductImageStudioProductionSettingsPreset,
} from "@/features/product-image-studio/domain/productionSettingsPresets";
import {
  changeProductImageStudioCardFormat,
  createInitialProductImageStudioWizardState,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import { assertNever, type CardFormat } from "@/features/product-image-studio/domain/types";
import styles from "./ProductImageStudioSpecLibrary.module.css";

type MessageTone = "error" | "info" | "success";

type ProductImageStudioSpecLibraryMessage = {
  readonly text: string;
  readonly tone: MessageTone;
};

type ProductImageStudioProductSpecsWorkspacePageProps = {
  readonly initialPresets?: readonly ProductImageStudioProductionSettingsPreset[];
};

export function ProductImageStudioProductSpecsWorkspacePage({
  initialPresets = [],
}: ProductImageStudioProductSpecsWorkspacePageProps) {
  const [state, setState] = useState<ProductImageStudioWizardState>(() => createInitialProductImageStudioWizardState());
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<readonly ProductImageStudioProductionSettingsPreset[]>(initialPresets);
  const [message, setMessage] = useState<ProductImageStudioSpecLibraryMessage>({
    text: initialPresets.length > 0 ? "저장된 규격을 불러왔습니다." : "저장된 규격이 없습니다.",
    tone: "info",
  });

  useEffect(() => {
    const loadedPresets = readProductImageStudioProductionSettingsPresetsFromStorage(window.localStorage);
    setPresets(loadedPresets);
    setMessage({
      text: loadedPresets.length > 0 ? "저장된 규격을 불러왔습니다." : "저장된 규격이 없습니다.",
      tone: "info",
    });
  }, []);

  return (
    <WorkspaceSupportShell
      activePath="/product-image-studio/specs"
      description="인쇄물 규격을 공통 자산으로 관리합니다."
      showPrimaryAction={false}
      title="상품 규격"
    >
      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby="product-spec-create-heading">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="product-spec-create-heading">새 규격</h2>
              <p>카드, 봉투, 봉합스티커의 실제 mm 값을 저장합니다.</p>
            </div>
            <span className={styles.countBadge}>{state.cardFormat === "folded_card" ? "접이식" : "엽서형"}</span>
          </div>

          <label className={styles.nameField}>
            <span>규격 이름</span>
            <input
              onChange={(event) => setPresetName(event.currentTarget.value)}
              placeholder="예: A6 접이식 카드 세트"
              type="text"
              value={presetName}
            />
          </label>

          <fieldset className={styles.formatGroup}>
            <legend>카드 형식</legend>
            <div className={styles.formatOptions}>
              <CardFormatOption cardFormat="folded_card" currentFormat={state.cardFormat} setState={setState} />
              <CardFormatOption cardFormat="postcard_flat" currentFormat={state.cardFormat} setState={setState} />
            </div>
          </fieldset>

          <ProductImageStudioManualSpecFields setState={setState} state={state} />

          <div className={styles.actions}>
            <button className={styles.primaryButton} onClick={handleSavePreset} type="button">
              규격 저장
            </button>
            <p className={styles.message} data-tone={message.tone}>
              {message.text}
            </p>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="product-spec-list-heading">
          <div className={styles.listHeader}>
            <div>
              <h2 id="product-spec-list-heading">저장된 규격</h2>
              <p>업로드, 템플릿, AI 도구에서 같은 규격을 다시 사용합니다.</p>
            </div>
            <span className={styles.countBadge}>{presets.length}개</span>
          </div>

          {presets.length > 0 ? (
            <ul className={styles.specList}>
              {presets.map((preset) => (
                <li className={styles.specItem} key={preset.id}>
                  <div className={styles.specTop}>
                    <div className={styles.specTitle}>
                      <strong className={styles.specName}>{preset.name}</strong>
                      <span className={styles.meta}>{formatCreatedAt(preset.createdAt)}</span>
                    </div>
                    <span className={styles.formatBadge}>{getCardFormatLabel(preset.cardFormat)}</span>
                  </div>
                  <SpecDetails settings={preset.settings} />
                  <button className={styles.secondaryButton} onClick={() => handleRemovePreset(preset.id)} type="button">
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyText}>저장된 규격이 없습니다.</p>
          )}
        </section>
      </div>
    </WorkspaceSupportShell>
  );

  function handleSavePreset(): void {
    const name = presetName.trim();
    if (name.length === 0) {
      setMessage({ text: "규격 이름을 입력해 주세요.", tone: "error" });
      return;
    }

    const parsedSettings = parseProductImageStudioProductionSettings(state.productionSettings, state.cardFormat);
    if (!parsedSettings.ok) {
      setMessage({ text: parsedSettings.error.message, tone: "error" });
      return;
    }

    const preset = createProductImageStudioProductionSettingsPreset({
      cardFormat: state.cardFormat,
      createdAt: new Date().toISOString(),
      id: createPresetId(),
      name,
      settings: parsedSettings.settings,
    });
    persistPresets(upsertProductImageStudioProductionSettingsPreset(presets, preset), "규격을 저장했습니다.");
    setPresetName("");
  }

  function handleRemovePreset(presetId: string): void {
    persistPresets(removeProductImageStudioProductionSettingsPreset(presets, presetId), "규격을 삭제했습니다.");
  }

  function persistPresets(nextPresets: readonly ProductImageStudioProductionSettingsPreset[], successMessage: string): void {
    if (!writeProductImageStudioProductionSettingsPresetsToStorage(window.localStorage, nextPresets)) {
      setMessage({ text: "브라우저에 규격을 저장하지 못했습니다.", tone: "error" });
      return;
    }
    setPresets(nextPresets);
    setMessage({ text: nextPresets.length > 0 ? successMessage : "저장된 규격이 없습니다.", tone: "success" });
  }
}

function CardFormatOption({
  cardFormat,
  currentFormat,
  setState,
}: {
  readonly cardFormat: CardFormat;
  readonly currentFormat: CardFormat;
  readonly setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>;
}) {
  const isSelected = cardFormat === currentFormat;
  return (
    <label className={isSelected ? styles.selectedFormatOption : styles.formatOption}>
      <input
        checked={isSelected}
        name="productSpecCardFormat"
        onChange={() => setState((current) => changeProductImageStudioCardFormat(current, cardFormat))}
        type="radio"
      />
      <span>{getCardFormatLabel(cardFormat)}</span>
    </label>
  );
}

function SpecDetails({ settings }: { readonly settings: ProductImageStudioProductionSettings }) {
  return (
    <dl className={styles.specDetails}>
      <div>
        <dt>카드</dt>
        <dd>{formatCardSpec(settings.card)}</dd>
      </div>
      <div>
        <dt>봉투</dt>
        <dd>{formatSizeMm(settings.envelope.sizeMm)}</dd>
      </div>
      <div>
        <dt>스티커</dt>
        <dd>{formatSealStickerSpec(settings.sealSticker)}</dd>
      </div>
    </dl>
  );
}

function formatCardSpec(card: ProductImageStudioCardSpec): string {
  switch (card.format) {
    case "folded_card":
      return `${formatSizeMm(card.foldedSizeMm)} 접힘`;
    case "postcard_flat":
      return formatSizeMm(card.sizeMm);
    default:
      return assertNever(card);
  }
}

function formatSealStickerSpec(sealSticker: ProductImageStudioSealStickerSpec): string {
  return sealSticker.shape === "circle" ? `${sealSticker.sizeMm.diameter}mm 원형` : formatSizeMm(sealSticker.sizeMm);
}

function formatSizeMm(size: ProductImageStudioSizeMm): string {
  return `${size.width} x ${size.height}mm`;
}

function getCardFormatLabel(cardFormat: CardFormat): string {
  switch (cardFormat) {
    case "folded_card":
      return "접이식 카드";
    case "postcard_flat":
      return "엽서형 카드";
    default:
      return assertNever(cardFormat);
  }
}

function formatCreatedAt(createdAt: string): string {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? createdAt : date.toLocaleDateString("ko-KR");
}

function createPresetId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `preset-${Date.now().toString(36)}`;
}
