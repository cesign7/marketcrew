import type { Dispatch, SetStateAction } from "react";
import type {
  ProductImageStudioCardSpec,
  ProductImageStudioProductionSettings,
  ProductImageStudioSizeMm,
} from "@/features/product-image-studio/domain/productionSettings";
import type { ProductImageStudioWizardState } from "@/features/product-image-studio/domain/projectWizard";
import { ProductImageStudioSealStickerFields } from "./ProductImageStudioSealStickerFields";
import { ProductImageStudioNumberField } from "./ProductImageStudioSpecFieldControls";
import styles from "./ProductImageStudioProductionSettingsPanel.module.css";

type ProductImageStudioManualSpecFieldsProps = {
  readonly setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>;
  readonly state: ProductImageStudioWizardState;
};

export function ProductImageStudioManualSpecFields({
  setState,
  state,
}: ProductImageStudioManualSpecFieldsProps) {
  const settings = state.productionSettings;

  return (
    <div className={styles.manualSpecGrid}>
      <section className={styles.specGroup} aria-label="카드 규격 입력">
        <h4>카드 규격</h4>
        {settings.card.format === "folded_card" ? (
          <FoldedCardFields card={settings.card} setState={setState} />
        ) : (
          <PostcardFields card={settings.card} setState={setState} />
        )}
      </section>

      <section className={styles.specGroup} aria-label="봉투 규격 입력">
        <h4>봉투 규격</h4>
        <div className={styles.inputGrid}>
          <ProductImageStudioNumberField
            label="봉투 가로(mm)"
            onChange={(width) => updateEnvelopeSize(setState, { width })}
            value={settings.envelope.sizeMm.width}
          />
          <ProductImageStudioNumberField
            label="봉투 세로(mm)"
            onChange={(height) => updateEnvelopeSize(setState, { height })}
            value={settings.envelope.sizeMm.height}
          />
          <label className={styles.selectField}>
            <span>플랩 방향</span>
            <select
              onChange={(event) => updateSettings(setState, (current) => ({
                ...current,
                envelope: { ...current.envelope, flapDirection: event.currentTarget.value === "side_flap" ? "side_flap" : "top_flap" },
              }))}
              value={settings.envelope.flapDirection}
            >
              <option value="top_flap">위 플랩</option>
              <option value="side_flap">옆 플랩</option>
            </select>
          </label>
        </div>
      </section>

      <section className={styles.specGroup} aria-label="봉합스티커 규격 입력">
        <h4>봉합스티커 규격</h4>
        <ProductImageStudioSealStickerFields sealSticker={settings.sealSticker} setState={setState} />
      </section>
    </div>
  );
}

function FoldedCardFields({
  card,
  setState,
}: {
  readonly card: Extract<ProductImageStudioCardSpec, { readonly format: "folded_card" }>;
  readonly setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>;
}) {
  return (
    <div className={styles.inputGrid}>
      <ProductImageStudioNumberField label="접은 카드 가로(mm)" onChange={(width) => updateFoldedCardSize(setState, "foldedSizeMm", { width })} value={card.foldedSizeMm.width} />
      <ProductImageStudioNumberField label="접은 카드 세로(mm)" onChange={(height) => updateFoldedCardSize(setState, "foldedSizeMm", { height })} value={card.foldedSizeMm.height} />
      <ProductImageStudioNumberField label="펼친 카드 가로(mm)" onChange={(width) => updateFoldedCardSize(setState, "openSizeMm", { width })} value={card.openSizeMm.width} />
      <ProductImageStudioNumberField label="펼친 카드 세로(mm)" onChange={(height) => updateFoldedCardSize(setState, "openSizeMm", { height })} value={card.openSizeMm.height} />
      <label className={styles.selectField}>
        <span>접는 방향</span>
        <select
          onChange={(event) => updateSettings(setState, (current) => ({
            ...current,
            card: current.card.format === "folded_card"
              ? { ...current.card, foldDirection: event.currentTarget.value === "top_fold" ? "top_fold" : "left_fold" }
              : current.card,
          }))}
          value={card.foldDirection}
        >
          <option value="left_fold">좌우로 펼침</option>
          <option value="top_fold">위아래로 펼침</option>
        </select>
      </label>
      <ProductImageStudioNumberField label="용지 두께(gsm)" onChange={(paperWeightGsm) => updateCard(setState, { paperWeightGsm })} value={card.paperWeightGsm} />
      <PaperFinishField card={card} setState={setState} />
    </div>
  );
}

function PostcardFields({
  card,
  setState,
}: {
  readonly card: Extract<ProductImageStudioCardSpec, { readonly format: "postcard_flat" }>;
  readonly setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>;
}) {
  return (
    <div className={styles.inputGrid}>
      <ProductImageStudioNumberField label="카드 가로(mm)" onChange={(width) => updatePostcardSize(setState, { width })} value={card.sizeMm.width} />
      <ProductImageStudioNumberField label="카드 세로(mm)" onChange={(height) => updatePostcardSize(setState, { height })} value={card.sizeMm.height} />
      <ProductImageStudioNumberField label="용지 두께(gsm)" onChange={(paperWeightGsm) => updateCard(setState, { paperWeightGsm })} value={card.paperWeightGsm} />
      <PaperFinishField card={card} setState={setState} />
    </div>
  );
}

function PaperFinishField({
  card,
  setState,
}: {
  readonly card: ProductImageStudioCardSpec;
  readonly setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>;
}) {
  return (
    <label className={styles.selectField}>
      <span>종이 표면</span>
      <select
        onChange={(event) => updateCard(setState, { paperFinish: readPaperFinish(event.currentTarget.value) })}
        value={card.paperFinish}
      >
        <option value="matte">무광</option>
        <option value="glossy">유광</option>
        <option value="textured">질감지</option>
      </select>
    </label>
  );
}

function updateSettings(
  setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>,
  updater: (settings: ProductImageStudioProductionSettings) => ProductImageStudioProductionSettings,
): void {
  setState((current) => ({ ...current, productionSettings: updater(current.productionSettings) }));
}

function updateCard(
  setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>,
  update: Pick<ProductImageStudioCardSpec, "paperFinish"> | Pick<ProductImageStudioCardSpec, "paperWeightGsm">,
): void {
  updateSettings(setState, (current) => ({ ...current, card: { ...current.card, ...update } }));
}

function updateFoldedCardSize(
  setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>,
  key: "foldedSizeMm" | "openSizeMm",
  update: Partial<ProductImageStudioSizeMm>,
): void {
  updateSettings(setState, (current) => current.card.format === "folded_card"
    ? { ...current, card: { ...current.card, [key]: { ...current.card[key], ...update } } }
    : current);
}

function updatePostcardSize(
  setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>,
  update: Partial<ProductImageStudioSizeMm>,
): void {
  updateSettings(setState, (current) => current.card.format === "postcard_flat"
    ? { ...current, card: { ...current.card, sizeMm: { ...current.card.sizeMm, ...update } } }
    : current);
}

function updateEnvelopeSize(
  setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>,
  update: Partial<ProductImageStudioSizeMm>,
): void {
  updateSettings(setState, (current) => ({
    ...current,
    envelope: { ...current.envelope, sizeMm: { ...current.envelope.sizeMm, ...update } },
  }));
}

function readPaperFinish(value: string): ProductImageStudioCardSpec["paperFinish"] {
  return value === "glossy" || value === "textured" ? value : "matte";
}
