import type { Dispatch, SetStateAction } from "react";
import type {
  ProductImageStudioProductionSettings,
  ProductImageStudioSealStickerSpec,
  ProductImageStudioSizeMm,
} from "@/features/product-image-studio/domain/productionSettings";
import type { ProductImageStudioWizardState } from "@/features/product-image-studio/domain/projectWizard";
import { ProductImageStudioNumberField } from "./ProductImageStudioSpecFieldControls";
import styles from "./ProductImageStudioProductionSettingsPanel.module.css";

type ProductImageStudioSealStickerFieldsProps = {
  readonly sealSticker: ProductImageStudioSealStickerSpec;
  readonly setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>;
};

export function ProductImageStudioSealStickerFields({
  sealSticker,
  setState,
}: ProductImageStudioSealStickerFieldsProps) {
  return (
    <div className={styles.inputGrid}>
      <label className={styles.selectField}>
        <span>스티커 형태</span>
        <select onChange={(event) => updateSealStickerShape(setState, event.currentTarget.value)} value={sealSticker.shape}>
          <option value="circle">원형</option>
          <option value="rectangle">사각형</option>
        </select>
      </label>
      {sealSticker.shape === "circle" ? (
        <ProductImageStudioNumberField
          label="스티커 지름(mm)"
          onChange={(diameter) => updateSealStickerDiameter(setState, diameter)}
          value={sealSticker.sizeMm.diameter}
        />
      ) : (
        <>
          <ProductImageStudioNumberField
            label="스티커 가로(mm)"
            onChange={(width) => updateSealStickerSize(setState, { width })}
            value={sealSticker.sizeMm.width}
          />
          <ProductImageStudioNumberField
            label="스티커 세로(mm)"
            onChange={(height) => updateSealStickerSize(setState, { height })}
            value={sealSticker.sizeMm.height}
          />
        </>
      )}
      <label className={styles.selectField}>
        <span>부착 위치</span>
        <select
          onChange={(event) => updateSealStickerPlacement(setState, event.currentTarget.value)}
          value={sealSticker.placement}
        >
          <option value="envelope_flap_center">봉투 플랩 중앙</option>
          <option value="envelope_corner">봉투 모서리</option>
          <option value="cylindrical_surface">원통 표면</option>
        </select>
      </label>
    </div>
  );
}

function updateSettings(
  setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>,
  updater: (settings: ProductImageStudioProductionSettings) => ProductImageStudioProductionSettings,
): void {
  setState((current) => ({ ...current, productionSettings: updater(current.productionSettings) }));
}

function updateSealStickerShape(setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>, shape: string): void {
  updateSettings(setState, (current) => ({
    ...current,
    sealSticker: shape === "rectangle"
      ? { placement: current.sealSticker.placement, shape: "rectangle", sizeMm: { height: 0, width: 0 } }
      : { placement: current.sealSticker.placement, shape: "circle", sizeMm: { diameter: 0 } },
  }));
}

function updateSealStickerDiameter(setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>, diameter: number): void {
  updateSettings(setState, (current) => current.sealSticker.shape === "circle"
    ? { ...current, sealSticker: { ...current.sealSticker, sizeMm: { diameter } } }
    : current);
}

function updateSealStickerSize(
  setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>,
  update: Partial<ProductImageStudioSizeMm>,
): void {
  updateSettings(setState, (current) => current.sealSticker.shape === "rectangle"
    ? { ...current, sealSticker: { ...current.sealSticker, sizeMm: { ...current.sealSticker.sizeMm, ...update } } }
    : current);
}

function updateSealStickerPlacement(
  setState: Dispatch<SetStateAction<ProductImageStudioWizardState>>,
  placement: string,
): void {
  updateSettings(setState, (current) => ({
    ...current,
    sealSticker: {
      ...current.sealSticker,
      placement: placement === "envelope_corner" || placement === "cylindrical_surface" ? placement : "envelope_flap_center",
    },
  }));
}
