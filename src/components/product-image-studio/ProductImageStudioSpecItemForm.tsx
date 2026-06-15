"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ProductImageStudioSizeMm } from "@/features/product-image-studio/domain/productionSettings";
import {
  getProductImageStudioSpecItemTypeLabel,
  type ProductImageStudioEnvelopeFlapStyle,
  type ProductImageStudioSpecItemDraft,
} from "@/features/product-image-studio/domain/specLibrary";
import { assertNever } from "@/features/product-image-studio/domain/types";
import { NumberField, SidesField, SizeFields } from "./ProductImageStudioSpecItemFormControls";
import styles from "./ProductImageStudioSpecLibrary.module.css";

type ProductImageStudioSpecItemFormProps = {
  readonly draft: ProductImageStudioSpecItemDraft;
  readonly setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>;
};

export function ProductImageStudioSpecItemForm({
  draft,
  setDraft,
}: ProductImageStudioSpecItemFormProps) {
  return (
    <div className={styles.formStack}>
      <label className={styles.field}>
        <span>규격 이름</span>
        <input
          onChange={(event) => updateName(setDraft, event.currentTarget.value)}
          placeholder={`${getProductImageStudioSpecItemTypeLabel(draft.type)} 이름`}
          type="text"
          value={draft.name}
        />
      </label>
      {renderTypedFields(draft, setDraft)}
    </div>
  );
}

function renderTypedFields(
  draft: ProductImageStudioSpecItemDraft,
  setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>,
) {
  switch (draft.type) {
    case "postcard":
      return (
        <>
          <SizeFields labels={["엽서 가로(mm)", "엽서 세로(mm)"]} onChange={(update) => updateSize(setDraft, update)} size={draft.sizeMm} />
          <SidesField setDraft={setDraft} value={draft.sides} />
        </>
      );
    case "folded_card":
      return (
        <>
          <SizeFields
            labels={["접은 카드 가로(mm)", "접은 카드 세로(mm)"]}
            onChange={(update) => updateFoldedSize(setDraft, "foldedSizeMm", update)}
            size={draft.foldedSizeMm}
          />
          <SizeFields
            labels={["펼친 카드 가로(mm)", "펼친 카드 세로(mm)"]}
            onChange={(update) => updateFoldedSize(setDraft, "openSizeMm", update)}
            size={draft.openSizeMm}
          />
          <label className={styles.field}>
            <span>접는 방향</span>
            <select
              onChange={(event) => updateFoldDirection(setDraft, event.currentTarget.value)}
              value={draft.foldDirection}
            >
              <option value="left_fold">좌우로 펼침</option>
              <option value="top_fold">위아래로 펼침</option>
            </select>
          </label>
        </>
      );
    case "envelope":
      return (
        <>
          <SizeFields labels={["봉투 가로(mm)", "봉투 세로(mm)"]} onChange={(update) => updateSize(setDraft, update)} size={draft.sizeMm} />
          <label className={styles.field}>
            <span>뚜껑 형태</span>
            <select onChange={(event) => updateFlapStyle(setDraft, event.currentTarget.value)} value={draft.flapStyle}>
              <option value="square">사각 플랩</option>
              <option value="jacket">자켓형 플랩</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>플랩 방향</span>
            <select
              onChange={(event) => updateFlapDirection(setDraft, event.currentTarget.value)}
              value={draft.flapDirection}
            >
              <option value="top_flap">위 플랩</option>
              <option value="side_flap">옆 플랩</option>
            </select>
          </label>
        </>
      );
    case "sticker":
      return (
        <>
          <label className={styles.field}>
            <span>스티커 형태</span>
            <select onChange={(event) => updateStickerShape(setDraft, event.currentTarget.value)} value={draft.shape}>
              <option value="circle">원형</option>
              <option value="rectangle">사각형</option>
            </select>
          </label>
          {"diameter" in draft.sizeMm ? (
            <NumberField label="스티커 지름(mm)" onChange={(diameter) => updateStickerDiameter(setDraft, diameter)} value={draft.sizeMm.diameter} />
          ) : (
            <SizeFields labels={["스티커 가로(mm)", "스티커 세로(mm)"]} onChange={(update) => updateStickerSize(setDraft, update)} size={draft.sizeMm} />
          )}
          <label className={styles.field}>
            <span>부착 위치</span>
            <select onChange={(event) => updateStickerPlacement(setDraft, event.currentTarget.value)} value={draft.placement}>
              <option value="envelope_flap_center">봉투 플랩 중앙</option>
              <option value="envelope_corner">봉투 모서리</option>
              <option value="cylindrical_surface">원통 표면</option>
            </select>
          </label>
        </>
      );
    case "business_card":
      return (
        <>
          <SizeFields labels={["명함 가로(mm)", "명함 세로(mm)"]} onChange={(update) => updateSize(setDraft, update)} size={draft.sizeMm} />
          <SidesField setDraft={setDraft} value={draft.sides} />
        </>
      );
    default:
      return assertNever(draft);
  }
}

function updateName(setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>, name: string): void {
  setDraft((current) => ({ ...current, name }));
}

function updateSize(
  setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>,
  update: Partial<ProductImageStudioSizeMm>,
): void {
  setDraft((current) => current.type === "postcard" || current.type === "business_card" || current.type === "envelope"
    ? { ...current, sizeMm: { ...current.sizeMm, ...update } }
    : current);
}

function updateFoldedSize(
  setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>,
  key: "foldedSizeMm" | "openSizeMm",
  update: Partial<ProductImageStudioSizeMm>,
): void {
  setDraft((current) => current.type === "folded_card" ? { ...current, [key]: { ...current[key], ...update } } : current);
}

function updateStickerSize(
  setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>,
  update: Partial<ProductImageStudioSizeMm>,
): void {
  setDraft((current) => current.type === "sticker" && "width" in current.sizeMm
    ? { ...current, sizeMm: { ...current.sizeMm, ...update } }
    : current);
}

function updateStickerDiameter(setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>, diameter: number): void {
  setDraft((current) => current.type === "sticker" && "diameter" in current.sizeMm
    ? { ...current, sizeMm: { diameter } }
    : current);
}

function updateFoldDirection(setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>, value: string): void {
  setDraft((current) => current.type === "folded_card"
    ? { ...current, foldDirection: value === "top_fold" ? "top_fold" : "left_fold" }
    : current);
}

function updateFlapStyle(setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>, value: string): void {
  const flapStyle: ProductImageStudioEnvelopeFlapStyle = value === "jacket" ? "jacket" : "square";
  setDraft((current) => current.type === "envelope" ? { ...current, flapStyle } : current);
}

function updateFlapDirection(setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>, value: string): void {
  setDraft((current) => current.type === "envelope"
    ? { ...current, flapDirection: value === "side_flap" ? "side_flap" : "top_flap" }
    : current);
}

function updateStickerShape(setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>, value: string): void {
  setDraft((current) => {
    if (current.type !== "sticker") {
      return current;
    }
    return value === "rectangle"
      ? { ...current, shape: "rectangle", sizeMm: { height: 0, width: 0 } }
      : { ...current, shape: "circle", sizeMm: { diameter: 0 } };
  });
}

function updateStickerPlacement(setDraft: Dispatch<SetStateAction<ProductImageStudioSpecItemDraft>>, value: string): void {
  setDraft((current) => current.type === "sticker"
    ? { ...current, placement: value === "envelope_corner" || value === "cylindrical_surface" ? value : "envelope_flap_center" }
    : current);
}
