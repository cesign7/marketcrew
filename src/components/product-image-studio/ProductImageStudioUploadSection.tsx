import type { ChangeEvent } from "react";
import {
  canUploadProductImageStudioAssetRole,
  getProductImageStudioUploadBlockReason,
  getProductImageStudioUploadSlots,
  type ProductImageStudioUploadSlot,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import {
  assertNever,
  type CardFormat,
  type ProductImageStudioAssetRole,
} from "@/features/product-image-studio/domain/types";
import styles from "./ProductImageStudioUploadSection.module.css";

type ProductImageStudioUploadSectionProps = {
  readonly busyRole: ProductImageStudioAssetRole | null;
  readonly onUpload: (role: ProductImageStudioAssetRole, event: ChangeEvent<HTMLInputElement>) => void;
  readonly state: ProductImageStudioWizardState;
};

export function ProductImageStudioUploadSection({ busyRole, onUpload, state }: ProductImageStudioUploadSectionProps) {
  const groups = buildUploadGroups(state.cardFormat, getProductImageStudioUploadSlots(state));

  return (
    <section className={styles.panel} aria-labelledby="upload-heading">
      <div className={styles.sectionTitle}>
        <h3 id="upload-heading">디자인 업로드</h3>
        <p>먼저 카드 디자인을 올리고, 세트컷이 필요할 때 봉투와 스티커를 추가합니다.</p>
      </div>

      <div className={styles.groupStack}>
        {groups.map((group) => (
          <section className={styles.uploadGroup} key={group.title}>
            <div className={styles.groupHeader}>
              <h4>{group.title}</h4>
              <p>{group.description}</p>
            </div>
            <div className={styles.uploadGrid}>
              {group.slots.map((slot) => {
                const blockReason = getProductImageStudioUploadBlockReason(state, slot.role);
                const isDisabled = busyRole !== null || !canUploadProductImageStudioAssetRole(state, slot.role);
                const isUploaded = state.uploadedRoles.some((role) => role === slot.role);
                return (
                  <label className={styles.uploadSlot} key={slot.role}>
                    <span>
                      {slot.label}
                      {slot.required ? <em>기본</em> : <small>선택</small>}
                    </span>
                    <input
                      accept="image/png,image/jpeg,image/webp"
                      aria-label={`${slot.label} 업로드`}
                      className={styles.fileInput}
                      disabled={isDisabled}
                      onChange={(event) => onUpload(slot.role, event)}
                      type="file"
                    />
                    <strong>{isUploaded ? "업로드 완료" : blockReason ? "입력 필요" : "이미지 선택"}</strong>
                    <p>{blockReason ?? slot.helper}</p>
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

type UploadGroup = {
  readonly description: string;
  readonly slots: readonly ProductImageStudioUploadSlot[];
  readonly title: string;
};

function buildUploadGroups(
  cardFormat: CardFormat,
  slots: readonly ProductImageStudioUploadSlot[],
): readonly UploadGroup[] {
  const cardSlots = slots.filter((slot) => isCardAssetRole(slot.role));
  const accessorySlots = slots.filter((slot) => !isCardAssetRole(slot.role));
  return [
    { ...getCardUploadGroupCopy(cardFormat), slots: cardSlots },
    {
      description: "세트컷이나 상세 컷에 필요할 때만 추가하세요.",
      slots: accessorySlots,
      title: "봉투와 봉합스티커",
    },
  ];
}

function getCardUploadGroupCopy(cardFormat: CardFormat): Omit<UploadGroup, "slots"> {
  switch (cardFormat) {
    case "folded_card":
      return {
        description: "접힌 앞면을 먼저 올리고, 안쪽 펼침면과 뒷면은 필요할 때 추가합니다.",
        title: "접이식 카드 디자인",
      };
    case "postcard_flat":
      return {
        description: "앞면을 먼저 올리고, 뒷면 인쇄가 있으면 추가합니다.",
        title: "엽서형 카드 디자인",
      };
  }
}

function isCardAssetRole(role: ProductImageStudioAssetRole): boolean {
  switch (role) {
    case "folded_card_outer_front":
    case "folded_card_inner_spread":
    case "folded_card_back":
    case "folded_card_fold_metadata":
    case "postcard_front":
    case "postcard_back":
      return true;
    case "envelope_front":
    case "envelope_inside_flap":
    case "seal_sticker":
    case "reference_mood":
      return false;
    default:
      return assertNever(role);
  }
}
