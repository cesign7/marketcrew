"use client";

import { useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import {
  createMaterialPreviewImage,
  getMaterialImageDataUrlIssue,
  getMaterialImageFileIssue,
  PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_ACCEPT,
  PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_INVALID_READ_MESSAGE,
  type ProductImageStudioMaterialDraft,
} from "./productImageStudioMaterialPanelModel";
import styles from "./ProductImageStudioMaterialLibrary.module.css";

type ProductImageStudioMaterialImageFieldProps = {
  readonly draft: ProductImageStudioMaterialDraft;
  readonly setDraft: Dispatch<SetStateAction<ProductImageStudioMaterialDraft>>;
};

export function ProductImageStudioMaterialImageField({
  draft,
  setDraft,
}: ProductImageStudioMaterialImageFieldProps) {
  const [imageMessage, setImageMessage] = useState<{ readonly text: string; readonly tone: "error" | "success" } | null>(
    null,
  );

  return (
    <fieldset className={styles.materialFieldset}>
      <legend>재질 이미지(선택)</legend>
      <label className={styles.field}>
        <span>이미지 파일</span>
        <input accept={PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_ACCEPT} onChange={handleImageChange} type="file" />
      </label>
      <p className={styles.meta}>PNG, JPG, WebP만 사용할 수 있습니다. 1MB 이하 이미지를 선택해 주세요.</p>
      {draft.previewImage ? (
        <img className={styles.materialPreviewImage} alt={draft.previewImage.alt} src={draft.previewImage.url} />
      ) : null}
      {imageMessage ? (
        <p className={styles.message} data-tone={imageMessage.tone}>
          {imageMessage.text}
        </p>
      ) : null}
    </fieldset>
  );

  function handleImageChange(event: ChangeEvent<HTMLInputElement>): void {
    const input = event.currentTarget;
    const file = input.files?.item(0) ?? null;
    if (!file) {
      return;
    }
    const fileIssue = getMaterialImageFileIssue(file);
    if (fileIssue) {
      rejectSelectedImage(input, fileIssue);
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        rejectSelectedImage(input, PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_INVALID_READ_MESSAGE);
        return;
      }
      const dataUrlIssue = getMaterialImageDataUrlIssue(dataUrl);
      if (dataUrlIssue) {
        rejectSelectedImage(input, dataUrlIssue);
        return;
      }
      setDraft((current) => ({
        ...current,
        previewImage: createMaterialPreviewImage({
          dataUrl,
          fileName: file.name,
          materialName: current.name,
        }),
      }));
      input.setCustomValidity("");
      setImageMessage({ text: "재질 이미지 미리보기를 불러왔습니다.", tone: "success" });
    });
    reader.addEventListener("error", () => {
      rejectSelectedImage(input, PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_INVALID_READ_MESSAGE);
    });
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      if (error instanceof Error) {
        rejectSelectedImage(input, PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_INVALID_READ_MESSAGE);
        return;
      }
      throw error;
    }
  }

  function rejectSelectedImage(input: HTMLInputElement, message: string): void {
    input.value = "";
    setDraft((current) => ({ ...current, previewImage: undefined }));
    input.setCustomValidity(message);
    setImageMessage({ text: message, tone: "error" });
  }
}
